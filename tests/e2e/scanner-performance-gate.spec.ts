import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { createWorker, OEM, PSM } from "tesseract.js";
import {
  iniciarOcrWorker,
  type OcrWorkerLike,
} from "../../apps/app/lib/executar/scanner-engine/ocr-worker";
import { construirRecognitionResult } from "../../apps/app/lib/executar/scanner-engine/recognition-resolver";
import { criarScannerEngine } from "../../apps/app/lib/executar/scanner-engine/scanner-engine";
import { CARACTERES_OCR_SCANNER } from "../../apps/app/lib/executar/scanner-ocr";

/**
 * Gate de performance — PR-10 do plano "Scanner OCR-first V2" (handoff
 * §"Performance Gate CI"). O handoff estabelece o critério de aceite
 * "warm p50<1200ms/p95<2200ms/p99<3000ms" — este arquivo transforma isso
 * de medição manual (PR-08, `medir-corpus-ocr.mjs`) em GATE automatizado,
 * que falha o CI quando a latência regride.
 *
 * ## O que "latência de tentativa" significa aqui
 *
 * `RecognitionResult.recognitionLatencyMs` (definido na PR-01) mede só o
 * tempo de `worker.recognize()` em si — T_ocr do orçamento, ~30-50ms
 * medido no corpus L1 (ver `tests/fixtures/scanner/README.md`). Isso é
 * muito menor que 1200ms porque não é o número que o critério de aceite
 * descreve: o orçamento "ponta-a-ponta" inclui a CADÊNCIA de amostragem
 * (`INTERVALO_RECONHECIMENTO_MS`, use-scanner-engine.ts) — o tempo entre
 * o worker ficar disponível e o próximo frame chegar pra reconhecer.
 *
 * Este gate modela a latência de UMA tentativa de reconhecimento "warm"
 * (worker já aquecido, cenário comum de confiança alta — confirmação
 * imediata, sem precisar de uma segunda leitura consecutiva) como:
 *
 *   latência_de_tentativa = INTERVALO_RECONHECIMENTO_MS + T_ocr_medido
 *
 * Isso é uma aproximação honesta, não uma medição de câmera real ponta-a-
 * ponta (que exigiria cronometrar o instante em que o token físico fica
 * visível, algo que não é modelado como timestamp discreto nesta
 * arquitetura). NÃO modela o caminho raro de "2 leituras consecutivas"
 * do consenso (confiança moderada) — esse caso dobra o custo
 * (2×intervalo + 2×T_ocr ≈ 1340ms pro corpus medido), ainda dentro do
 * p95/p99 mas fora do escopo deste gate especificamente calibrado pro
 * caminho comum. A prova de que o caminho de câmera real funciona ponta-
 * a-ponta é a PR-09 (`scanner-fake-camera.spec.ts`); este gate mede
 * REGRESSÃO DE LATÊNCIA no caminho de OCR usando os 30 fixtures do L1
 * (variedade de distância/perspectiva/contraste/blur), não apenas um caso
 * limpo isolado.
 */

const RAIZ_REPO = fileURLToPath(new URL("../../", import.meta.url));
const DIR_FIXTURES = join(RAIZ_REPO, "tests/fixtures/scanner");
const LANG_PATH = join(RAIZ_REPO, "node_modules/@tesseract.js-data/eng/4.0.0");

// Idêntico a INTERVALO_RECONHECIMENTO_MS em use-scanner-engine.ts (PR-07)
// — duplicado aqui porque aquele módulo é "use client" (importa React),
// sem necessidade de puxar isso pra um teste que roda em Node puro.
const INTERVALO_RECONHECIMENTO_MS = 620;

// Critério de aceite do handoff — cenário "warm" (worker já aquecido).
const LIMITE_P50_MS = 1200;
const LIMITE_P95_MS = 2200;
const LIMITE_P99_MS = 3000;

