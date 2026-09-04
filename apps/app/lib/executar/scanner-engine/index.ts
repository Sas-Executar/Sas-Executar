export {
  confiancaSuficiente,
  iniciarOcrWorker,
  type OcrRecognitionOutcome,
  type OcrWorkerHandle,
  type OcrWorkerLike,
  prepararOcrWorker,
} from "./ocr-worker";
export { criarScannerEngine, type ScannerEngine } from "./scanner-engine";
export {
  estaTravado,
  podeReconhecer,
  transicionar,
} from "./scanner-state-machine";
export type {
  ScannerEngineEvent,
  ScannerEngineListener,
  ScannerEngineMetrics,
  ScannerEngineSnapshot,
  ScannerEngineState,
} from "./types";
