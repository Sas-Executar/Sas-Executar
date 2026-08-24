import {
  dependenciasPendentes,
  type Entrega,
  type EstadoEntrega,
  type EstadoOperacional,
  entregasAtivas,
  estadoEntrega,
  filaBloqueada,
  filaPronta,
  focoAtual,
  progresso,
  projetoAtivo,
} from "./domain.ts";

export type TipoProjecao =
  | "APP_DASHBOARD"
  | "MAPA_OS"
  | "PRISMA"
  | "SHOWROOM"
  | "WORKBOOK";

export interface TarefaProjetada {
  readonly date: string;
  readonly dod: string | null;
  readonly evidenceCount: number;
  readonly front: string;
  readonly id: string;
  readonly mins: number;
  readonly stage: number;
  readonly state: EstadoEntrega;
  readonly title: string;
}

export interface TarefaBloqueadaProjetada extends TarefaProjetada {
  readonly pendingDependencyIds: readonly string[];
}

export interface ProjecaoExecutar {
  readonly blocked: readonly TarefaBloqueadaProjetada[];
  readonly focus: TarefaProjetada | null;
  readonly generatedAt: string;
  readonly kind: TipoProjecao;
  readonly locale: "pt-BR";
  readonly organizationId: string;
  readonly progress: {
    readonly completedCount: number;
    readonly completedMinutes: number;
    readonly percentage: number;
    readonly totalCount: number;
    readonly totalMinutes: number;
  };
  readonly project: { readonly id: string; readonly name: string };
  readonly projectId: string;
  readonly projectionId: string;
  readonly ready: readonly TarefaProjetada[];
  readonly schemaVersion: "1.0.0";
  readonly slots: Readonly<
    Record<string, boolean | null | number | readonly string[] | string>
  >;
  readonly sourceRevision: number;
}

function projetarTarefa(
  task: Entrega,
  state: EstadoOperacional
): TarefaProjetada {
  return {
    id: task.id,
    title: task.title,
    front: task.front,
    date: task.date,
    mins: task.mins,
    stage: task.stage,
    state: estadoEntrega(task, state),
    dod: task.dod ?? null,
    evidenceCount: state.evidence.filter((item) => item.taskId === task.id)
      .length,
  };
}

export function projetarEstado(
  state: EstadoOperacional,
  kind: TipoProjecao,
  generatedAt: string
): ProjecaoExecutar {
  const project = projetoAtivo(state);
  const tasks = entregasAtivas(state);
  const focus = focoAtual(tasks, state);
  const snapshot = progresso(tasks, state);

  return {
    schemaVersion: "1.0.0",
    projectionId: [state.organizationId, project.id, state.revision, kind].join(
      ":"
    ),
    organizationId: state.organizationId,
    projectId: project.id,
    sourceRevision: state.revision,
    kind,
    generatedAt,
    locale: "pt-BR",
    project: { id: project.id, name: project.name },
    progress: {
      completedMinutes: snapshot.completed,
      totalMinutes: snapshot.total,
      percentage: snapshot.percentage,
      completedCount: state.done.length,
      totalCount: tasks.length,
    },
    focus: focus ? projetarTarefa(focus, state) : null,
    ready: filaPronta(tasks, state).map((task) => projetarTarefa(task, state)),
    blocked: filaBloqueada(tasks, state).map((task) => ({
      ...projetarTarefa(task, state),
      pendingDependencyIds: dependenciasPendentes(task, state),
    })),
    slots: {
      evidenceTotal: state.evidence.length,
      evidenceVerified: state.evidence.filter((item) => item.verified).length,
    },
  };
}
