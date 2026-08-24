import {
  type EstadoOperacional,
  entregasAtivas,
  importarPlano,
  novoEstado,
} from "./domain.ts";

export type ModoOnboarding =
  | "CONNECT_EXISTING"
  | "IMPORT_FILE"
  | "NEW_PROJECT"
  | "START_ZERO";

export interface PlanoOnboarding {
  readonly mode: ModoOnboarding;
  readonly nextState?: EstadoOperacional;
  readonly status: "INVALID" | "READY";
  readonly summary: string;
  readonly writes: readonly string[];
}

export interface EntradaOnboarding {
  readonly content?: string;
  readonly mode: ModoOnboarding;
  readonly organizationId: string;
}

export function planejarOnboarding(
  input: EntradaOnboarding,
  current?: EstadoOperacional
): PlanoOnboarding {
  try {
    const base = current ?? novoEstado(input.organizationId);

    if (base.organizationId !== input.organizationId) {
      throw new Error("Estado não pertence à organização do onboarding.");
    }

    if (input.mode === "IMPORT_FILE") {
      const nextState = importarPlano(base, input.content ?? "", "append");
      const added =
        entregasAtivas(nextState).length - entregasAtivas(base).length;

      return {
        mode: input.mode,
        nextState,
        status: "READY",
        summary: `${added} entrega(s) válidas para importação atômica.`,
        writes: ["state", "project_tasks", "audit_event"],
      };
    }

    const summaries: Record<Exclude<ModoOnboarding, "IMPORT_FILE">, string> = {
      CONNECT_EXISTING: "Conexão externa requer preflight e binding explícito.",
      NEW_PROJECT:
        "Novo projeto será criado com política de conclusão estrita.",
      START_ZERO: "Workspace vazio será iniciado sem dados externos.",
    };

    return {
      mode: input.mode,
      nextState: base,
      status: "READY",
      summary: summaries[input.mode],
      writes: input.mode === "CONNECT_EXISTING" ? ["connector_binding"] : [],
    };
  } catch (error) {
    return {
      mode: input.mode,
      status: "INVALID",
      summary: error instanceof Error ? error.message : "Entrada inválida.",
      writes: [],
    };
  }
}
