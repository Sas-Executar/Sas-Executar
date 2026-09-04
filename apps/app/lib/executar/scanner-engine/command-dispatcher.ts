import type { RecognitionResult } from "@repo/executar-contracts/scanner";
import type { Entrega, EstadoOperacional } from "../domain";
import { executarCopiloto } from "../domain";
import {
  executarAcaoEntrada,
  executarAcaoFeito,
  executarAcaoSaida,
  ScannerConfirmacaoNecessariaError,
} from "../scanner";
import type { ScannerEngine } from "./scanner-engine";

/**
 * Command Dispatcher — PR-06 do plano "Scanner OCR-first V2" (handoff §8,
 * "Command Dispatcher"): ponte entre o `ScannerEngine`/`recognition-consensus`
 * (que só sabem que um dos 5 tokens administrativos foi confirmado) e o
 * domínio operacional (`domain.ts`/`scanner.ts`) — substitui o `despachar()`
 * hoje embutido em `scanner-client.tsx`, que misturava esse switch com
 * estado de UI (fase, mensagem, erro).
 *
 * Este módulo não conhece React nem `<video>`: recebe um `RecognitionResult`
 * já CONFIRMADO pelo consenso (PR-05) e devolve uma descrição do resultado
 * (`ComandoDespachado`) para o chamador (PR-07) decidir como renderizar.
 * Nunca escreve estado por conta própria — cada branch chama uma função já
 * existente de `scanner.ts`/`domain.ts`, mesma disciplina de "único caminho
 * de mutação" já em vigor no restante do app.
 *
 * Idempotência ("um token retido = uma ação", handoff §critérios de
 * aceite): diferente do caminho QR legado (`scanDuplicado`/
 * `idempotencyKeyScanner`, baseado em buckets de tempo), este módulo não
 * reimplementa deduplicação — o `ACTION LOCK` do `ScannerEngine` (PR-02) já
 * garante estruturalmente que só um `RecognitionResult` confirmado chega
 * aqui por sessão de exposição do token, porque o engine só volta a
 * `ready` (e portanto só volta a reconhecer) depois de `notifyLockCleared()`.
 */

export type ComandoDespachado =
  | { readonly kind: "copiloto"; readonly mensagem: string }
  | {
      readonly kind: "entrada";
      readonly mensagem: string;
      readonly stateAnterior: EstadoOperacional;
      readonly stateResultante: EstadoOperacional;
    }
  | { readonly kind: "erro"; readonly mensagem: string }
  | {
      readonly kind: "feito";
      readonly mensagem: string;
      readonly stateAnterior: EstadoOperacional;
      readonly stateResultante: EstadoOperacional;
    }
  | { readonly kind: "feito_confirmacao_necessaria" }
  | {
      readonly kind: "saida";
      readonly relatorioDoDia: string;
      readonly resumoAmanha: string;
    }
  | { readonly kind: "seletor" };

export interface DespacharComandoOpcoes {
  /**
   * `true` quando o chamador já pediu e obteve confirmação humana para
   * concluir "Feito" sem check-in ativo (ver `feito_confirmacao_necessaria`
   * abaixo e `ScannerConfirmacaoNecessariaError` em `scanner.ts`).
   */
  readonly feitoConfirmado?: boolean;
}

function despacharEntrada(
  tasks: readonly Entrega[],
  state: EstadoOperacional
): ComandoDespachado {
  try {
    const resultado = executarAcaoEntrada(tasks, state);
    return {
      kind: "entrada",
      mensagem: resultado.mensagem,
      stateAnterior: resultado.stateAnterior,
      stateResultante: resultado.stateResultante,
    };
  } catch (falha) {
    return {
      kind: "erro",
      mensagem:
        falha instanceof Error ? falha.message : "Falha ao executar Entrada.",
    };
  }
}

