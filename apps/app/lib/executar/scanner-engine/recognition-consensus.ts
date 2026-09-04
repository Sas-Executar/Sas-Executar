import type { RecognitionResult } from "@repo/executar-contracts/scanner";
import type { ScannerEngine } from "./scanner-engine";

/**
 * Motor de consenso — PR-05 do plano "Scanner OCR-first V2" (handoff §7,
 * "Consensus Engine"): uma única leitura OCR não deve imediatamente
 * produzir uma mutação crítica.
 *
 *   confidence muito alta → executa imediatamente
 *   OU
 *   2 leituras consecutivas iguais → executa
 *
 * Depois de confirmar, o chamador (`processarReconhecimento`) avisa o
 * `ScannerEngine` via `notifyRecognitionResolved`, que já transiciona
 * para `locked` (ACTION LOCK, PR-02) — ignorando reconhecimentos
 * subsequentes até `command-dispatcher` (PR-06) chamar
 * `notifyLockCleared()` quando o token sair da ROI.
 */

export interface LimitesConsenso {
  readonly confiancaAltaMinima: number;
  readonly leiturasConsecutivasNecessarias: number;
}

export const LIMITES_CONSENSO_PADRAO: LimitesConsenso = {
  confiancaAltaMinima: 85,
  leiturasConsecutivasNecessarias: 2,
};

export type DecisaoConsenso = "aguardar" | "confirmar";

export interface ConsensusEngine {
  avaliar(resultado: RecognitionResult): DecisaoConsenso;
  reset(): void;
}

/**
 * Cria um motor de consenso com estado próprio (sequência de leituras
 * consecutivas da mesma ação). Uma instância por sessão de reconhecimento
 * — `reset()` limpa a sequência (chamado automaticamente ao confirmar).
 */
export function criarConsensusEngine(
  limites: LimitesConsenso = LIMITES_CONSENSO_PADRAO
): ConsensusEngine {
  let ultimoActionId: RecognitionResult["actionId"] | null = null;
  let leiturasConsecutivas = 0;

  return {
    avaliar(resultado) {
      if (resultado.confidence >= limites.confiancaAltaMinima) {
        ultimoActionId = resultado.actionId;
        leiturasConsecutivas = 1;
        return "confirmar";
      }

      leiturasConsecutivas =
        resultado.actionId === ultimoActionId ? leiturasConsecutivas + 1 : 1;
      ultimoActionId = resultado.actionId;

      return leiturasConsecutivas >= limites.leiturasConsecutivasNecessarias
        ? "confirmar"
        : "aguardar";
    },
    reset() {
      ultimoActionId = null;
      leiturasConsecutivas = 0;
    },
  };
}

/**
 * Liga o consensus engine ao ScannerEngine: avalia o resultado e notifica
 * `notifyRecognitionResolved` (confirmado → ACTION LOCK) ou
 * `notifyRecognitionInconclusive` (aguardando mais leituras).
 */
export function processarReconhecimento(
  engine: Pick<
    ScannerEngine,
    "notifyRecognitionInconclusive" | "notifyRecognitionResolved"
  >,
  consensus: ConsensusEngine,
  resultado: RecognitionResult
): DecisaoConsenso {
  const decisao = consensus.avaliar(resultado);

  if (decisao === "confirmar") {
    engine.notifyRecognitionResolved(resultado);
    consensus.reset();
  } else {
    engine.notifyRecognitionInconclusive();
  }

  return decisao;
}
