import type { RecognitionResult } from "@repo/executar-contracts/scanner";
import { transicionar } from "./scanner-state-machine";
import type {
  ScannerEngineEvent,
  ScannerEngineListener,
  ScannerEngineMetrics,
  ScannerEngineSnapshot,
  ScannerEngineState,
} from "./types";

const METRICAS_INICIAIS: ScannerEngineMetrics = {
  actionsDispatched: 0,
  recognitionAttempts: 0,
  recognitionsInconclusive: 0,
  workerFailures: 0,
};

export interface ScannerEngine {
  getSnapshot(): ScannerEngineSnapshot;
  /** Chamado pelo `command-dispatcher` (PR-06) quando o token sai da ROI. */
  notifyLockCleared(): void;
  /** Chamado pelo `recognition-consensus` (PR-05) quando um frame não atinge confiança suficiente. */
  notifyRecognitionInconclusive(): void;
  /** Chamado pelo `recognition-consensus` (PR-05) quando uma ação é confirmada. */
  notifyRecognitionResolved(result: RecognitionResult): void;
  /** Chamado pelo `frame-quality`/`roi-preprocessor` (PR-04) ao capturar um frame utilizável. */
  notifyRecognitionStarted(): void;
  /** Chamado pelo `ocr-worker` (PR-03) quando o worker termina de aquecer. */
  notifyWorkerReady(): void;
  /** Chamado pelo `ocr-worker` (PR-03) em caso de falha irrecuperável. */
  notifyWorkerUnavailable(): void;
  retry(): void;
  start(): void;
  stop(): void;
  subscribe(listener: ScannerEngineListener): () => void;
}

/**
 * Scanner Engine — PR-02 do plano "Scanner OCR-first V2". Independente de
 * React, câmera e OCR: só a máquina de estado (`scanner-state-machine.ts`)
 * e a observabilidade básica (métricas + último reconhecimento). Os
 * colaboradores concretos das próximas PRs (worker persistente,
 * frame/ROI, resolver/consensus, dispatcher) chamam os métodos `notify*`
 * para avançar o engine — nenhum deles precisa conhecer a máquina de
 * estado por dentro. `useScannerEngine()` (PR-07) será a única ponte com
 * React, substituindo o acoplamento direto que `scanner-client.tsx` tem
 * hoje com `QrScanner`/`useSymbolScanner`/`useTesseractSymbolScanner`.
 */
export function criarScannerEngine(): ScannerEngine {
  let estado: ScannerEngineState = "idle";
  let lastRecognition: RecognitionResult | null = null;
  let metrics: ScannerEngineMetrics = METRICAS_INICIAIS;
  const listeners = new Set<ScannerEngineListener>();

  function snapshot(): ScannerEngineSnapshot {
    return { lastRecognition, metrics, state: estado };
  }

  function aplicar(evento: ScannerEngineEvent): void {
    estado = transicionar(estado, evento);
  }

  /**
   * Notifica os observadores após qualquer mutação pública — mesmo quando
   * a transição de estado é um no-op, porque `metrics`/`lastRecognition`
   * ainda assim podem ter mudado (ex.: uma falha de worker enquanto já
   * `unavailable` incrementa `workerFailures` sem trocar de estado).
   */
  function commit(): void {
    const atual = snapshot();
    for (const listener of listeners) {
      listener(atual);
    }
  }

  return {
    getSnapshot: snapshot,
    notifyLockCleared() {
      aplicar({ type: "LOCK_CLEARED" });
      commit();
    },
    notifyRecognitionInconclusive() {
      metrics = {
        ...metrics,
        recognitionAttempts: metrics.recognitionAttempts + 1,
        recognitionsInconclusive: metrics.recognitionsInconclusive + 1,
      };
      aplicar({ type: "RECOGNITION_INCONCLUSIVE" });
      commit();
    },
    notifyRecognitionResolved(result) {
      lastRecognition = result;
      metrics = {
        ...metrics,
        actionsDispatched: metrics.actionsDispatched + 1,
        recognitionAttempts: metrics.recognitionAttempts + 1,
      };
      aplicar({ type: "RECOGNITION_RESOLVED", result });
      commit();
    },
    notifyRecognitionStarted() {
      aplicar({ type: "RECOGNITION_STARTED" });
      commit();
    },
    notifyWorkerReady() {
      aplicar({ type: "WORKER_READY" });
      commit();
    },
    notifyWorkerUnavailable() {
      metrics = { ...metrics, workerFailures: metrics.workerFailures + 1 };
      aplicar({ type: "WORKER_UNAVAILABLE" });
      commit();
    },
    retry() {
      aplicar({ type: "RETRY" });
      commit();
    },
    start() {
      aplicar({ type: "START" });
      commit();
    },
    stop() {
      aplicar({ type: "STOP" });
      // Métricas são por sessão de uso do Scanner, não persistidas — fechar
      // e reabrir o Scanner começa uma contagem nova, de propósito.
      lastRecognition = null;
      metrics = METRICAS_INICIAIS;
      commit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