// Cold start NÃO faz parte do orçamento "warm" — medido e travado
// separadamente (segundo teste abaixo), com uma folga generosa: o alvo
// aqui é pegar uma regressão grosseira (ex.: alguém reintroduzir a busca
// em rede que `criarWorkerTesseractPadrao` evita hoje via CDN, ou uma
// mudança de config que infle o carregamento do WASM/dados de idioma),
// não uma calibração fina — não há medição de dispositivo real disponível
// neste repositório para apertar mais.
const LIMITE_COLD_START_MS = 15_000;

async function criarWorkerTesseractDeTeste(): Promise<OcrWorkerLike> {
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    cacheMethod: "none",
    langPath: LANG_PATH,
  });
  await worker.setParameters({
    preserve_interword_spaces: "0",
    tessedit_char_whitelist: CARACTERES_OCR_SCANNER,
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    user_defined_dpi: "300",
  });
  return worker;
}

function percentil(valoresOrdenados: readonly number[], p: number): number {
  if (!valoresOrdenados.length) {
    return 0;
  }

  const indice = Math.min(
    valoresOrdenados.length - 1,
    Math.ceil((p / 100) * valoresOrdenados.length) - 1
  );
  return valoresOrdenados[Math.max(0, indice)];
}

interface FixtureManifestItem {
  readonly actionId: string;
  readonly path: string;
  readonly variation: string;
}

test.setTimeout(60_000);

test("latência de reconhecimento 'warm' fica dentro do orçamento p50/p95/p99", async () => {
  const manifest: FixtureManifestItem[] = JSON.parse(
    await readFile(join(DIR_FIXTURES, "manifest.json"), "utf8")
  );

  const worker = await criarWorkerTesseractDeTeste();
  const latenciasDeTentativaMs: number[] = [];

  try {
    for (const item of manifest) {
      const caminho = join(DIR_FIXTURES, item.path);
      const recognitionStartedAt = performance.now();
      const { data } = await worker.recognize(caminho);
      const recognitionEndedAt = performance.now();
      const tOcrMs = recognitionEndedAt - recognitionStartedAt;

      const resultado = construirRecognitionResult(
        {
          confidence: data.confidence,
          recognitionEndedAt,
          recognitionLatencyMs: Math.round(tOcrMs),
          recognitionStartedAt,
          text: data.text,
        },
        Date.now()
      );

      expect(
        resultado?.actionId,
        `fixture ${item.path} deveria resolver para "${item.actionId}"`
      ).toBe(item.actionId);

      latenciasDeTentativaMs.push(INTERVALO_RECONHECIMENTO_MS + tOcrMs);
    }
  } finally {
    await worker.terminate();
  }

  const ordenadas = [...latenciasDeTentativaMs].sort((a, b) => a - b);
  const p50 = percentil(ordenadas, 50);
  const p95 = percentil(ordenadas, 95);
  const p99 = percentil(ordenadas, 99);

  console.log(
    `Latência de tentativa (warm, ${manifest.length} fixtures): ` +
      `p50=${p50.toFixed(0)}ms p95=${p95.toFixed(0)}ms p99=${p99.toFixed(0)}ms ` +
      `(limites: ${LIMITE_P50_MS}/${LIMITE_P95_MS}/${LIMITE_P99_MS}ms)`
  );

  expect(p50).toBeLessThan(LIMITE_P50_MS);
  expect(p95).toBeLessThan(LIMITE_P95_MS);
  expect(p99).toBeLessThan(LIMITE_P99_MS);
});

test("cold start do worker OCR fica dentro da folga de regressão (fora do orçamento warm)", async () => {
  const engine = criarScannerEngine();
  engine.start();

  const inicio = performance.now();
  const worker = await iniciarOcrWorker(engine, criarWorkerTesseractDeTeste);
  const coldStartMs = performance.now() - inicio;

  try {
    expect(worker).not.toBeNull();
    expect(engine.getSnapshot().state).toBe("ready");

    console.log(
      `Cold start do worker OCR: ${coldStartMs.toFixed(0)}ms (limite: ${LIMITE_COLD_START_MS}ms)`
    );
    expect(coldStartMs).toBeLessThan(LIMITE_COLD_START_MS);
  } finally {
    await worker?.terminate();
  }
});
