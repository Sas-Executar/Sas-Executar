export type EstadoEntrega =
  | "BACKLOG_VALIDATED"
  | "READY"
  | "DOING"
  | "VERIFY"
  | "DONE"
  | "BLOCKED";

export interface Entrega {
  readonly id: string;
  readonly title: string;
  readonly front: string;
  readonly date: string;
  readonly mins: number;
  readonly deps: readonly string[];
  readonly stage: number;
}

export interface Evidencia {
  readonly taskId: string;
  readonly note: string;
  readonly url: string;
  readonly verified: boolean;
  readonly createdAt: string;
}

export interface EventoOperacional {
  readonly organizationId: string;
  readonly action: string;
  readonly taskId: string | null;
  readonly at: string;
}

export interface EstadoOperacional {
  readonly organizationId: string;
  readonly done: readonly string[];
  readonly focus: string | null;
  readonly evidence: readonly Evidencia[];
  readonly started: Readonly<Record<string, number>>;
  readonly events: readonly EventoOperacional[];
  readonly revision: number;
}

export interface RespostaCopiloto {
  readonly command: string;
  readonly reply: string;
  readonly state: EstadoOperacional;
  readonly requiresApproval: boolean;
}

export interface ContratoFerramenta {
  readonly name: string;
  readonly effect: "read" | "reversible-write" | "relevant-write";
  readonly requiresApproval: boolean;
  readonly purpose: string;
}

export interface EntradaFerramenta {
  readonly organizationId: string;
  readonly name: string;
  readonly taskId?: string;
  readonly note?: string;
  readonly url?: string;
  readonly verified?: boolean;
  readonly approved?: boolean;
}

export const FERRAMENTAS_OPERACIONAIS: readonly ContratoFerramenta[] = [
  {
    name: "consultar_estado",
    effect: "read",
    requiresApproval: false,
    purpose: "Ler foco, fila, progresso e bloqueios do estado canônico.",
  },
  {
    name: "assumir_foco",
    effect: "reversible-write",
    requiresApproval: false,
    purpose: "Assumir somente uma entrega liberada por dependências.",
  },
  {
    name: "registrar_progresso",
    effect: "reversible-write",
    requiresApproval: false,
    purpose: "Registrar um passo na entrega atualmente em foco.",
  },
  {
    name: "registrar_evidencia",
    effect: "reversible-write",
    requiresApproval: false,
    purpose: "Associar comprovação à entrega em foco na organização ativa.",
  },
  {
    name: "concluir_entrega",
    effect: "relevant-write",
    requiresApproval: true,
    purpose: "Concluir somente com evidência verificada e aprovação humana.",
  },
] as const;

export const ROTULOS_ESTADO: Record<EstadoEntrega, string> = {
  BACKLOG_VALIDATED: "VALIDADO",
  READY: "PRONTO",
  DOING: "EM EXECUÇÃO",
  VERIFY: "VERIFICAR",
  DONE: "CONCLUÍDO",
  BLOCKED: "BLOQUEADO",
};

export function novoEstado(organizationId: string): EstadoOperacional {
  if (!organizationId.trim()) {
    throw new Error("Organização ativa obrigatória.");
  }

  return {
    organizationId,
    done: [],
    focus: null,
    evidence: [],
    started: {},
    events: [],
    revision: 0,
  };
}

export function chaveOrganizacao(organizationId: string): string {
  if (!organizationId.trim()) {
    throw new Error("Organização ativa obrigatória.");
  }

  return `executar:${organizationId}:v2`;
}

