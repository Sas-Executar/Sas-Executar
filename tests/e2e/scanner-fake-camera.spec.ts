import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { chromium, expect, type Page, test } from "@playwright/test";
import type { RecognitionResult } from "@repo/executar-contracts/scanner";
import { createWorker, OEM, PSM } from "tesseract.js";
import type {
  Entrega,
  EstadoOperacional,
} from "../../apps/app/lib/executar/domain";
import { entregasAtivas, novoEstado } from "../../apps/app/lib/executar/domain";
import {
  type ComandoDespachado,
  criarObservadorLockClear,
  despacharComando,
} from "../../apps/app/lib/executar/scanner-engine/command-dispatcher";
import {
  avaliarQualidadeFrame,
  possuiForegroundMinimo,
} from "../../apps/app/lib/executar/scanner-engine/frame-quality";
import {
  confiancaSuficiente,
  iniciarOcrWorker,
  type OcrWorkerLike,
} from "../../apps/app/lib/executar/scanner-engine/ocr-worker";
import {
  criarConsensusEngine,
  processarReconhecimento,
} from "../../apps/app/lib/executar/scanner-engine/recognition-consensus";
import { construirRecognitionResult } from "../../apps/app/lib/executar/scanner-engine/recognition-resolver";
import {
  calcularRetanguloRoi,
  FRACAO_ROI_PADRAO,
  LADO_CANVAS_OCR,
} from "../../apps/app/lib/executar/scanner-engine/roi-preprocessor";
import { criarScannerEngine } from "../../apps/app/lib/executar/scanner-engine/scanner-engine";
import {
  estaTravado,
  podeReconhecer,
} from "../../apps/app/lib/executar/scanner-engine/scanner-state-machine";
import { CARACTERES_OCR_SCANNER } from "../../apps/app/lib/executar/scanner-ocr";

/**
 * E2E de câmera falsa — PR-09 do plano "Scanner OCR-first V2" (handoff
 * §"Playwright Fake Camera", nível L2). Supera o benchmark estático de
 * `scanner-ocr.spec.ts` (imagens paradas, sem câmera nenhuma): aqui um
 * `getUserMedia()` de verdade lê um vídeo `.y4m` sintético via
 * `--use-fake-device-for-media-stream`/`--use-file-for-fake-video-capture`
 * do Chromium — a câmera "vê" uma sessão contínua ciclando pelos 5 tokens
 * administrativos (gerada por `gerar-fixture-camera-y4m.mjs`).
 *
 * Este teste NÃO sobe o app Next.js real: `/scanner` fica atrás de
 * `(authenticated)/layout.tsx`, que exige uma sessão Clerk real
 * (`currentUser()`/`auth()`) — não há chave de teste Clerk configurada
 * neste repositório, e simular isso exigiria mudar a arquitetura de auth
 * só para viabilizar um teste, o que está fora do escopo desta PR. Em vez
 * disso, este teste importa e roda DIRETO as mesmas funções reais do
 * `scanner-engine` que `useScannerEngine` (PR-07) orquestra em React —
 * mesma técnica de escopo já usada em `scanner-ocr.spec.ts` (contornar o
 * app inteiro, testar a peça real isoladamente). A única parte
 * REIMPLEMENTADA (não importada) é o recorte da ROI dentro do navegador
 * (`page.evaluate` não executa módulos TS reais sem um bundler) — a
 * geometria do recorte em si (`calcularRetanguloRoi`) é real, e a
 * corretude do recorte já está coberta pelos testes unitários de
 * `roi-preprocessor.ts` (PR-04). Tudo mais — gate de qualidade, worker
 * OCR, resolver, consenso, ACTION LOCK, observador de lock-clear,
 * command dispatcher e mutação de domínio — é código real, importado
 * direto, dirigido por pixels reais capturados da câmera falsa real.
 */

const Y4M_PATH = fileURLToPath(
  new URL("../fixtures/scanner-camera/sessao-cinco-acoes.y4m", import.meta.url)
);
const LANG_PATH = fileURLToPath(
  new URL("../../node_modules/@tesseract.js-data/eng/4.0.0", import.meta.url)
);

