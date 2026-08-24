import {
  type EstadoOperacional,
  entregasAtivas,
  executarCopiloto,
} from "./domain.ts";
import { finalizarRun, iniciarRun, type LedgerExecutar } from "./run-ledger.ts";

export interface ResultadoBomDia {
  readonly ledger: LedgerExecutar;
  readonly replayed: boolean;
  readonly reply: string;
  readonly runId: string;
}

export function executarBomDia(
  ledger: LedgerExecutar,
  state: EstadoOperacional,
  operationalDate: string,
  now: string
): ResultadoBomDia {
  const idempotencyKey = `bomdia:${state.activeProjectId}:${operationalDate}`;
  const runId = [state.organizationId, idempotencyKey].join(":");
  const started = iniciarRun(ledger, {
    id: runId,
    idempotencyKey,
    lockKey: `routine:${state.activeProjectId}:${operationalDate}`,
    organizationId: state.organizationId,
    projectId: state.activeProjectId,
    startedAt: now,
    type: "ROUTINE",
  });

  if (started.replayed) {
    const reply = started.run.result?.reply;

    return {
      ledger: started.ledger,
      replayed: true,
      reply: typeof reply === "string" ? reply : "Rotina já iniciada.",
      runId: started.run.id,
    };
  }

  const response = executarCopiloto(entregasAtivas(state), state, "/bomdia");
  const completed = finalizarRun(
    started.ledger,
    {
      organizationId: state.organizationId,
      projectId: state.activeProjectId,
      runId,
    },
    now,
    {
      reply: response.reply,
      stateRevision: state.revision,
    }
  );

  return {
    ledger: completed,
    replayed: false,
    reply: response.reply,
    runId,
  };
}