export function restaurarEstado(
  raw: string | null,
  organizationId: string
): EstadoOperacional {
  if (!raw) {
    return novoEstado(organizationId);
  }

  try {
    const candidate: unknown = JSON.parse(raw);

    if (
      !candidate ||
      typeof candidate !== "object" ||
      !("organizationId" in candidate) ||
      candidate.organizationId !== organizationId ||
      !("done" in candidate) ||
      !Array.isArray(candidate.done) ||
      !("evidence" in candidate) ||
      !Array.isArray(candidate.evidence)
    ) {
      return novoEstado(organizationId);
    }

    const state = candidate as EstadoOperacional;

    return {
      ...novoEstado(organizationId),
      ...state,
      organizationId,
      events: Array.isArray(state.events) ? state.events : [],
      started:
        state.started && typeof state.started === "object" ? state.started : {},
      revision: Number.isSafeInteger(state.revision) ? state.revision : 0,
    };
  } catch {
    return novoEstado(organizationId);
  }
}

function registrar(
  state: EstadoOperacional,
  action: string,
  taskId: string | null,
  changes: Partial<EstadoOperacional>
): EstadoOperacional {
  return {
    ...state,
    ...changes,
    organizationId: state.organizationId,
    revision: state.revision + 1,
    events: [
      ...state.events,
      {
        organizationId: state.organizationId,
        action,
        taskId,
        at: new Date().toISOString(),
      },
    ],
  };
}

export function dependenciasPendentes(
  task: Entrega,
  state: EstadoOperacional
): Entrega["deps"] {
  return task.deps.filter((dependency) => !state.done.includes(dependency));
}

export function filaPronta(
  tasks: readonly Entrega[],
  state: EstadoOperacional
): Entrega[] {
  return tasks.filter(
    (task) =>
      !state.done.includes(task.id) &&
      dependenciasPendentes(task, state).length === 0
  );
}

export function filaBloqueada(
  tasks: readonly Entrega[],
  state: EstadoOperacional
): Entrega[] {
  return tasks.filter(
    (task) =>
      !state.done.includes(task.id) &&
      dependenciasPendentes(task, state).length > 0
  );
}

export function focoAtual(
  tasks: readonly Entrega[],
  state: EstadoOperacional
): Entrega | null {
  const ready = filaPronta(tasks, state);

  return ready.find((task) => task.id === state.focus) ?? ready[0] ?? null;
}

export function estadoEntrega(
  task: Entrega,
  state: EstadoOperacional
): EstadoEntrega {
  if (state.done.includes(task.id)) {
    return "DONE";
  }

  if (dependenciasPendentes(task, state).length > 0) {
    return "BLOCKED";
  }

  if (
    state.focus === task.id &&
    state.evidence.some((evidence) => evidence.taskId === task.id)
  ) {
    return "VERIFY";
  }

  if (state.focus === task.id) {
    return "DOING";
  }

  return "READY";
}

export function assumirFoco(
  tasks: readonly Entrega[],
  state: EstadoOperacional,
  taskId: string
): EstadoOperacional {
  const task = filaPronta(tasks, state).find((item) => item.id === taskId);

  if (!task) {
    throw new Error("Somente uma entrega liberada pode assumir o foco.");
  }

  if (state.focus === taskId) {
    return state;
  }

  return registrar(state, "foco.assumido", taskId, { focus: taskId });
}

export function registrarPasso(
  tasks: readonly Entrega[],
  state: EstadoOperacional,
  taskId: string
): EstadoOperacional {
  const task = focoAtual(tasks, state);

  if (!task || task.id !== taskId) {
    throw new Error("Progresso permitido somente na entrega em foco.");
  }

  const steps = Math.max(1, Math.ceil(task.mins / 15));
  const current = state.started[taskId] ?? 0;

  return registrar(state, "progresso.registrado", taskId, {
    focus: taskId,
    started: { ...state.started, [taskId]: Math.min(steps, current + 1) },
  });
}

