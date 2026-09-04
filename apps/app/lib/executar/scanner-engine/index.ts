export {
  type ComandoDespachado,
  criarObservadorLockClear,
  type DespacharComandoOpcoes,
  despacharComando,
  LIMITES_LOCK_CLEAR_PADRAO,
  type LimitesLockClear,
  type ObservadorLockClear,
} from "./command-dispatcher";
export {
  type AvaliacaoQualidadeFrame,
  avaliarQualidadeFrame,
  calcularContraste,
  calcularLuminanciaMedia,
  framesSaoSemelhantes,
  LIMITES_QUALIDADE_PADRAO,
  type LimitesQualidadeFrame,
  type MotivoQualidadeInsuficiente,
  possuiForegroundMinimo,
} from "./frame-quality";
export {
  type CriarFrameSourceOptions,
  criarFrameSource,
  type FrameListener,
  type FrameSource,
} from "./frame-source";
export {
  confiancaSuficiente,
  iniciarOcrWorker,
  type OcrRecognitionOutcome,
  type OcrWorkerHandle,
  type OcrWorkerLike,
  prepararOcrWorker,
} from "./ocr-worker";
export {
  type ConsensusEngine,
  criarConsensusEngine,
  type DecisaoConsenso,
  LIMITES_CONSENSO_PADRAO,
  type LimitesConsenso,
  processarReconhecimento,
} from "./recognition-consensus";
export {
  type CorrespondenciaVocabulario,
  calcularSimilaridade,
  construirRecognitionResult,
  LIMIAR_SIMILARIDADE_PADRAO,
  resolverVocabularioFechado,
} from "./recognition-resolver";
export {
  type ContextoDesenho2DLike,
  calcularRetanguloRoi,
  desenharRoiEmContexto,
  FRACAO_ROI_PADRAO,
  LADO_CANVAS_OCR,
  type RetanguloRoi,
  type VideoFrameLike,
} from "./roi-preprocessor";
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
export {
  type UseScannerEngineOptions,
  type UseScannerEngineResult,
  useScannerEngine,
} from "./use-scanner-engine";
