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