export function registrarEvidencia(
  tasks: readonly Entrega[],
  state: EstadoOperacional,
  taskId: string,
  note: string,
  url = "",
  verified = false
): EstadoOperacional {
  const task = focoAtual(tasks, state);

  if (!task || task.id !== taskId) {
    throw new Error("Evidência permitida somente na entrega em foco.");
  }

  if (!(note.trim() || url.trim())) {
    throw new Error("Informe uma evidência antes de concluir.");
  }

  if (url.trim()) {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("A evidência precisa usar uma URL HTTP ou HTTPS.");
    }
  }

  const evidence: Evidencia = {
    taskId,
    note: note.trim(),
    url: url.trim(),
    verified,
    createdAt: new Date().toISOString(),
  };

  return registrar(state, "evidencia.registrada", taskId, {
    focus: taskId,
    evidence: [...state.evidence, evidence],
  });
}

export function concluirEntrega(
  tasks: readonly Entrega[],
  state: EstadoOperacional,
  taskId: string
): EstadoOperacional {
  const task = focoAtual(tasks, state);

  if (!task || task.id !== taskId) {
    throw new Error("A entrega não está liberada para conclusão.");
  }

  const proof = state.evidence.find(
    (evidence) => evidence.taskId === taskId && evidence.verified
  );

  if (!proof) {
    throw new Error("Conclusão exige evidência e verificação concluída.");
  }

  const completed = registrar(state, "entrega.concluida", taskId, {
    done: [...state.done, taskId],
    focus: null,
  });
  const next = filaPronta(tasks, completed)[0];

  return next ? { ...completed, focus: next.id } : completed;
}

export function progresso(
  tasks: readonly Entrega[],
  state: EstadoOperacional
): { completed: number; total: number; percentage: number } {
  const total = tasks.reduce((minutes, task) => minutes + task.mins, 0);
  const completed = tasks
    .filter((task) => state.done.includes(task.id))
    .reduce((minutes, task) => minutes + task.mins, 0);

  return {
    completed,
    total,
    percentage: total ? Math.round((completed / total) * 100) : 0,
  };
}

export function subgrafoAfetado(
  tasks: readonly Entrega[],
  rootId: string
): Entrega[] {
  const affected = new Set([rootId]);
  let changed = true;

  while (changed) {
    changed = false;

    for (const task of tasks) {
      if (
        !affected.has(task.id) &&
        task.deps.some((dependency) => affected.has(dependency))
      ) {
        affected.add(task.id);
        changed = true;
      }
    }
  }

  return tasks.filter((task) => affected.has(task.id));
}

export function eventosPendentes(
  state: EstadoOperacional,
  organizationId: string,
  revisionSincronizada = 0
): readonly EventoOperacional[] {
  if (state.organizationId !== organizationId) {
    throw new Error("Sincronização negada para organização divergente.");
  }

  if (
    !Number.isSafeInteger(revisionSincronizada) ||
    revisionSincronizada < 0 ||
    revisionSincronizada > state.revision
  ) {
    throw new Error("Revisão sincronizada inválida.");
  }

  return state.events
    .slice(revisionSincronizada)
    .filter((event) => event.organizationId === organizationId);
}

export function executarFerramenta(
  tasks: readonly Entrega[],
  state: EstadoOperacional,
  input: EntradaFerramenta
): EstadoOperacional {
  if (state.organizationId !== input.organizationId) {
    throw new Error("Ferramenta não pode operar em outra organização.");
  }

  if (input.name === "consultar_estado") {
    return state;
  }

  if (!input.taskId) {
    throw new Error("A ferramenta precisa identificar a entrega.");
  }

  switch (input.name) {
    case "assumir_foco":
      return assumirFoco(tasks, state, input.taskId);
    case "registrar_progresso":
      return registrarPasso(tasks, state, input.taskId);
    case "registrar_evidencia":
      return registrarEvidencia(
        tasks,
        state,
        input.taskId,
        input.note ?? "",
        input.url ?? "",
        input.verified ?? false
      );
    case "concluir_entrega":
      if (!input.approved) {
        throw new Error("Conclusão exige aprovação humana explícita.");
      }

      return concluirEntrega(tasks, state, input.taskId);
    default:
      throw new Error("Ferramenta operacional desconhecida.");
  }
}