/**
 * Mesma configuração de produção de `criarWorkerTesseractPadrao`
 * (ocr-worker.ts) — só troca a ORIGEM dos dados de idioma pelo cache
 * local do pacote (`langPath`), evitando a busca em rede que a fábrica
 * padrão faz (a mesma técnica já usada em `scanner-ocr.spec.ts` e
 * `medir-corpus-ocr.mjs`). Injetada em `iniciarOcrWorker` — que já é
 * desenhado pra aceitar uma fábrica customizada, exatamente pra este
 * tipo de teste (ver o comentário de `ocr-worker.ts`, PR-03).
 */
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

const HTML_HARNESS =
  "<!doctype html><html><body><video autoplay playsinline muted></video></body></html>";

const INTERVALO_AMOSTRAGEM_MS = 620; // idêntico ao intervalo de produção (use-scanner-engine.ts).
const LIMITE_TOTAL_MS = 60_000; // rede de segurança — não deve ser atingido no caminho feliz.
const SEQUENCIA_ESPERADA: readonly ComandoDespachado["kind"][] = [
  "entrada",
  "copiloto",
  "seletor",
  "feito",
  "saida",
];

/**
 * Recorta a ROI do quadro atual do `<video>` (mesma geometria e mesmo
 * filtro grayscale+contraste de `desenharRoiEmContexto`, roi-
 * preprocessor.ts — reimplementado aqui por rodar dentro do navegador,
 * ver comentário do arquivo) e devolve tanto os pixels crus (pro gate de
 * qualidade) quanto um PNG (pro worker OCR).
 */
async function capturarFrameDaRoi(
  page: Page,
  roi: { readonly lado: number; readonly sx: number; readonly sy: number }
): Promise<{ readonly pixels: Uint8ClampedArray; readonly png: Buffer }> {
  const { pixelsBase64, pngBase64 } = await page.evaluate(
    ({ lado, ladoDestino, sx, sy }) => {
      const janela = window as unknown as {
        __roiCanvas?: HTMLCanvasElement;
        __roiCtx?: CanvasRenderingContext2D;
      };

      if (!janela.__roiCanvas) {
        janela.__roiCanvas = document.createElement("canvas");
        janela.__roiCanvas.width = ladoDestino;
        janela.__roiCanvas.height = ladoDestino;
        janela.__roiCtx = janela.__roiCanvas.getContext("2d", {
          willReadFrequently: true,
        }) as CanvasRenderingContext2D;
      }

      const video = document.querySelector("video") as HTMLVideoElement;
      const contexto = janela.__roiCtx as CanvasRenderingContext2D;
      contexto.filter = "grayscale(1) contrast(1.65)";
      contexto.drawImage(
        video,
        sx,
        sy,
        lado,
        lado,
        0,
        0,
        ladoDestino,
        ladoDestino
      );

      const { data } = contexto.getImageData(0, 0, ladoDestino, ladoDestino);
      let binario = "";
      const tamanhoBloco = 32_768;
      for (let i = 0; i < data.length; i += tamanhoBloco) {
        binario += String.fromCharCode(...data.subarray(i, i + tamanhoBloco));
      }

      return {
        pixelsBase64: btoa(binario),
        pngBase64: janela.__roiCanvas.toDataURL("image/png").split(",")[1],
      };
    },
    { lado: roi.lado, ladoDestino: LADO_CANVAS_OCR, sx: roi.sx, sy: roi.sy }
  );

  return {
    pixels: new Uint8ClampedArray(Buffer.from(pixelsBase64, "base64")),
    png: Buffer.from(pngBase64, "base64"),
  };
}

test.setTimeout(90_000);

