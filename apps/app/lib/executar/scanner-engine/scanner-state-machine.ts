import type { ScannerEngineEvent, ScannerEngineState } from "./types";

/**
 * Máquina de estado pura do Scanner Engine — sem React, sem câmera, sem
 * OCR. Extraída da lógica hoje implícita e espalhada entre `Fase`/
 * `EstadoTesseract`/janelas de deduplicação em `scanner-client.tsx`
 * (handoff "Scanner OCR-first V2", PR-02).
 *
 * Transições não previstas na tabela são ignoradas (retornam o mesmo
 * estado) em vez de lançar erro — um evento espúrio ou duplicado (ex.:
 * dois `WORKER_READY` seguidos) nunca deve derrubar o Scanner; consistente
 * com o requisito de "Recovery" do handoff (§15): falha de reconhecimento
 * não quebra a câmera nem o domínio.
 */
const TRANSICOES: Readonly<
  Record<
    ScannerEngineState,
    Readonly<Partial<Record<ScannerEngineEvent["type"], ScannerEngineState>>>
  >
> = {
  idle: {
    START: "warming",
  },
  warming: {
    STOP: "idle",
    WORKER_READY: "ready",
    WORKER_UNAVAILABLE: "unavailable",
  },
  ready: {
    RECOGNITION_STARTED: "recognizing",
    STOP: "idle",
    WORKER_UNAVAILABLE: "unavailable",
  },
  recognizing: {
    RECOGNITION_INCONCLUSIVE: "ready",
    RECOGNITION_RESOLVED: "locked",
    STOP: "idle",
    WORKER_UNAVAILABLE: "unavailable",
  },
  locked: {
    LOCK_CLEARED: "ready",
    STOP: "idle",
    WORKER_UNAVAILABLE: "unavailable",
  },
  unavailable: {
    RETRY: "warming",
    STOP: "idle",
  },
};

export function transicionar(
  estadoAtual: ScannerEngineState,
  evento: ScannerEngineEvent
): ScannerEngineState {
  return TRANSICOES[estadoAtual][evento.type] ?? estadoAtual;
}

/** Verdadeiro quando o engine está pronto para receber frames (ver `ready`). */
export function podeReconhecer(estado: ScannerEngineState): boolean {
  return estado === "ready";
}

/** Verdadeiro quando reconhecimentos devem ser ignorados (ACTION LOCK). */
export function estaTravado(estado: ScannerEngineState): boolean {
  return estado === "locked";
}
