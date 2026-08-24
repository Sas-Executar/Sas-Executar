export type TipoRun = "COMMAND" | "CONNECTOR" | "PROJECTION" | "ROUTINE";
export type StatusRun = "FAILED" | "RUNNING" | "SUCCEEDED";
export type StatusEfeito = "FAILED" | "PENDING" | "SUCCEEDED";

export interface RunExecutar {
  readonly completedAt?: string;
  readonly id: string;
  readonly idempotencyKey: string;
  readonly lockKey: string;
  readonly organizationId: string;
  readonly projectId: string;
  readonly result?: Readonly<Record<string, unknown>>;
  readonly startedAt: string;
  readonly status: StatusRun;
  readonly type: TipoRun;
}

export interface EfeitoRun {
  readonly effectKey: string;
  readonly errorCode?: string;
  readonly organizationId: string;
  readonly projectId: string;
  readonly runId: string;
  readonly status: StatusEfeito;
}

export interface LedgerExecutar {
  readonly effects: readonly EfeitoRun[];
  readonly runs: readonly RunExecutar[];
}

export interface EntradaRun {
  readonly id: string;
  readonly idempotencyKey: string;
  readonly lockKey: string;
  readonly organizationId: string;
  readonly projectId: string;
  readonly startedAt: string;
  readonly type: TipoRun;
}

export interface ReferenciaRun {
  readonly organizationId: string;
  readonly projectId: string;
  readonly runId: string;
}

export interface ResultadoInicioRun {
  readonly ledger: LedgerExecutar;
  readonly replayed: boolean;
  readonly run: RunExecutar;
}

export const LEDGER_VAZIO: LedgerExecutar = { runs: [], effects: [] };

function validarEscopo(input: EntradaRun): void {
  for (const [field, value] of Object.entries(input)) {
    if (field !== "type" && !String(value).trim()) {
      throw new Error(`Run inválido: ${field} obrigatório.`);
    }
  }
}

function correspondeRun(run: RunExecutar, reference: ReferenciaRun): boolean {
  return (
    run.id === reference.runId &&
    run.organizationId === reference.organizationId &&
    run.projectId === reference.projectId
  );
}

function correspondeEfeito(
  effect: EfeitoRun,
  reference: ReferenciaRun
): boolean {
  return (
    effect.runId === reference.runId &&
    effect.organizationId === reference.organizationId &&
    effect.projectId === reference.projectId
  );
}

export function iniciarRun(
  ledger: LedgerExecutar,
  input: EntradaRun
): ResultadoInicioRun {
  validarEscopo(input);
  const replay = ledger.runs.find(
    (run) =>
      run.organizationId === input.organizationId &&
      run.idempotencyKey === input.idempotencyKey
  );

  if (replay) {
    if (replay.projectId !== input.projectId || replay.type !== input.type) {
      throw new Error("Chave de idempotência reutilizada em outro contrato.");
    }

    return { ledger, replayed: true, run: replay };
  }

  if (
    ledger.runs.some(
      (run) =>
        run.id === input.id &&
        run.organizationId === input.organizationId &&
        run.projectId === input.projectId
    )
  ) {
    throw new Error("run_id já existe com outra chave de idempotência.");
  }

  const collision = ledger.runs.some(
    (run) =>
      run.organizationId === input.organizationId &&
      run.projectId === input.projectId &&
      run.lockKey === input.lockKey &&
      run.status === "RUNNING"
  );

  if (collision) {
    throw new Error("Já existe uma execução ativa para este lock.");
  }

  const run: RunExecutar = { ...input, status: "RUNNING" };

  return {
    ledger: { ...ledger, runs: [...ledger.runs, run] },
    replayed: false,
    run,
  };
}

export function reservarEfeito(
  ledger: LedgerExecutar,
  reference: ReferenciaRun,
  effectKey: string
): LedgerExecutar {
  const run = ledger.runs.find((item) => correspondeRun(item, reference));

  if (!run || run.status !== "RUNNING") {
    throw new Error("Efeito exige run ativo no mesmo tenant e projeto.");
  }

  if (
    ledger.effects.some(
      (effect) =>
        correspondeEfeito(effect, reference) && effect.effectKey === effectKey
    )
  ) {
    return ledger;
  }

  return {
    ...ledger,
    effects: [
      ...ledger.effects,
      { ...reference, effectKey, status: "PENDING" },
    ],
  };
}

export function finalizarEfeito(
  ledger: LedgerExecutar,
  reference: ReferenciaRun,
  effectKey: string,
  status: Exclude<StatusEfeito, "PENDING">,
  errorCode?: string
): LedgerExecutar {
  let found = false;
  const effects = ledger.effects.map((effect) => {
    if (
      !correspondeEfeito(effect, reference) ||
      effect.effectKey !== effectKey
    ) {
      return effect;
    }

    found = true;
    return { ...effect, status, ...(errorCode ? { errorCode } : {}) };
  });

  if (!found) {
    throw new Error("Efeito não reservado no mesmo tenant e projeto.");
  }

  return { ...ledger, effects };
}

export function finalizarRun(
  ledger: LedgerExecutar,
  reference: ReferenciaRun,
  completedAt: string,
  result: Readonly<Record<string, unknown>> = {}
): LedgerExecutar {
  const run = ledger.runs.find((item) => correspondeRun(item, reference));

  if (!run || run.status !== "RUNNING") {
    throw new Error("Conclusão exige run ativo no mesmo tenant e projeto.");
  }

  const effects = ledger.effects.filter((effect) =>
    correspondeEfeito(effect, reference)
  );

  if (effects.some((effect) => effect.status !== "SUCCEEDED")) {
    throw new Error("Run não pode concluir com efeitos pendentes ou falhos.");
  }

  return {
    ...ledger,
    runs: ledger.runs.map((run) =>
      correspondeRun(run, reference)
        ? { ...run, completedAt, result, status: "SUCCEEDED" }
        : run
    ),
  };
}

export function falharRun(
  ledger: LedgerExecutar,
  reference: ReferenciaRun,
  completedAt: string,
  errorCode: string
): LedgerExecutar {
  const run = ledger.runs.find((item) => correspondeRun(item, reference));

  if (!run || run.status !== "RUNNING") {
    throw new Error("Falha exige run ativo no mesmo tenant e projeto.");
  }

  return {
    ...ledger,
    runs: ledger.runs.map((run) =>
      correspondeRun(run, reference)
        ? {
            ...run,
            completedAt,
            result: { errorCode },
            status: "FAILED",
          }
        : run
    ),
  };
}