test("getUserMedia (câmera falsa) → scanner-engine → command-dispatcher → domínio, ponta a ponta", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html" });
    response.end(HTML_HARNESS);
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  const browser = await chromium.launch({
    args: [
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-video-capture=${Y4M_PATH}`,
      "--use-fake-ui-for-media-stream",
    ],
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });

  try {
    const context = await browser.newContext({ permissions: ["camera"] });
    const page = await context.newPage();

    // Domínio: uma única entrega pronta — "entrada" assume foco nela,
    // "feito" (mais tarde na mesma sessão) conclui essa MESMA entrega.
    const tasks: Entrega[] = [
      {
        date: "04/09",
        deps: [],
        front: "principal",
        id: "t1",
        mins: 30,
        stage: 1,
        title: "Tarefa de demonstração (câmera falsa)",
      },
    ];
    let state: EstadoOperacional = novoEstado("org-camera-e2e", tasks);

    const engine = criarScannerEngine();
    const consensus = criarConsensusEngine();
    const lockObserver = criarObservadorLockClear(engine);
    engine.start();

    // Worker aquecido ANTES da câmera "importar" (handoff §4) — roda em
    // paralelo à navegação/getUserMedia, não depois.
    const [worker] = await Promise.all([
      iniciarOcrWorker(engine, criarWorkerTesseractDeTeste),
      (async () => {
        await page.goto(`http://127.0.0.1:${port}/`);
        await page.evaluate(async () => {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          const video = document.querySelector("video") as HTMLVideoElement;
          video.srcObject = stream;
          await new Promise<void>((resolve) => {
            video.onloadedmetadata = () => resolve();
          });
        });
      })(),
    ]);
    expect(worker).not.toBeNull();

    const { videoHeight, videoWidth } = await page.evaluate(() => {
      const video = document.querySelector("video") as HTMLVideoElement;
      return { videoHeight: video.videoHeight, videoWidth: video.videoWidth };
    });
    const roi = calcularRetanguloRoi(
      videoWidth,
      videoHeight,
      FRACAO_ROI_PADRAO
    );

    const comandosDespachados: ComandoDespachado[] = [];
    let ultimaRecognitionDespachada: RecognitionResult | null = null;
    let frameAnterior: Uint8ClampedArray | null = null;
    const inicio = Date.now();

    while (
      comandosDespachados.length < SEQUENCIA_ESPERADA.length &&
      Date.now() - inicio < LIMITE_TOTAL_MS
    ) {
      const { pixels, png } = await capturarFrameDaRoi(page, roi);
      const snapshotAtual = engine.getSnapshot();

      if (estaTravado(snapshotAtual.state)) {
        lockObserver.notificarPresenca(possuiForegroundMinimo(pixels));
      } else {
        const avaliacao = avaliarQualidadeFrame(pixels, frameAnterior);
        frameAnterior = pixels;

        if (avaliacao.ok && podeReconhecer(snapshotAtual.state) && worker) {
          engine.notifyRecognitionStarted();
          const capturedAt = Date.now();

          try {
            const outcome = await worker.recognize(png);

            if (confiancaSuficiente(outcome.confidence)) {
              const resultado = construirRecognitionResult(outcome, capturedAt);

              if (resultado) {
                processarReconhecimento(engine, consensus, resultado);
              } else {
                engine.notifyRecognitionInconclusive();
              }
            } else {
              engine.notifyRecognitionInconclusive();
            }
          } catch {
            engine.notifyWorkerUnavailable();
          }
        }
      }

      const recognition = engine.getSnapshot().lastRecognition;

      if (recognition && recognition !== ultimaRecognitionDespachada) {
        ultimaRecognitionDespachada = recognition;
        const comando = despacharComando(
          recognition,
          entregasAtivas(state),
          state
        );
        comandosDespachados.push(comando);

        if (comando.kind === "entrada" || comando.kind === "feito") {
          state = comando.stateResultante;
        }
      }

      await page.waitForTimeout(INTERVALO_AMOSTRAGEM_MS);
    }

    await worker?.terminate();
    await context.close();

    // 5/5 comandos administrativos, na ordem em que a sessão os apresentou
    // — a prova ponta-a-ponta que o handoff pede: câmera real (falsa) →
    // OCR → vocabulário fechado → consenso → ACTION LOCK → dispatcher →
    // domínio, sem QR em lugar nenhum do caminho.
    expect(comandosDespachados.map((comando) => comando.kind)).toEqual(
      SEQUENCIA_ESPERADA
    );
    // "entrada" (câmera) assumiu foco em t1; "feito" (câmera, mais tarde na
    // mesma sessão) concluiu essa mesma entrega — concluirPorGestoHumano
    // limpa o foco depois de concluir (sem próxima entrega pronta na fila).
    expect(state.done).toContain("t1");
    expect(state.focus).toBeNull();
  } finally {
    await browser.close();
    server.close();
  }
});
