/**
 * Scanner — resolução de payload físico (QR impresso no Mapa-OS) para ações
 * reais do domínio EXECUTAR. Segue a regra da Scanner PRD/FRD (secao 32):
 * "reutilizar estado existente, comandos-gatilho finos, nunca um estado
 * paralelo do scanner". Toda mutação passa por `executarFerramenta` ou por
 * um atalho explícito do próprio domínio (`concluirPorGestoHumano`) — este
 * arquivo nunca escreve estado por conta própria.
 *
 * Reconciliações deliberadas (decisão do usuário, 27/08/2026, revista em
 * 28/08/2026):
 * - Feito conclui a entrega inteira (`concluirPorGestoHumano`), não só
 *   avança um passo, e NUNCA pede evidência/DoD/aprovação — o próprio gesto
 *   físico de escanear É a confirmação (mesma regra usada pelo botão
 *   "Concluir" do app — ver `concluirPorGestoHumano` em `domain.ts` para o
 *   raciocínio completo). Essa regra vale só para os dois gestos humanos
 *   diretos (scan, clique no app): o Copiloto via `executarFerramenta`
 *   continua exigindo a política de conclusão real, sem mudança para esse
 *   chamador.
 * - Saída roda 100% automática (sem diálogo de confirmação). O domínio hoje
 *   não tem uma mutação de "fechar o dia" separada — `/fechardia`
 *   (`executarCopiloto`) já é somente leitura (gera uma narrativa; a
 *   conclusão real de qualquer entrega continua exigindo Feito). O Scanner
 *   reaproveita exatamente essa narrativa como "relatório do dia" e deriva o
 *   resumo do dia seguinte a partir de `calendarioProjeto` — nenhuma peça de
 *   geração de relatório ou envio por canal existe hoje no repositório, então
 *   nenhuma delas é inventada aqui (FR-SAIDA-005 permanece pendência aberta,
 *   documentada, não simulada).
 */

import {
  calendarioProjeto,
  concluirPorGestoHumano,
  type Entrega,
  type EstadoOperacional,
  executarCopiloto,
  executarFerramenta,
  filaPronta,
  focoAtual,
} from "./domain.ts";

// Resolução de payload, tipos de ação e atalhos do Seletor são
// compartilhados com apps/mobile — ver packages/executar-contracts/scanner.ts.
export {
  type AcaoAdminId,
  type AcaoScannerReconhecida,
  ATALHOS_PADRAO_SELETOR,
  type AtalhoSeletor,
  idempotencyKeyScanner,
  resolverPayloadScanner,
} from "@repo/executar-contracts/scanner";

/** Feito escaneado sem foco ativo — única exceção de confirmação do FRD. */
export class ScannerConfirmacaoNecessariaError extends Error {}

export interface ResultadoAcaoScanner {
  readonly mensagem: string;
  /** Estado imediatamente anterior — permite Undo por rollback de revisão. */
  readonly stateAnterior: EstadoOperacional;
  readonly stateResultante: EstadoOperacional;
}

/**
 * Entrada: check-in + resolve a próxima entrega liberada + assume foco nela.
 * `assumir_foco` já cobre "abrir" e "iniciar" no modelo de domínio atual; o
 * timer progressivo (FR-ENTRADA-005) é derivado no cliente a partir do
 * timestamp do evento `foco.assumido` gerado aqui — nenhum estado de timer
 * novo é criado.
 */
export function executarAcaoEntrada(
  tasks: readonly Entrega[],
  state: EstadoOperacional
): ResultadoAcaoScanner {
  const alvo = filaPronta(tasks, state)[0];

  if (!alvo) {
    throw new Error("Nenhuma entrega liberada para iniciar.");
  }

  const stateResultante = executarFerramenta(tasks, state, {
    name: "assumir_foco",
    organizationId: state.organizationId,
    projectId: state.activeProjectId,
    expectedRevision: state.revision,
    taskId: alvo.id,
  });

  return {
    stateAnterior: state,
    stateResultante,
    mensagem: `Entrada registrada — foco em "${alvo.title}".`,
  };
}

/**
 * Feito: conclui a entrega em foco imediatamente, sem pedir evidência, DoD
 * ou aprovação (decisão do usuário — ver cabeçalho do arquivo e
 * `concluirPorGestoHumano` em `domain.ts`). Sem foco ativo, lança
 * `ScannerConfirmacaoNecessariaError` (FR-FEITO-005): o chamador deve pedir
 * confirmação e, se confirmado, invocar de novo passando `confirmado: true`.
 */
export function executarAcaoFeito(
  tasks: readonly Entrega[],
  state: EstadoOperacional,
  confirmado = false
): ResultadoAcaoScanner {
  const foco = focoAtual(tasks, state);

  if (!foco) {
    if (!confirmado) {
      throw new ScannerConfirmacaoNecessariaError(
        "Sem check-in ativo — confirme antes de concluir."
      );
    }

    throw new Error(
      "Nenhuma entrega em foco para concluir mesmo após confirmação."
    );
  }

  const stateResultante = concluirPorGestoHumano(
    tasks,
    state,
    foco.id,
    "Concluído via Scanner (Feito)."
  );

  return {
    stateAnterior: state,
    stateResultante,
    mensagem: `Feito — "${foco.title}" concluída.`,
  };
}

/** Data "DD/MM" (sem ano) → Date mais próxima da referência informada. */
function inferirData(dateDDMM: string, referencia: Date): Date | null {
  const partes = dateDDMM.split("/").map(Number);

  if (partes.length !== 2 || partes.some((value) => Number.isNaN(value))) {
    return null;
  }

  const [dia, mes] = partes;
  return new Date(referencia.getFullYear(), mes - 1, dia);
}

function resumirProximoDia(state: EstadoOperacional, referencia: Date): string {
  const inicioDeHoje = new Date(referencia);
  inicioDeHoje.setHours(0, 0, 0, 0);

  const proximo = calendarioProjeto(state).find((dia) => {
    const data = inferirData(dia.date, referencia);
    return data ? data.getTime() > inicioDeHoje.getTime() : false;
  });

  if (!proximo) {
    return "Nenhuma entrega planejada para os próximos dias.";
  }

  return `Amanhã (${proximo.date}): ${proximo.tasks.length} entrega(s), ${proximo.plannedMinutes} min planejados.`;
}

export interface ResultadoSaidaScanner {
  readonly relatorioDoDia: string;
  readonly resumoAmanha: string;
}

/**
 * Saída: checkout automático (FR-SAIDA-001..004). Reaproveita a narrativa
 * já existente de `/fechardia` como relatório do dia; deriva o resumo do dia
 * seguinte de `calendarioProjeto`. Envio para canal de comunicação
 * (FR-SAIDA-005) não é implementado — não existe integração de canal no
 * repositório hoje, e inventar uma aqui violaria a regra de não simular
 * comportamento sem base real.
 */
export function executarAcaoSaida(
  tasks: readonly Entrega[],
  state: EstadoOperacional,
  referencia: Date = new Date()
): ResultadoSaidaScanner {
  const fechamento = executarCopiloto(tasks, state, "/fechardia");

  return {
    relatorioDoDia: fechamento.reply,
    resumoAmanha: resumirProximoDia(state, referencia),
  };
}
