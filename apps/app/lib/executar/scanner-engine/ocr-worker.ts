import { CARACTERES_OCR_SCANNER } from "../scanner-ocr";
import type { ScannerEngine } from "./scanner-engine";

/**
 * Serviço de worker OCR persistente — PR-03 do plano "Scanner OCR-first
 * V2". Extrai a criação/configuração do worker Tesseract que hoje vive
 * dentro de `use-tesseract-symbol-scanner.ts` para um módulo independente
 * de React, com o worker aquecido ANTES da câmera (handoff §4):
 *
 *   Scanner aberto → Tesseract warming → Worker READY → Câmera ativa →
 *   recognize()
 *
 * A documentação do Tesseract.js recomenda preparar o worker com
 * antecedência e reaproveitá-lo entre reconhecimentos — criar/destruir um
 * worker por reconhecimento desperdiça a maior parte do custo de setup.
 * Este módulo garante isso por construção: o worker é criado uma única
 * vez em `prepararOcrWorker()` e só é destruído em `terminate()`.
 *
 * PSM.SPARSE_TEXT é mantido — medido na PR-08 contra o corpus de fixtures
 * (`tests/fixtures/scanner/`, ver README lá) nos 4 modos que o handoff
 * pede pra comparar: SPARSE_TEXT e SINGLE_LINE resolveram 100% do corpus
 * sem nenhuma ação falsa (empatados em latência, diferença dentro do
 * ruído de medição); SINGLE_WORD e RAW_LINE falharam quase totalmente
 * (esperam um recorte exato ao redor de uma única palavra, sem a margem/
 * ícone que o ROI real do cartão impresso inclui). Mantido SPARSE_TEXT
 * entre os dois empatados por ser estruturalmente mais tolerante a mais
 * de um elemento visual no recorte — não foi trocado às cegas.
 */

const CONFIANCA_MINIMA = 58;

/**
 * Recorte mínimo do `Worker` real do `tesseract.js` que este módulo
 * precisa — permite injetar um worker falso nos testes sem carregar o
 * WASM real. O worker verdadeiro satisfaz esta interface estruturalmente.
 */
export interface OcrWorkerLike {
  recognize(image: unknown): Promise<{
    readonly data: { readonly confidence: number; readonly text: string };
  }>;
  setParameters(params: Record<string, unknown>): Promise<unknown>;
  terminate(): Promise<unknown>;
}

export interface OcrRecognitionOutcome {
  readonly confidence: number;
  readonly recognitionEndedAt: number;
  readonly recognitionLatencyMs: number;
  readonly recognitionStartedAt: number;
  readonly text: string;
}

export interface OcrWorkerHandle {
  /** Reconhece uma imagem já preparada (crop/grayscale/threshold — ver `roi-preprocessor.ts`, PR-04) e instrumenta a latência do próprio `recognize()` (T_ocr do orçamento de performance). */
  recognize(image: unknown): Promise<OcrRecognitionOutcome>;
  terminate(): Promise<void>;
}

async function criarWorkerTesseractPadrao(): Promise<OcrWorkerLike> {
  const { createWorker, OEM, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng", OEM.LSTM_ONLY);
  await worker.setParameters({
    preserve_interword_spaces: "0",
    tessedit_char_whitelist: CARACTERES_OCR_SCANNER,
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    user_defined_dpi: "300",
  });
  return worker;
}

/**
 * Prepara (aquece) o worker OCR persistente. Deve ser chamado assim que o
 * Scanner abre — antes da câmera estar ativa — para que o custo de
 * carregar o WASM/language data já esteja pago quando o usuário
 * apresentar o primeiro token físico.
 *
 * `criarWorkerTesseract` é injetável só para testes (worker falso, sem
 * WASM real); em produção usa sempre `criarWorkerTesseractPadrao`.
 */
export async function prepararOcrWorker(
  criarWorkerTesseract: () => Promise<OcrWorkerLike> = criarWorkerTesseractPadrao
): Promise<OcrWorkerHandle> {
  const worker = await criarWorkerTesseract();

  return {
    async recognize(image) {
      const recognitionStartedAt = performance.now();
      const resultado = await worker.recognize(image);
      const recognitionEndedAt = performance.now();

      return {
        confidence: resultado.data.confidence,
        recognitionEndedAt,
        recognitionLatencyMs: Math.round(
          recognitionEndedAt - recognitionStartedAt
        ),
        recognitionStartedAt,
        text: resultado.data.text,
      };
    },
    terminate() {
      return worker.terminate().then(() => undefined);
    },
  };
}

/** Confiança mínima abaixo da qual um reconhecimento é descartado como ruído — mesmo limiar já usado em produção (`use-tesseract-symbol-scanner.ts`). */
export function confiancaSuficiente(confidence: number): boolean {
  return confidence >= CONFIANCA_MINIMA;
}

/**
 * Aquece o worker OCR e avisa o `ScannerEngine` do resultado — o ponto de
 * integração entre este módulo e a máquina de estado da PR-02. Chamar
 * assim que o Scanner é montado, antes de iniciar a câmera (handoff §4).
 * Retorna `null` quando o worker falha ao preparar; o chamador não deve
 * tentar reconhecer nesse caso (o engine já estará em `unavailable`).
 */
export async function iniciarOcrWorker(
  engine: Pick<ScannerEngine, "notifyWorkerReady" | "notifyWorkerUnavailable">,
  criarWorkerTesseract?: () => Promise<OcrWorkerLike>
): Promise<OcrWorkerHandle | null> {
  try {
    const handle = await prepararOcrWorker(criarWorkerTesseract);
    engine.notifyWorkerReady();
    return handle;
  } catch {
    engine.notifyWorkerUnavailable();
    return null;
  }
}