function despacharFeito(
  tasks: readonly Entrega[],
  state: EstadoOperacional,
  confirmado: boolean
): ComandoDespachado {
  try {
    const resultado = executarAcaoFeito(tasks, state, confirmado);
    return {
      kind: "feito",
      mensagem: resultado.mensagem,
      stateAnterior: resultado.stateAnterior,
      stateResultante: resultado.stateResultante,
    };
  } catch (falha) {
    if (falha instanceof ScannerConfirmacaoNecessariaError) {
      return { kind: "feito_confirmacao_necessaria" };
    }

    return {
      kind: "erro",
      mensagem: falha instanceof Error ? falha.message : "Falha ao concluir.",
    };
  }
}

function despacharSaida(
  tasks: readonly Entrega[],
  state: EstadoOperacional
): ComandoDespachado {
  const resultado = executarAcaoSaida(tasks, state);
  return {
    kind: "saida",
    relatorioDoDia: resultado.relatorioDoDia,
    resumoAmanha: resultado.resumoAmanha,
  };
}

function despacharCopiloto(
  tasks: readonly Entrega[],
  state: EstadoOperacional
): ComandoDespachado {
  const briefing = executarCopiloto(tasks, state, "/bomdia");
  return { kind: "copiloto", mensagem: briefing.reply };
}

/**
 * Despacha a ação confirmada (`resultado.actionId`, um dos 5 tokens do
 * vocabulário fechado — `AcaoAdminId`) para o domínio operacional.
 */
export function despacharComando(
  resultado: RecognitionResult,
  tasks: readonly Entrega[],
  state: EstadoOperacional,
  opcoes: DespacharComandoOpcoes = {}
): ComandoDespachado {
  switch (resultado.actionId) {
    case "entrada":
      return despacharEntrada(tasks, state);
    case "feito":
      return despacharFeito(tasks, state, opcoes.feitoConfirmado ?? false);
    case "saida":
      return despacharSaida(tasks, state);
    case "copiloto":
      return despacharCopiloto(tasks, state);
    case "seletor":
      return { kind: "seletor" };
    default: {
      const _exaustivo: never = resultado.actionId;
      return {
        kind: "erro",
        mensagem: `Ação reconhecida sem tratamento no dispatcher: ${_exaustivo}`,
      };
    }
  }
}

export interface LimitesLockClear {
  /**
   * Quantos frames CONSECUTIVOS sem o token no quadro são necessários antes
   * de destravar — evita destravar num único frame com flicker (mão
   * tremendo, reflexo momentâneo) e reconhecer a mesma ação de novo por
   * engano.
   */
  readonly framesAusentesNecessarios: number;
}

export const LIMITES_LOCK_CLEAR_PADRAO: LimitesLockClear = {
  framesAusentesNecessarios: 3,
};

export interface ObservadorLockClear {
  /**
   * Chamar a cada frame processado enquanto o engine estiver `locked`, com
   * `true` quando o frame ainda mostra o token físico (ex.:
   * `possuiForegroundMinimo` da ROI) e `false` quando não.
   */
  notificarPresenca(tokenPresente: boolean): void;
  reset(): void;
}

/**
 * Observador de "token saiu da ROI" — a segunda metade do ACTION LOCK
 * (handoff §7): depois de `notifyRecognitionResolved` travar o engine, só
 * `notifyLockCleared()` o destrava de novo. Chamar isso direto de cada
 * frame seria arriscado (um frame ruim destravaria cedo demais); este
 * observador exige `framesAusentesNecessarios` consecutivos sem o token
 * antes de notificar o engine.
 *
 * Seguro chamar mesmo fora do estado `locked` — `notifyLockCleared()` numa
 * transição não prevista (`scanner-state-machine.ts`) é um no-op.
 */
export function criarObservadorLockClear(
  engine: Pick<ScannerEngine, "notifyLockCleared">,
  limites: LimitesLockClear = LIMITES_LOCK_CLEAR_PADRAO
): ObservadorLockClear {
  let framesAusentesConsecutivos = 0;

  return {
    notificarPresenca(tokenPresente) {
      if (tokenPresente) {
        framesAusentesConsecutivos = 0;
        return;
      }

      framesAusentesConsecutivos += 1;

      if (framesAusentesConsecutivos >= limites.framesAusentesNecessarios) {
        framesAusentesConsecutivos = 0;
        engine.notifyLockCleared();
      }
    },
    reset() {
      framesAusentesConsecutivos = 0;
    },
  };
}
