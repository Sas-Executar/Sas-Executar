/**
 * Scanner — resolução de payload físico (QR impresso no Mapa-OS) para ações
 * reais do domínio EXECUTAR. Segue a regra da Scanner PRD/FRD (secao 32):
 * "reutilizar estado existente, comandos-gatilho finos, nunca um estado
 * paralelo do scanner". Toda mutação passa por `executarFerramenta` — este
 * arquivo nunca escreve estado por conta própria.
 *
 * Reconciliações deliberadas (decisão do usuário, 27/08/2026):
 * - Feito conclui a entrega inteira (`concluir_entrega`), não só avança um
 *   passo. Isso normalmente exige aprovação humana E evidência verificada
 *   (`PoliticaConclusao.requireHumanApproval/requireEvidence/
 *   requireVerification`); o Scanner define `approved: true` e registra uma
 *   evidência verificada própria ("Concluído via Scanner") antes de concluir
 *   — o próprio gesto físico de escanear é tratado como a aprovação humana
 *   E a comprovação. Essa regra vale só para o caminho do Scanner: o
 *   Copiloto/UI manual continuam exigindo aprovação e evidência reais, sem
 *   mudança na política do domínio para os outros chamadores. DoD
 *   (`requireDod`), quando exigido pelo projeto, não é fabricado — se a
 *   entrega não tiver DoD definido, a conclusão falha e o chamador deve
 *   completá-la pela UI normal primeiro.
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
 * Feito: conclui a entrega em foco imediatamente, sem diálogo de aprovação
 * (decisão do usuário — ver cabeçalho do arquivo). Sem foco ativo, lança
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

  // O scan É a evidência: registra uma comprovação verificada antes de
  // concluir, para satisfazer requireEvidence/requireVerification sem exigir
  // que o usuário anexe nada manualmente.
  const comEvidencia = executarFerramenta(tasks, state, {
    name: "registrar_evidencia",
    organizationId: state.organizationId,
    projectId: state.activeProjectId,
    expectedRevision: state.revision,
    taskId: foco.id,
    note: "Concluído via Scanner (Feito).",
    verified: true,
  });

  const stateResultante = executarFerramenta(tasks, comEvidencia, {
    name: "concluir_entrega",
    organizationId: comEvidencia.organizationId,
    projectId: comEvidencia.activeProjectId,
    expectedRevision: comEvidencia.revision,
    taskId: foco.id,
    // Decisão do usuário: o scan físico É o gesto de aprovação humana.
    approved: true,
  });

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