export function executarCopiloto(
  tasks: readonly Entrega[],
  state: EstadoOperacional,
  input: string
): RespostaCopiloto {
  const message = input.trim();
  const normalized = message.toLocaleLowerCase("pt-BR");
  const command = normalized.startsWith("/")
    ? normalized.split(/\s+/)[0]
    : normalized.includes("agora") || normalized.includes("próximo")
      ? "/agora"
      : normalized.includes("bom dia")
        ? "/bomdia"
        : normalized.includes("fechar")
          ? "/fechardia"
          : normalized.includes("replanej")
            ? "/replanejamento"
            : "/estado";
  const focus = focoAtual(tasks, state);
  const ready = filaPronta(tasks, state);
  const blocked = filaBloqueada(tasks, state);
  const snapshot = progresso(tasks, state);
  let reply: string;
  let requiresApproval = false;

  switch (command) {
    case "/bomdia":
      reply = focus
        ? `Bom dia. Faça agora: ${focus.title} (${focus.mins} min). Há ${ready.length} entrega(s) liberada(s) e ${blocked.length} bloqueada(s).`
        : "Bom dia. Todas as entregas disponíveis foram concluídas.";
      break;
    case "/agora":
      reply = focus
        ? `Faça agora: ${focus.title} [${focus.id}]. Próximo 1 por vez; dependências liberadas.`
        : "Nenhuma entrega liberada. Confira dependências e bloqueios.";
      break;
    case "/estado":
      reply = `Estado: ${state.done.length}/${tasks.length} entregas concluídas, ${snapshot.percentage}% do esforço, ${ready.length} pronta(s), ${blocked.length} bloqueada(s). Foco: ${focus?.title ?? "nenhum"}.`;
      break;
    case "/fechardia": {
      const proof = focus
        ? state.evidence.find(
            (evidence) => evidence.taskId === focus.id && evidence.verified
          )
        : undefined;

      if (!focus) {
        reply = "Dia fechado: não há entrega ativa.";
      } else if (!proof) {
        reply = `Dia fechado parcialmente. ${focus.title} permanece em execução; progresso preservado em ${state.started[focus.id] ?? 0} passo(s). Sem evidência verificada, não pode ser concluída.`;
      } else {
        reply = `${focus.title} possui evidência verificada. Confirme em Feito para concluir; o Copiloto não encerra entregas sem aprovação humana.`;
        requiresApproval = true;
      }

      break;
    }
    case "/replanejamento": {
      const requested = message.split(/\s+/)[1] ?? focus?.id;
      const affected = requested ? subgrafoAfetado(tasks, requested) : [];
      reply = requested
        ? `Replanejamento localizado em ${requested}: ${affected.length} entrega(s) no subgrafo afetado. O restante do plano permanece intacto.`
        : "Não há entrega ativa para replanejar.";
      break;
    }
    case "/mapa":
      reply = `Caminho: ${ready.length} entrega(s) podem começar; ${blocked.length} aguardam dependências reais.`;
      break;
    case "/evidencia":
      reply = focus
        ? `${state.evidence.filter((evidence) => evidence.taskId === focus.id).length} evidência(s) em ${focus.id}. Use Comprovar para registrar e verificar.`
        : "Nenhuma entrega ativa para receber evidência.";
      break;
    case "/bloqueio":
      reply = blocked[0]
        ? `${blocked[0].title} aguarda ${dependenciasPendentes(blocked[0], state).join(", ")}.`
        : "Não há entregas bloqueadas.";
      break;
    default:
      reply = "Comandos disponíveis: /bomdia, /agora, /estado, /fechardia, /replanejamento, /mapa, /evidencia e /bloqueio.";
  }

  return { command, reply, state, requiresApproval };
}
