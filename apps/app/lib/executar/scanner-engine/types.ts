import type { RecognitionResult } from "@repo/executar-contracts/scanner";

/**
 * Tipos do Scanner Engine — PR-02 do plano "Scanner OCR-first V2" (handoff
 * técnico do usuário). Define só a máquina de estado do reconhecimento por
 * enquanto; os colaboradores concretos (fonte de frame, worker OCR,
 * resolver/consensus, dispatcher) entram nas PRs seguintes e passam a ser
 * injetados no engine sem mudar este contrato de estado.
 *
 * CAMERA → FRAME SOURCE → QUALITY/STABILITY GATE → ROI PREPROCESSOR →
 * OCR ENGINE → CLOSED VOCABULARY RESOLVER → CONFIDENCE/CONSENSUS →
 * ACTION CONTRACT → COMMAND DISPATCHER → DOMAIN → FEEDBACK
 *
 * Este módulo modela só os estados de alto nível desse pipeline — cada
 * etapa concreta ganha seu próprio módulo (`ocr-worker.ts`,
 * `frame-source.ts`, ...) nas próximas PRs.
 */

/**
 * Estados do ciclo de vida do reconhecimento:
 * - `idle`: engine parado (Scanner fechado ou ainda não iniciado).
 * - `warming`: worker OCR sendo preparado — a câmera pode já estar ativa,
 *   mas nenhum reconhecimento acontece ainda (ver handoff §4).
 * - `ready`: worker pronto, aguardando um token físico aparecer no quadro.
 * - `recognizing`: um frame foi capturado e está sendo processado.
 * - `locked`: uma ação acabou de ser despachada — reconhecimentos são
 *   ignorados até o token sair da ROI ou o lock expirar (handoff §7,
 *   "ACTION LOCK").
 * - `unavailable`: o worker falhou e precisa de `retry()`.
 */
export type ScannerEngineState =
  | "idle"
  | "locked"
  | "ready"
  | "recognizing"
  | "unavailable"
  | "warming";

export type ScannerEngineEvent =
  | { readonly type: "LOCK_CLEARED" }
  | { readonly type: "RECOGNITION_INCONCLUSIVE" }
  | {
      readonly type: "RECOGNITION_RESOLVED";
      readonly result: RecognitionResult;
    }
  | { readonly type: "RECOGNITION_STARTED" }
  | { readonly type: "RETRY" }
  | { readonly type: "START" }
  | { readonly type: "STOP" }
  | { readonly type: "WORKER_READY" }
  | { readonly type: "WORKER_UNAVAILABLE" };

/** Contadores simples para observabilidade (handoff §15, "Observabilidade"). */
export interface ScannerEngineMetrics {
  readonly actionsDispatched: number;
  readonly recognitionAttempts: number;
  readonly recognitionsInconclusive: number;
  readonly workerFailures: number;
}

export interface ScannerEngineSnapshot {
  readonly lastRecognition: RecognitionResult | null;
  readonly metrics: ScannerEngineMetrics;
  readonly state: ScannerEngineState;
}

export type ScannerEngineListener = (snapshot: ScannerEngineSnapshot) => void;
