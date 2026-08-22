const DELIVERY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const OPERATIONAL_DATE_PATTERN = /^\d{2}\/\d{2}$/;
const DEPENDENCY_SEPARATOR_PATTERN = /[|,]/;
const LINE_SEPARATOR_PATTERN = /\r?\n/;
const MARKDOWN_ITEM_PATTERN = /^[-*]\s+/;
const MARKDOWN_DELIVERY_PATTERN =
  /^[-*]\s+(?:\[([^\]]+)\]|([A-Za-z0-9_-]+))\s*[·:|-]?\s*(.+)$/;
const CREATE_PROJECT_MESSAGE_PATTERN = /^(criar|novo)\s+(projeto|plano)\s+/i;
const CREATE_PROJECT_PREFIX_PATTERN = /^(?:criar|novo)\s+(?:projeto|plano)\s+/i;
const ASSUME_FOCUS_PREFIX_PATTERN = /^assumir\s+(?:o\s+)?foco\s+/i;
const REGISTER_PROGRESS_MESSAGE_PATTERN =
  /^(?:registrar|marcar)\s+(?:um\s+)?(?:progresso|passo)/i;
const FINISH_MESSAGE_PREFIX_PATTERN = /^concluir\s+/i;
const REPLAN_MESSAGE_PREFIX_PATTERN = /^replanejar\s+/i;
const CREATE_PROJECT_COMMAND_PATTERN = /^\/(?:projeto|plano)\s+criar\s+(.+)$/is;
const RENAME_PROJECT_COMMAND_PATTERN =
  /^\/(?:projeto|plano)\s+renomear\s+(.+)$/is;
const SELECT_PROJECT_COMMAND_PATTERN = /^\/projeto\s+selecionar\s+(\S+)$/i;
const IMPORT_PLAN_COMMAND_PATTERN =
  /^\/plano\s+(importar|substituir)\s+([\s\S]+)$/i;
const CREATE_DELIVERY_COMMAND_PATTERN = /^\/entrega\s+criar\s+([\s\S]+)$/i;
const UPDATE_DELIVERY_COMMAND_PATTERN =
  /^\/entrega\s+atualizar\s+([A-Za-z0-9_-]+)\s+([\s\S]+)$/i;
const REMOVE_DELIVERY_COMMAND_PATTERN =
  /^\/entrega\s+remover\s+([A-Za-z0-9_-]+)$/i;
const FOCUS_COMMAND_PATTERN = /^\/foco\s+([A-Za-z0-9_-]+)$/i;
const PROGRESS_COMMAND_PATTERN = /^\/progresso(?:\s+([A-Za-z0-9_-]+))?$/i;
const EVIDENCE_COMMAND_PATTERN =
  /^\/evidencia\s+(registrar|verificar)\s+([\s\S]+)$/i;
const FINISH_COMMAND_PATTERN = /^\/concluir(?:\s+([A-Za-z0-9_-]+))?$/i;
const REPLAN_COMMAND_PATTERN =
  /^\/replanejamento\s+([A-Za-z0-9_-]+)(?:\s+([\s\S]+))?$/i;
const CAPACITY_COMMAND_PATTERN = /^\/capacidade\s+(\d+)$/i;
const WHITESPACE_PATTERN = /\s+/;

export type EstadoEntrega =
  | "BACKLOG_VALIDATED"
  | "READY"
  | "DOING"
  | "VERIFY"
  | "DONE"
  | "BLOCKED";

export interface Entrega {
  readonly date: string;
  readonly deps: readonly string[];
  readonly dod?: string;
  readonly front: string;
  readonly id: string;
  readonly mins: number;
  readonly stage: number;
  readonly title: string;
}

export interface Evidencia {
  readonly createdAt: string;
  readonly file?: ArquivoEvidencia;
  readonly note: string;
  readonly taskId: string;
  readonly url: string;
  readonly verified: boolean;
}

export interface ArquivoEvidencia {
  readonly data: string;
  readonly name: string;
  readonly size: number;
  readonly type: string;
}

export interface EventoOperacional {
  readonly action: string;
  readonly actor?: "humano" | "copiloto";
  readonly at: string;
  readonly fingerprint?: string;
  readonly humanApproved?: boolean;
  readonly organizationId: string;
  readonly projectId: string;
  readonly revision: number;
  readonly taskId: string | null;
  readonly tool?: string;
  readonly userId?: string;
}

export interface AtorOperacional {
  readonly displayName: string;
  readonly organizationId: string;
  readonly userId: string;
}

export interface PresencaOperacional {
  readonly displayName: string;
  readonly organizationId: string;
  readonly projectId: string;
  readonly seenAt: string;
  readonly taskId: string | null;
  readonly userId: string;
}

export interface ComentarioOperacional {
  readonly authorId: string;
  readonly authorName: string;
  readonly body: string;
  readonly createdAt: string;
  readonly id: string;
  readonly mentions: readonly string[];
  readonly organizationId: string;
  readonly projectId: string;
  readonly revision: number;
  readonly taskId: string;
}

export interface LeituraNotificacao {
  readonly id: string;
  readonly organizationId: string;
  readonly projectId: string;
  readonly readAt: string;
  readonly userId: string;
}

export interface ColaboracaoOperacional {
  readonly comments: readonly ComentarioOperacional[];
  readonly notificationReads: readonly LeituraNotificacao[];
  readonly presence: readonly PresencaOperacional[];
}

export interface ProgressoProjeto {
  readonly done: readonly string[];
  readonly evidence: readonly Evidencia[];
  readonly focus: string | null;
  readonly started: Readonly<Record<string, number>>;
}

export interface ProjetoOperacional {
  readonly dailyCapacityMinutes: number;
  readonly id: string;
  readonly name: string;
  readonly snapshot?: ProgressoProjeto;
  readonly tasks: readonly Entrega[];
}

export interface DiaOperacional {
  readonly capacityMinutes: number;
  readonly completedCount: number;
  readonly date: string;
  readonly overloaded: boolean;
  readonly plannedMinutes: number;
  readonly tasks: readonly Entrega[];
}

export interface CicloOperacional {
  readonly completedCount: number;
  readonly dates: readonly string[];
  readonly number: number;
  readonly taskCount: number;
}

export interface EnvelopeSincronizacao {
  readonly baseRevision: number;
  readonly events: readonly EventoOperacional[];
  readonly operationIds: readonly string[];
  readonly organizationId: string;
  readonly projectId: string;
  readonly revision: number;
}

export interface EstadoOperacional {
  readonly activeProjectId: string;
  readonly collaboration: ColaboracaoOperacional;
  readonly done: readonly string[];
  readonly events: readonly EventoOperacional[];
  readonly evidence: readonly Evidencia[];
  readonly focus: string | null;
  readonly organizationId: string;
  readonly projects: readonly ProjetoOperacional[];
  readonly revision: number;
  readonly started: Readonly<Record<string, number>>;
}

export interface RespostaCopiloto {
  readonly command: string;
  readonly reply: string;
  readonly requiresApproval: boolean;
  readonly state: EstadoOperacional;
}

export interface ContratoFerramenta {
  readonly effect: "read" | "reversible-write" | "relevant-write";
  readonly name: string;
  readonly purpose: string;
  readonly requiresApproval: boolean;
}

export interface EntradaFerramenta {
  readonly approved?: boolean;
  readonly changes?: Partial<Omit<Entrega, "id">>;
  readonly dailyCapacityMinutes?: number;
  readonly expectedRevision?: number;
  readonly importMode?: "append" | "replace";
  readonly name: string;
  readonly note?: string;
  readonly organizationId: string;
  readonly planContent?: string;
  readonly projectId?: string;
  readonly projectName?: string;
  readonly targetProjectId?: string;
  readonly task?: Entrega;
  readonly taskId?: string;
  readonly url?: string;
  readonly verified?: boolean;
}

export interface AprovacaoCopiloto {
  readonly expectedRevision: number;
  readonly id: string;
  readonly input: EntradaFerramenta;
  readonly organizationId: string;
  readonly projectId: string;
  readonly summary: string;
  readonly taskId: string | null;
  readonly tool: string;
}

export interface ResultadoAcaoCopiloto {
  readonly action: string;
  readonly affectedTaskIds: readonly string[];
  readonly approval: AprovacaoCopiloto | null;
  readonly reply: string;
  readonly state: EstadoOperacional;
}

export interface ResultadoReplanejamento {
  readonly affectedTaskIds: readonly string[];
  readonly state: EstadoOperacional;
}

export const LIMITES_COPILOTO = {
  maxSteps: 8,
  maxToolCalls: 8,
  maxInputCharacters: 25_000,
  maxPlanTasks: 500,
} as const;

export const FERRAMENTAS_OPERACIONAIS: readonly ContratoFerramenta[] = [
  {
    name: "consultar_estado",
    effect: "read",
    requiresApproval: false,
    purpose: "Ler foco, fila, progresso e bloqueios do estado canônico.",
  },
  {
    name: "criar_projeto",
    effect: "reversible-write",
    requiresApproval: false,
    purpose: "Criar um projeto operacional dentro da organização ativa.",
  },
  {
    name: "selecionar_projeto",
    effect: "reversible-write",
    requiresApproval: false,
    purpose: "Alternar projeto preservando foco, progresso e evidências.",
  },
  {
    name: "renomear_projeto",
    effect: "reversible-write",
    requiresApproval: false,
    purpose: "Atualizar o nome do projeto operacional ativo.",
  },
  {
    name: "criar_entrega",
    effect: "reversible-write",
    requiresApproval: false,
    purpose: "Criar entrega validando identificador, dependências e grafo.",
  },
  {
    name: "atualizar_entrega",
    effect: "reversible-write",
    requiresApproval: false,
    purpose: "Editar entrega sem quebrar dependências ou evidências.",
  },
  {
    name: "importar_plano",
    effect: "reversible-write",
    requiresApproval: false,
    purpose: "Acrescentar entregas válidas ao plano da organização ativa.",
  },
  {
    name: "replanejar_subgrafo",
    effect: "reversible-write",
    requiresApproval: false,
    purpose:
      "Alterar somente a raiz solicitada e identificar sucessores afetados.",
  },
  {
    name: "ajustar_capacidade",
    effect: "reversible-write",
    requiresApproval: false,
    purpose: "Ajustar capacidade diária dentro dos limites operacionais.",
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
    name: "substituir_plano",
    effect: "relevant-write",
    requiresApproval: true,
    purpose: "Substituir plano sem evidências apenas após aprovação humana.",
  },
  {
    name: "remover_entrega",
    effect: "relevant-write",
    requiresApproval: true,
    purpose: "Remover entrega sem sucessores somente após aprovação humana.",
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

export function novoEstado(
  organizationId: string,
  seed: readonly Entrega[] = []
): EstadoOperacional {
  if (!organizationId.trim()) {
    throw new Error("Organização ativa obrigatória.");
  }

  return {
    organizationId,
    projects: [
      {
        id: "sprint-principal",
        name: "Sprint Operacional",
        tasks: [...seed],
        dailyCapacityMinutes: 360,
      },
    ],
    activeProjectId: "sprint-principal",
    done: [],
    focus: null,
    evidence: [],
    started: {},
    collaboration: {
      presence: [],
      comments: [],
      notificationReads: [],
    },
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

function restaurarColaboracao(
  candidate: unknown,
  organizationId: string,
  projects: readonly ProjetoOperacional[]
): ColaboracaoOperacional {
  if (!candidate || typeof candidate !== "object") {
    return { presence: [], comments: [], notificationReads: [] };
  }

  const value = candidate as Partial<ColaboracaoOperacional>;
  const projectIds = new Set(projects.map((project) => project.id));
  const belongs = (
    item: unknown
  ): item is Record<string, unknown> & {
    organizationId: string;
    projectId: string;
  } =>
    Boolean(
      item &&
        typeof item === "object" &&
        "organizationId" in item &&
        item.organizationId === organizationId &&
        "projectId" in item &&
        typeof item.projectId === "string" &&
        projectIds.has(item.projectId)
    );

  return {
    presence: Array.isArray(value.presence)
      ? value.presence.filter(
          (item): item is PresencaOperacional =>
            belongs(item) &&
            typeof item.userId === "string" &&
            typeof item.displayName === "string" &&
            typeof item.seenAt === "string"
        )
      : [],
    comments: Array.isArray(value.comments)
      ? value.comments.filter(
          (item): item is ComentarioOperacional =>
            belongs(item) &&
            typeof item.id === "string" &&
            typeof item.taskId === "string" &&
            typeof item.authorId === "string" &&
            typeof item.body === "string" &&
            Array.isArray(item.mentions) &&
            item.mentions.every(
              (mention: unknown) => typeof mention === "string"
            )
        )
      : [],
    notificationReads: Array.isArray(value.notificationReads)
      ? value.notificationReads.filter(
          (item): item is LeituraNotificacao =>
            belongs(item) &&
            typeof item.id === "string" &&
            typeof item.userId === "string" &&
            typeof item.readAt === "string"
        )
      : [],
  };
}

export function restaurarEstado(
  raw: string | null,
  organizationId: string,
  seed: readonly Entrega[] = []
): EstadoOperacional {
  if (!raw) {
    return novoEstado(organizationId, seed);
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
      return novoEstado(organizationId, seed);
    }

    const state = candidate as EstadoOperacional;

    const defaults = novoEstado(organizationId, seed);
    const projects =
      Array.isArray(state.projects) && state.projects.length
        ? state.projects
        : defaults.projects;
    const activeProjectId = projects.some(
      (project) => project.id === state.activeProjectId
    )
      ? state.activeProjectId
      : defaults.activeProjectId;

    const events = Array.isArray(state.events)
      ? state.events
          .filter((event) => event.organizationId === organizationId)
          .map((event, index) => ({
            ...event,
            projectId:
              typeof event.projectId === "string"
                ? event.projectId
                : activeProjectId,
            revision: Number.isSafeInteger(event.revision)
              ? event.revision
              : index + 1,
          }))
      : [];

    return {
      ...defaults,
      ...state,
      organizationId,
      projects,
      activeProjectId,
      collaboration: restaurarColaboracao(
        state.collaboration,
        organizationId,
        projects
      ),
      events,
      started:
        state.started && typeof state.started === "object" ? state.started : {},
      revision: Number.isSafeInteger(state.revision) ? state.revision : 0,
    };
  } catch {
    return novoEstado(organizationId, seed);
  }
}

function registrar(
  state: EstadoOperacional,
  action: string,
  taskId: string | null,
  changes: Partial<EstadoOperacional>
): EstadoOperacional {
  const serialized = JSON.stringify({ action, taskId, changes });
  let fingerprint = 2_166_136_261;

  for (let index = 0; index < serialized.length; index += 1) {
    fingerprint = Math.imul(
      // biome-ignore lint/suspicious/noBitwiseOperators: FNV-1a exige XOR de 32 bits para manter fingerprints estáveis.
      fingerprint ^ serialized.charCodeAt(index),
      16_777_619
    );
  }

  return {
    ...state,
    ...changes,
    organizationId: state.organizationId,
    revision: state.revision + 1,
    events: [
      ...state.events,
      {
        organizationId: state.organizationId,
        projectId: changes.activeProjectId ?? state.activeProjectId,
        revision: state.revision + 1,
        action,
        taskId,
        at: new Date().toISOString(),
        actor: "humano",
        // biome-ignore lint/suspicious/noBitwiseOperators: o deslocamento converte o hash FNV-1a para uint32 sem alterar seu contrato.
        fingerprint: (fingerprint >>> 0).toString(16).padStart(8, "0"),
      },
    ],
  };
}

export function registrarEventoDistribuicao(
  state: EstadoOperacional,
  action:
    | "colaboracao.presenca"
    | "colaboracao.comentario"
    | "notificacao.lida",
  taskId: string | null,
  collaboration: ColaboracaoOperacional,
  userId: string
): EstadoOperacional {
  if (!userId.trim()) {
    throw new Error("A ação colaborativa exige identidade Clerk válida.");
  }

  const next = registrar(state, action, taskId, { collaboration });

  return {
    ...next,
    events: next.events.map((event) =>
      event.revision === next.revision ? { ...event, userId } : event
    ),
  };
}

export function projetoAtivo(state: EstadoOperacional): ProjetoOperacional {
  const project = state.projects.find(
    (candidate) => candidate.id === state.activeProjectId
  );

  if (!project) {
    throw new Error("Projeto ativo não encontrado na organização.");
  }

  return project;
}

export function entregasAtivas(state: EstadoOperacional): readonly Entrega[] {
  return projetoAtivo(state).tasks;
}

function slugProjeto(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "projeto"
  );
}

function validarEntrega(task: Entrega): void {
  if (!DELIVERY_ID_PATTERN.test(task.id)) {
    throw new Error("A entrega precisa de um identificador válido.");
  }

  if (!(task.title.trim() && task.front.trim())) {
    throw new Error("A entrega precisa de título e frente operacional.");
  }

  if (!OPERATIONAL_DATE_PATTERN.test(task.date)) {
    throw new Error("A data da entrega precisa estar no formato DD/MM.");
  }

  const [day, month] = task.date.split("/").map(Number);

  if (day < 1 || day > 31 || month < 1 || month > 12) {
    throw new Error("A data da entrega precisa representar um dia válido.");
  }

  if (!Number.isSafeInteger(task.mins) || task.mins <= 0) {
    throw new Error("O esforço da entrega precisa ser positivo.");
  }

  if (!Number.isSafeInteger(task.stage) || task.stage < 1 || task.stage > 4) {
    throw new Error("A etapa da entrega deve estar entre 1 e 4.");
  }

  if (new Set(task.deps).size !== task.deps.length) {
    throw new Error("A entrega não pode repetir dependências.");
  }

  if (task.dod !== undefined && !task.dod.trim()) {
    throw new Error("O critério de conclusão não pode ficar vazio.");
  }
}

export function validarGrafo(tasks: readonly Entrega[]): void {
  const byId = new Map<string, Entrega>();

  for (const task of tasks) {
    validarEntrega(task);

    if (byId.has(task.id)) {
      throw new Error(`Identificador de entrega duplicado: ${task.id}.`);
    }

    byId.set(task.id, task);
  }

  for (const task of tasks) {
    for (const dependency of task.deps) {
      if (!byId.has(dependency)) {
        throw new Error(
          `A entrega ${task.id} depende de uma entrega inexistente: ${dependency}.`
        );
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(taskId: string): void {
    if (visiting.has(taskId)) {
      throw new Error("As dependências não podem formar um ciclo.");
    }

    if (visited.has(taskId)) {
      return;
    }

    visiting.add(taskId);

    for (const dependency of byId.get(taskId)?.deps ?? []) {
      visit(dependency);
    }

    visiting.delete(taskId);
    visited.add(taskId);
  }

  for (const task of tasks) {
    visit(task.id);
  }
}

export function criarProjeto(
  state: EstadoOperacional,
  name: string,
  tasks: readonly Entrega[] = []
): EstadoOperacional {
  const title = name.trim();

  if (!title) {
    throw new Error("Informe um nome para o projeto.");
  }

  validarGrafo(tasks);

  const base = slugProjeto(title);
  let projectId = base;
  let suffix = 2;

  while (state.projects.some((project) => project.id === projectId)) {
    projectId = `${base}-${suffix}`;
    suffix += 1;
  }

  const project: ProjetoOperacional = {
    id: projectId,
    name: title,
    tasks: [...tasks],
    dailyCapacityMinutes: 360,
  };

  return registrar(state, "projeto.criado", null, {
    projects: [...state.projects, project],
  });
}

export function selecionarProjeto(
  state: EstadoOperacional,
  projectId: string
): EstadoOperacional {
  if (state.activeProjectId === projectId) {
    return state;
  }

  const target = state.projects.find((project) => project.id === projectId);

  if (!target) {
    throw new Error("Projeto não pertence à organização ativa.");
  }

  const currentSnapshot: ProgressoProjeto = {
    done: state.done,
    focus: state.focus,
    evidence: state.evidence,
    started: state.started,
  };
  const targetSnapshot = target.snapshot ?? {
    done: [],
    focus: null,
    evidence: [],
    started: {},
  };
  const projects = state.projects.map((project) => {
    if (project.id === state.activeProjectId) {
      return { ...project, snapshot: currentSnapshot };
    }

    if (project.id === projectId) {
      const { snapshot: _snapshot, ...active } = project;
      return active;
    }

    return project;
  });

  return registrar(state, "projeto.selecionado", null, {
    projects,
    activeProjectId: projectId,
    done: [...targetSnapshot.done],
    focus: targetSnapshot.focus,
    evidence: [...targetSnapshot.evidence],
    started: { ...targetSnapshot.started },
  });
}

export function renomearProjeto(
  state: EstadoOperacional,
  name: string
): EstadoOperacional {
  const title = name.trim();

  if (!title) {
    throw new Error("Informe um nome para o projeto.");
  }

  return registrar(state, "projeto.renomeado", null, {
    projects: state.projects.map((project) =>
      project.id === state.activeProjectId
        ? { ...project, name: title }
        : project
    ),
  });
}

export function atualizarCapacidadeProjeto(
  state: EstadoOperacional,
  dailyCapacityMinutes: number
): EstadoOperacional {
  if (
    !Number.isSafeInteger(dailyCapacityMinutes) ||
    dailyCapacityMinutes < 15 ||
    dailyCapacityMinutes > 1440
  ) {
    throw new Error("A capacidade diária deve estar entre 15 e 1440 minutos.");
  }

  return registrar(state, "projeto.capacidade_atualizada", null, {
    projects: state.projects.map((project) =>
      project.id === state.activeProjectId
        ? { ...project, dailyCapacityMinutes }
        : project
    ),
  });
}

function substituirEntregasProjeto(
  state: EstadoOperacional,
  tasks: readonly Entrega[],
  action: string,
  taskId: string | null
): EstadoOperacional {
  validarGrafo(tasks);

  const changed = registrar(state, action, taskId, {
    projects: state.projects.map((project) =>
      project.id === state.activeProjectId
        ? { ...project, tasks: [...tasks] }
        : project
    ),
  });

  if (
    changed.focus &&
    !filaPronta(tasks, changed).some((task) => task.id === changed.focus)
  ) {
    return { ...changed, focus: filaPronta(tasks, changed)[0]?.id ?? null };
  }

  return changed;
}

export function adicionarEntrega(
  state: EstadoOperacional,
  task: Entrega
): EstadoOperacional {
  return substituirEntregasProjeto(
    state,
    [...entregasAtivas(state), task],
    "entrega.criada",
    task.id
  );
}

export function editarEntrega(
  state: EstadoOperacional,
  taskId: string,
  changes: Partial<Omit<Entrega, "id">>
): EstadoOperacional {
  const tasks = entregasAtivas(state);
  const current = tasks.find((task) => task.id === taskId);

  if (!current) {
    throw new Error("Entrega não encontrada no projeto ativo.");
  }

  if (
    state.done.includes(taskId) &&
    changes.deps &&
    JSON.stringify(changes.deps) !== JSON.stringify(current.deps)
  ) {
    throw new Error("Dependências de uma entrega concluída não podem mudar.");
  }

  return substituirEntregasProjeto(
    state,
    tasks.map((task) =>
      task.id === taskId ? { ...task, ...changes, id: task.id } : task
    ),
    "entrega.editada",
    taskId
  );
}

export function removerEntrega(
  state: EstadoOperacional,
  taskId: string
): EstadoOperacional {
  const tasks = entregasAtivas(state);

  if (!tasks.some((task) => task.id === taskId)) {
    throw new Error("Entrega não encontrada no projeto ativo.");
  }

  if (state.done.includes(taskId)) {
    throw new Error("Uma entrega concluída não pode ser removida.");
  }

  if (state.evidence.some((proof) => proof.taskId === taskId)) {
    throw new Error("Uma entrega com evidências não pode ser removida.");
  }

  const successors = tasks.filter((task) => task.deps.includes(taskId));

  if (successors.length) {
    throw new Error(
      `Remova antes as dependências de ${successors.map((task) => task.id).join(", ")}.`
    );
  }

  return substituirEntregasProjeto(
    state,
    tasks.filter((task) => task.id !== taskId),
    "entrega.removida",
    taskId
  );
}

function normalizarImportacao(value: unknown): Entrega {
  if (!value || typeof value !== "object") {
    throw new Error("Cada entrega importada deve ser um objeto.");
  }

  const record = value as Record<string, unknown>;
  const rawDependencies =
    record.deps ?? record.dependencias ?? record.dependencies ?? [];
  const deps = Array.isArray(rawDependencies)
    ? rawDependencies.map(String)
    : String(rawDependencies)
        .split(DEPENDENCY_SEPARATOR_PATTERN)
        .map((dependency) => dependency.trim())
        .filter(Boolean);

  const dod = record.dod ?? record.criterio ?? record.conclui_quando;

  return {
    id: String(record.id ?? record.codigo ?? "").trim(),
    title: String(record.title ?? record.titulo ?? "").trim(),
    front: String(record.front ?? record.frente ?? "Operações").trim(),
    date: String(record.date ?? record.data ?? "").trim(),
    mins: Number(record.mins ?? record.minutos ?? record.minutes ?? 30),
    deps,
    stage: Number(record.stage ?? record.etapa ?? 1),
    ...(dod === undefined ? {} : { dod: String(dod).trim() }),
  };
}

function parseCsvRow(row: string, separator: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];

    if (character === '"' && row[index + 1] === '"' && quoted) {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === separator && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

function parseImportacao(
  content: string,
  organizationId: string
): readonly Entrega[] {
  const text = content.trim();

  if (!text) {
    throw new Error("O plano importado não pode estar vazio.");
  }

  if (text.startsWith("[") || text.startsWith("{")) {
    const parsed: unknown = JSON.parse(text);

    if (
      parsed &&
      !Array.isArray(parsed) &&
      typeof parsed === "object" &&
      "organizationId" in parsed &&
      parsed.organizationId !== organizationId
    ) {
      throw new Error("Não é permitido importar plano de outra organização.");
    }

    let records: unknown;

    if (Array.isArray(parsed)) {
      records = parsed;
    } else if (parsed && typeof parsed === "object") {
      const plan = parsed as Record<string, unknown>;
      records = plan.tasks ?? plan.entregas ?? plan.deliveries;
    }

    if (!Array.isArray(records)) {
      throw new Error("JSON de importação precisa conter tasks ou entregas.");
    }

    return records.map(normalizarImportacao);
  }

  const lines = text
    .split(LINE_SEPARATOR_PATTERN)
    .map((line) => line.trim())
    .filter(Boolean);
  const first = lines[0].toLocaleLowerCase("pt-BR");

  if (
    first.includes("id") &&
    (first.includes("titulo") || first.includes("title"))
  ) {
    const separator = lines[0].includes(";") ? ";" : ",";
    const headers = parseCsvRow(lines[0], separator).map((header) =>
      header.toLocaleLowerCase("pt-BR")
    );

    return lines.slice(1).map((line) => {
      const values = parseCsvRow(line, separator);
      return normalizarImportacao(
        Object.fromEntries(
          headers.map((header, index) => [header, values[index]])
        )
      );
    });
  }

  const tasks = lines
    .filter((line) => MARKDOWN_ITEM_PATTERN.test(line))
    .map((line) => {
      const match = line.match(MARKDOWN_DELIVERY_PATTERN);

      if (!match) {
        throw new Error("Linha Markdown inválida para importação de entrega.");
      }

      const [title, front, date, mins, deps, stage] = match[3]
        .split("|")
        .map((field) => field.trim());

      return normalizarImportacao({
        id: match[1] ?? match[2],
        title,
        front,
        date,
        mins,
        deps,
        stage,
      });
    });

  if (!tasks.length) {
    throw new Error(
      "Formato não reconhecido. Use JSON, CSV ou lista Markdown."
    );
  }

  return tasks;
}

export function importarPlano(
  state: EstadoOperacional,
  content: string,
  mode: "append" | "replace" = "append"
): EstadoOperacional {
  const imported = parseImportacao(content, state.organizationId);

  if (!imported.length) {
    throw new Error("O plano importado precisa conter ao menos uma entrega.");
  }

  if (mode === "replace" && (state.done.length || state.evidence.length)) {
    throw new Error(
      "Substituição proibida em projeto com conclusões ou evidências registradas."
    );
  }

  const tasks =
    mode === "replace" ? imported : [...entregasAtivas(state), ...imported];

  return substituirEntregasProjeto(state, tasks, "plano.importado", null);
}

export function exportarPlano(state: EstadoOperacional): string {
  const project = projetoAtivo(state);

  return JSON.stringify(
    {
      schema: "executar.plano.v1",
      organizationId: state.organizationId,
      projectId: project.id,
      name: project.name,
      tasks: project.tasks,
      execution: {
        done: state.done,
        focus: state.focus,
        evidence: state.evidence,
        started: state.started,
      },
      revision: state.revision,
    },
    null,
    2
  );
}

export function calendarioProjeto(state: EstadoOperacional): DiaOperacional[] {
  const project = projetoAtivo(state);
  const days = new Map<string, Entrega[]>();

  for (const task of project.tasks) {
    const current = days.get(task.date) ?? [];
    current.push(task);
    days.set(task.date, current);
  }

  return [...days.entries()]
    .sort(([left], [right]) => {
      const [leftDay, leftMonth] = left.split("/").map(Number);
      const [rightDay, rightMonth] = right.split("/").map(Number);
      return leftMonth - rightMonth || leftDay - rightDay;
    })
    .map(([date, tasks]) => {
      const plannedMinutes = tasks.reduce(
        (minutes, task) => minutes + task.mins,
        0
      );

      return {
        date,
        tasks,
        plannedMinutes,
        completedCount: tasks.filter((task) => state.done.includes(task.id))
          .length,
        capacityMinutes: project.dailyCapacityMinutes,
        overloaded: plannedMinutes > project.dailyCapacityMinutes,
      };
    });
}

export function ciclosProjeto(state: EstadoOperacional): CicloOperacional[] {
  const days = calendarioProjeto(state);
  const cycles: CicloOperacional[] = [];

  for (let index = 0; index < days.length; index += 3) {
    const period = days.slice(index, index + 3);
    cycles.push({
      number: Math.floor(index / 3) + 1,
      dates: period.map((day) => day.date),
      taskCount: period.reduce((count, day) => count + day.tasks.length, 0),
      completedCount: period.reduce(
        (count, day) => count + day.completedCount,
        0
      ),
    });
  }

  return cycles;
}

export function caminhoCritico(tasks: readonly Entrega[]): {
  readonly taskIds: readonly string[];
  readonly minutes: number;
} {
  validarGrafo(tasks);

  const byId = new Map(tasks.map((task) => [task.id, task]));
  const cache = new Map<string, { taskIds: string[]; minutes: number }>();

  function longest(task: Entrega): { taskIds: string[]; minutes: number } {
    const cached = cache.get(task.id);

    if (cached) {
      return cached;
    }

    let previous: { taskIds: string[]; minutes: number } = {
      taskIds: [],
      minutes: 0,
    };

    for (const dependency of task.deps) {
      const candidate = longest(byId.get(dependency) as Entrega);

      if (candidate.minutes > previous.minutes) {
        previous = candidate;
      }
    }

    const result = {
      taskIds: [...previous.taskIds, task.id],
      minutes: previous.minutes + task.mins,
    };
    cache.set(task.id, result);
    return result;
  }

  let critical: { taskIds: string[]; minutes: number } = {
    taskIds: [],
    minutes: 0,
  };

  for (const task of tasks) {
    const candidate = longest(task);

    if (candidate.minutes > critical.minutes) {
      critical = candidate;
    }
  }

  return critical;
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
  verified = false,
  file?: ArquivoEvidencia
): EstadoOperacional {
  const task = focoAtual(tasks, state);

  if (!task || task.id !== taskId) {
    throw new Error("Evidência permitida somente na entrega em foco.");
  }

  if (!(note.trim() || url.trim() || file)) {
    throw new Error("Informe uma evidência antes de concluir.");
  }

  if (url.trim()) {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("A evidência precisa usar uma URL HTTP ou HTTPS.");
    }
  }

  if (file) {
    if (!(file.name.trim() && file.data.startsWith("data:"))) {
      throw new Error("O arquivo da evidência precisa ser válido.");
    }

    if (!Number.isSafeInteger(file.size) || file.size > 2_500_000) {
      throw new Error("O arquivo da evidência deve ter no máximo 2,5 MB.");
    }
  }

  const evidence: Evidencia = {
    taskId,
    note: note.trim(),
    url: url.trim(),
    verified,
    createdAt: new Date().toISOString(),
    ...(file ? { file } : {}),
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

export function replanejarSubgrafo(
  state: EstadoOperacional,
  taskId: string,
  changes: Partial<Omit<Entrega, "id">>
): ResultadoReplanejamento {
  const tasks = entregasAtivas(state);
  const root = tasks.find((task) => task.id === taskId);

  if (!root) {
    throw new Error("A raiz do replanejamento não existe no projeto ativo.");
  }

  if (state.done.includes(taskId)) {
    throw new Error("Uma entrega concluída não pode ser replanejada.");
  }

  if (!Object.keys(changes).length) {
    throw new Error("Informe ao menos uma alteração para replanejar.");
  }

  const before = new Set(subgrafoAfetado(tasks, taskId).map((task) => task.id));
  const updated = tasks.map((task) =>
    task.id === taskId ? { ...task, ...changes, id: task.id } : task
  );
  const changed = substituirEntregasProjeto(
    state,
    updated,
    "plano.replanejado",
    taskId
  );
  const after = subgrafoAfetado(updated, taskId).map((task) => task.id);

  return {
    state: changed,
    affectedTaskIds: updated
      .filter((task) => before.has(task.id) || after.includes(task.id))
      .map((task) => task.id),
  };
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

  return state.events.filter(
    (event) =>
      event.organizationId === organizationId &&
      event.revision > revisionSincronizada
  );
}

export function prepararSincronizacao(
  state: EstadoOperacional,
  organizationId: string,
  revisionSincronizada = 0
): EnvelopeSincronizacao {
  const events = eventosPendentes(state, organizationId, revisionSincronizada);

  return {
    organizationId,
    projectId: state.activeProjectId,
    baseRevision: revisionSincronizada,
    revision: state.revision,
    operationIds: events.map(
      (event) => `${event.organizationId}:${event.projectId}:${event.revision}`
    ),
    events,
  };
}

export function reconciliarEstado(
  local: EstadoOperacional,
  remote: EstadoOperacional,
  revisionSincronizada: number
): {
  readonly status: "sincronizado" | "local" | "remoto" | "conflito";
  readonly state: EstadoOperacional;
} {
  if (local.organizationId !== remote.organizationId) {
    throw new Error("Reconciliação entre organizações diferentes é proibida.");
  }

  if (local.activeProjectId !== remote.activeProjectId) {
    return { status: "conflito", state: local };
  }

  if (
    local.revision === remote.revision &&
    JSON.stringify(local) === JSON.stringify(remote)
  ) {
    return { status: "sincronizado", state: local };
  }

  if (local.revision === revisionSincronizada) {
    return { status: "remoto", state: remote };
  }

  if (remote.revision === revisionSincronizada) {
    return { status: "local", state: local };
  }

  return { status: "conflito", state: local };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: o dispatcher central mantém autorização, aprovação e auditoria de todas as ferramentas juntas.
export function executarFerramenta(
  tasks: readonly Entrega[],
  state: EstadoOperacional,
  input: EntradaFerramenta
): EstadoOperacional {
  if (state.organizationId !== input.organizationId) {
    throw new Error("Ferramenta não pode operar em outra organização.");
  }

  if (input.projectId && input.projectId !== state.activeProjectId) {
    throw new Error("Ferramenta não pode operar em outro projeto.");
  }

  if (
    input.expectedRevision !== undefined &&
    input.expectedRevision !== state.revision
  ) {
    throw new Error("O estado mudou; revise a ação antes de executá-la.");
  }

  if (input.name === "consultar_estado") {
    return state;
  }

  const audit = (next: EstadoOperacional): EstadoOperacional => {
    if (entregasAtivas(next).length > LIMITES_COPILOTO.maxPlanTasks) {
      throw new Error(
        `O plano excede o limite de ${LIMITES_COPILOTO.maxPlanTasks} entregas do Copiloto.`
      );
    }

    return {
      ...next,
      events: next.events.map((event) =>
        event.revision > state.revision
          ? {
              ...event,
              actor: "copiloto" as const,
              tool: input.name,
              ...(input.approved ? { humanApproved: true } : {}),
            }
          : event
      ),
    };
  };

  const requireTask = (): string => {
    if (!input.taskId) {
      throw new Error("A ferramenta precisa identificar a entrega.");
    }

    return input.taskId;
  };

  switch (input.name) {
    case "criar_projeto":
      if (!input.projectName) {
        throw new Error("Informe o nome do projeto.");
      }

      return audit(criarProjeto(state, input.projectName));
    case "selecionar_projeto":
      if (!input.targetProjectId) {
        throw new Error("Informe o projeto a selecionar.");
      }

      return audit(selecionarProjeto(state, input.targetProjectId));
    case "renomear_projeto":
      if (!input.projectName) {
        throw new Error("Informe o novo nome do projeto.");
      }

      return audit(renomearProjeto(state, input.projectName));
    case "criar_entrega":
      if (!input.task) {
        throw new Error("Informe os dados completos da entrega.");
      }

      return audit(adicionarEntrega(state, input.task));
    case "atualizar_entrega":
      if (!(input.changes && Object.keys(input.changes).length)) {
        throw new Error("Informe as alterações da entrega.");
      }

      return audit(editarEntrega(state, requireTask(), input.changes));
    case "importar_plano":
      if (!input.planContent) {
        throw new Error("Informe o conteúdo do plano.");
      }

      return audit(importarPlano(state, input.planContent, "append"));
    case "substituir_plano":
      if (!input.approved) {
        throw new Error("Substituição exige aprovação humana explícita.");
      }

      if (!input.planContent) {
        throw new Error("Informe o conteúdo do plano.");
      }

      return audit(importarPlano(state, input.planContent, "replace"));
    case "remover_entrega":
      if (!input.approved) {
        throw new Error("Remoção exige aprovação humana explícita.");
      }

      return audit(removerEntrega(state, requireTask()));
    case "replanejar_subgrafo":
      if (!input.changes) {
        throw new Error("Informe as alterações do replanejamento.");
      }

      return audit(
        replanejarSubgrafo(state, requireTask(), input.changes).state
      );
    case "ajustar_capacidade":
      if (input.dailyCapacityMinutes === undefined) {
        throw new Error("Informe a capacidade diária em minutos.");
      }

      return audit(
        atualizarCapacidadeProjeto(state, input.dailyCapacityMinutes)
      );
    case "assumir_foco":
      return audit(assumirFoco(tasks, state, requireTask()));
    case "registrar_progresso":
      return audit(registrarPasso(tasks, state, requireTask()));
    case "registrar_evidencia":
      return audit(
        registrarEvidencia(
          tasks,
          state,
          requireTask(),
          input.note ?? "",
          input.url ?? "",
          input.verified ?? false
        )
      );
    case "concluir_entrega":
      if (!input.approved) {
        throw new Error("Conclusão exige aprovação humana explícita.");
      }

      return audit(concluirEntrega(tasks, state, requireTask()));
    default:
      throw new Error("Ferramenta operacional desconhecida.");
  }
}

function propostaAprovacao(
  state: EstadoOperacional,
  input: EntradaFerramenta,
  summary: string
): AprovacaoCopiloto {
  return {
    id: `${state.organizationId}:${state.activeProjectId}:${input.name}:${input.taskId ?? "projeto"}:${state.revision}`,
    organizationId: state.organizationId,
    projectId: state.activeProjectId,
    expectedRevision: state.revision,
    tool: input.name,
    taskId: input.taskId ?? null,
    summary,
    input,
  };
}

export function resolverAprovacaoCopiloto(
  state: EstadoOperacional,
  approval: AprovacaoCopiloto,
  approved: boolean
): ResultadoAcaoCopiloto {
  if (approval.organizationId !== state.organizationId) {
    throw new Error("A aprovação pertence a outra organização.");
  }

  if (approval.projectId !== state.activeProjectId) {
    throw new Error("A aprovação pertence a outro projeto.");
  }

  if (approval.expectedRevision !== state.revision) {
    throw new Error("A aprovação expirou porque o estado operacional mudou.");
  }

  const expectedId = `${approval.organizationId}:${approval.projectId}:${approval.tool}:${approval.taskId ?? "projeto"}:${approval.expectedRevision}`;
  const contract = FERRAMENTAS_OPERACIONAIS.find(
    (tool) => tool.name === approval.tool
  );

  if (
    approval.id !== expectedId ||
    !contract?.requiresApproval ||
    approval.input.name !== approval.tool ||
    approval.input.organizationId !== approval.organizationId ||
    approval.input.projectId !== approval.projectId ||
    approval.input.expectedRevision !== approval.expectedRevision ||
    (approval.input.taskId ?? null) !== approval.taskId ||
    approval.input.approved !== undefined
  ) {
    throw new Error(
      "Os dados da aprovação foram alterados ou não são válidos."
    );
  }

  if (!approved) {
    const denied = registrar(
      state,
      "copiloto.aprovacao_recusada",
      approval.taskId,
      {}
    );

    return {
      state: denied,
      reply: "Ação recusada. Nenhuma entrega ou plano foi alterado.",
      action: "aprovação recusada",
      affectedTaskIds: [],
      approval: null,
    };
  }

  const next = executarFerramenta(entregasAtivas(state), state, {
    ...approval.input,
    approved: true,
    expectedRevision: state.revision,
  });

  return {
    state: next,
    reply: `Ação aprovada e executada: ${approval.summary}`,
    action: approval.tool,
    affectedTaskIds: approval.taskId ? [approval.taskId] : [],
    approval: null,
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: preserva os contratos equivalentes de atualização JSON e textual no mesmo validador.
function alteracoesComando(fields: string): Partial<Omit<Entrega, "id">> {
  type AlteracoesMutaveis = {
    -readonly [Field in keyof Omit<Entrega, "id">]?: Omit<Entrega, "id">[Field];
  };
  const text = fields.trim();

  if (!text) {
    return {};
  }

  if (text.startsWith("{")) {
    const parsed: unknown = JSON.parse(text);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("As alterações precisam ser um objeto JSON.");
    }

    const data = parsed as Record<string, unknown>;
    const changes: AlteracoesMutaveis = {};

    if (data.title !== undefined || data.titulo !== undefined) {
      changes.title = String(data.title ?? data.titulo);
    }

    if (data.front !== undefined || data.frente !== undefined) {
      changes.front = String(data.front ?? data.frente);
    }

    if (data.date !== undefined || data.data !== undefined) {
      changes.date = String(data.date ?? data.data);
    }

    if (data.mins !== undefined || data.minutos !== undefined) {
      changes.mins = Number(data.mins ?? data.minutos);
    }

    if (data.stage !== undefined || data.etapa !== undefined) {
      changes.stage = Number(data.stage ?? data.etapa);
    }

    if (data.dod !== undefined || data.criterio !== undefined) {
      changes.dod = String(data.dod ?? data.criterio);
    }

    const dependencies = data.deps ?? data.dependencias;

    if (dependencies !== undefined) {
      changes.deps = Array.isArray(dependencies)
        ? dependencies.map(String)
        : String(dependencies)
            .split(",")
            .map((dependency) => dependency.trim())
            .filter(Boolean);
    }

    return changes;
  }

  const changes: AlteracoesMutaveis = {};

  for (const section of text.split("|")) {
    const equals = section.indexOf("=");

    if (equals < 0) {
      throw new Error(
        "Use campos no formato data=DD/MM | minutos=30 | dependencias=ID."
      );
    }

    const name = section.slice(0, equals).trim().toLocaleLowerCase("pt-BR");
    const value = section.slice(equals + 1).trim();

    switch (name) {
      case "titulo":
      case "title":
        changes.title = value;
        break;
      case "frente":
      case "front":
        changes.front = value;
        break;
      case "data":
      case "date":
        changes.date = value;
        break;
      case "minutos":
      case "mins":
        changes.mins = Number(value);
        break;
      case "etapa":
      case "stage":
        changes.stage = Number(value);
        break;
      case "criterio":
      case "dod":
        changes.dod = value;
        break;
      case "dependencias":
      case "deps":
        changes.deps = value
          .split(",")
          .map((dependency) => dependency.trim())
          .filter(Boolean);
        break;
      default:
        throw new Error(`Campo de atualização desconhecido: ${name}.`);
    }
  }

  return changes;
}

function normalizarMensagemCopiloto(message: string): string {
  const text = message.trim();

  if (CREATE_PROJECT_MESSAGE_PATTERN.test(text)) {
    return text.replace(CREATE_PROJECT_PREFIX_PATTERN, "/projeto criar ");
  }

  if (ASSUME_FOCUS_PREFIX_PATTERN.test(text)) {
    return text.replace(ASSUME_FOCUS_PREFIX_PATTERN, "/foco ");
  }

  if (REGISTER_PROGRESS_MESSAGE_PATTERN.test(text)) {
    return "/progresso";
  }

  if (FINISH_MESSAGE_PREFIX_PATTERN.test(text)) {
    return text.replace(FINISH_MESSAGE_PREFIX_PATTERN, "/concluir ");
  }

  if (REPLAN_MESSAGE_PREFIX_PATTERN.test(text)) {
    return text.replace(REPLAN_MESSAGE_PREFIX_PATTERN, "/replanejamento ");
  }

  return text;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: o roteamento canônico exige decisões explícitas de tenant, evidência e aprovação humana.
export function executarAcaoCopiloto(
  state: EstadoOperacional,
  input: string
): ResultadoAcaoCopiloto {
  if (input.length > LIMITES_COPILOTO.maxInputCharacters) {
    throw new Error("A mensagem excede o limite de segurança do Copiloto.");
  }

  const message = normalizarMensagemCopiloto(input);

  if (!message) {
    throw new Error("Informe uma mensagem para o Copiloto.");
  }

  const context = {
    organizationId: state.organizationId,
    projectId: state.activeProjectId,
    expectedRevision: state.revision,
  };
  const tasks = entregasAtivas(state);
  const apply = (
    action: EntradaFerramenta,
    reply: string,
    affectedTaskIds: readonly string[] = []
  ): ResultadoAcaoCopiloto => ({
    state: executarFerramenta(tasks, state, action),
    reply,
    action: action.name,
    affectedTaskIds,
    approval: null,
  });

  const createProject = message.match(CREATE_PROJECT_COMMAND_PATTERN);

  if (createProject) {
    const created = executarFerramenta(tasks, state, {
      ...context,
      name: "criar_projeto",
      projectName: createProject[1].trim(),
    });
    const project = created.projects.at(-1);

    if (!project) {
      throw new Error("O projeto criado não foi encontrado.");
    }
    const selected = executarFerramenta(entregasAtivas(created), created, {
      organizationId: created.organizationId,
      projectId: created.activeProjectId,
      expectedRevision: created.revision,
      name: "selecionar_projeto",
      targetProjectId: project.id,
    });

    return {
      state: selected,
      reply: `Projeto criado e selecionado: ${project.name}. Adicione entregas ou importe um plano.`,
      action: "criar_projeto",
      affectedTaskIds: [],
      approval: null,
    };
  }

  const renameProject = message.match(RENAME_PROJECT_COMMAND_PATTERN);

  if (renameProject) {
    return apply(
      {
        ...context,
        name: "renomear_projeto",
        projectName: renameProject[1].trim(),
      },
      `Projeto atualizado: ${renameProject[1].trim()}.`
    );
  }

  const selectProject = message.match(SELECT_PROJECT_COMMAND_PATTERN);

  if (selectProject) {
    return apply(
      {
        ...context,
        name: "selecionar_projeto",
        targetProjectId: selectProject[1],
      },
      `Projeto selecionado: ${selectProject[1]}.`
    );
  }

  const importPlan = message.match(IMPORT_PLAN_COMMAND_PATTERN);

  if (importPlan) {
    const replace = importPlan[1].toLocaleLowerCase("pt-BR") === "substituir";
    const action: EntradaFerramenta = {
      ...context,
      name: replace ? "substituir_plano" : "importar_plano",
      planContent: importPlan[2],
    };

    if (replace) {
      importarPlano(state, importPlan[2], "replace");
      const approval = propostaAprovacao(
        state,
        action,
        `substituir as ${tasks.length} entregas do projeto ${projetoAtivo(state).name}`
      );

      return {
        state,
        reply: "Substituir um plano exige confirmação humana explícita.",
        action: action.name,
        affectedTaskIds: [],
        approval,
      };
    }

    return apply(
      action,
      "Plano importado; filas e dependências foram atualizadas."
    );
  }

  const createTask = message.match(CREATE_DELIVERY_COMMAND_PATTERN);

  if (createTask) {
    const content = createTask[1].trim();
    let task: Entrega;

    if (content.startsWith("{")) {
      task = normalizarImportacao(JSON.parse(content));
    } else {
      const [id, title, front, date, mins, deps, stage, dod] = content
        .split("|")
        .map((field) => field.trim());
      task = normalizarImportacao({
        id,
        title,
        front,
        date,
        mins,
        deps,
        stage,
        dod,
      });
    }

    return apply(
      { ...context, name: "criar_entrega", task },
      `Entrega criada: ${task.id} — ${task.title}.`,
      [task.id]
    );
  }

  const updateTask = message.match(UPDATE_DELIVERY_COMMAND_PATTERN);

  if (updateTask) {
    const changes = alteracoesComando(updateTask[2]);

    return apply(
      {
        ...context,
        name: "atualizar_entrega",
        taskId: updateTask[1],
        changes,
      },
      `Entrega atualizada: ${updateTask[1]}.`,
      [updateTask[1]]
    );
  }

  const removeTask = message.match(REMOVE_DELIVERY_COMMAND_PATTERN);

  if (removeTask) {
    removerEntrega(state, removeTask[1]);
    const action: EntradaFerramenta = {
      ...context,
      name: "remover_entrega",
      taskId: removeTask[1],
    };

    return {
      state,
      reply: `Remover ${removeTask[1]} exige confirmação humana explícita.`,
      action: action.name,
      affectedTaskIds: [removeTask[1]],
      approval: propostaAprovacao(
        state,
        action,
        `remover a entrega ${removeTask[1]}`
      ),
    };
  }

  const focus = message.match(FOCUS_COMMAND_PATTERN);

  if (focus) {
    return apply(
      { ...context, name: "assumir_foco", taskId: focus[1] },
      `Foco assumido: ${focus[1]}. Próximo 1 por vez.`,
      [focus[1]]
    );
  }

  const progressCommand = message.match(PROGRESS_COMMAND_PATTERN);

  if (progressCommand) {
    const current = focoAtual(tasks, state);
    const taskId = progressCommand[1] ?? current?.id;

    if (!taskId) {
      throw new Error("Não há entrega liberada para registrar progresso.");
    }

    return apply(
      { ...context, name: "registrar_progresso", taskId },
      `Progresso registrado em ${taskId}; próximo passo preservado.`,
      [taskId]
    );
  }

  const evidence = message.match(EVIDENCE_COMMAND_PATTERN);

  if (evidence) {
    const current = focoAtual(tasks, state);

    if (!current) {
      throw new Error("Não há entrega ativa para registrar evidência.");
    }

    const verified = evidence[1].toLocaleLowerCase("pt-BR") === "verificar";

    return apply(
      {
        ...context,
        name: "registrar_evidencia",
        taskId: current.id,
        note: evidence[2].trim(),
        verified,
      },
      verified
        ? `Evidência verificada em ${current.id}; a conclusão ainda exige aprovação.`
        : `Evidência registrada em ${current.id}; a verificação ainda está pendente.`,
      [current.id]
    );
  }

  const finish = message.match(FINISH_COMMAND_PATTERN);

  if (finish) {
    const current = focoAtual(tasks, state);
    const taskId = finish[1] ?? current?.id;

    if (!taskId) {
      throw new Error("Não há entrega ativa para concluir.");
    }

    if (!current || current.id !== taskId) {
      throw new Error("Somente a entrega em foco pode solicitar conclusão.");
    }

    if (
      !state.evidence.some((proof) => proof.taskId === taskId && proof.verified)
    ) {
      throw new Error(
        "Conclusão bloqueada: informe evidência e verificação antes da aprovação."
      );
    }

    const action: EntradaFerramenta = {
      ...context,
      name: "concluir_entrega",
      taskId,
    };

    return {
      state,
      reply: `Aprovação necessária para concluir ${taskId}. Evidência e verificação estão presentes.`,
      action: action.name,
      affectedTaskIds: [taskId],
      approval: propostaAprovacao(
        state,
        action,
        `concluir a entrega ${taskId} — ${current.title}`
      ),
    };
  }

  const replan = message.match(REPLAN_COMMAND_PATTERN);

  if (replan?.[2]) {
    const changes = alteracoesComando(replan[2]);
    const affected = replanejarSubgrafo(state, replan[1], changes);

    return apply(
      {
        ...context,
        name: "replanejar_subgrafo",
        taskId: replan[1],
        changes,
      },
      `Replanejamento aplicado somente ao subgrafo de ${replan[1]}: ${affected.affectedTaskIds.join(", ")}.`,
      affected.affectedTaskIds
    );
  }

  const capacity = message.match(CAPACITY_COMMAND_PATTERN);

  if (capacity) {
    const minutes = Number(capacity[1]);

    return apply(
      {
        ...context,
        name: "ajustar_capacidade",
        dailyCapacityMinutes: minutes,
      },
      `Capacidade diária ajustada para ${minutes} minutos.`
    );
  }

  if (message.toLocaleLowerCase("pt-BR") === "/fechardia") {
    const focus = focoAtual(tasks, state);
    const verified = focus
      ? state.evidence.some(
          (evidence) => evidence.taskId === focus.id && evidence.verified
        )
      : false;

    if (focus && verified) {
      return executarAcaoCopiloto(state, `/concluir ${focus.id}`);
    }
  }

  const response = executarCopiloto(tasks, state, message);

  return {
    state: response.state,
    reply: response.reply,
    action: response.command,
    affectedTaskIds: [],
    approval: null,
  };
}

function identificarComandoCopiloto(normalized: string): string {
  if (normalized.startsWith("/")) {
    return normalized.split(WHITESPACE_PATTERN)[0];
  }

  if (normalized.includes("agora") || normalized.includes("próximo")) {
    return "/agora";
  }

  if (normalized.includes("bom dia")) {
    return "/bomdia";
  }

  if (normalized.includes("fechar")) {
    return "/fechardia";
  }

  return normalized.includes("replanej") ? "/replanejamento" : "/estado";
}

export function executarCopiloto(
  tasks: readonly Entrega[],
  state: EstadoOperacional,
  input: string
): RespostaCopiloto {
  const message = input.trim();
  const normalized = message.toLocaleLowerCase("pt-BR");
  const command = identificarComandoCopiloto(normalized);
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
        ? `AGORA: ${focus.id} — ${focus.title}. TEMPO: ${focus.mins} min. CONCLUI QUANDO: ${focus.dod ?? "resultado entregue e verificado"}. EVIDÊNCIA: comprovação registrada. PRÓXIMA: executar somente esta entrega.`
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
      } else if (proof) {
        reply = `${focus.title} possui evidência verificada. Confirme em Feito para concluir; o Copiloto não encerra entregas sem aprovação humana.`;
        requiresApproval = true;
      } else {
        reply = `Dia fechado parcialmente. ${focus.title} permanece em execução; progresso preservado em ${state.started[focus.id] ?? 0} passo(s). Sem evidência verificada, não pode ser concluída.`;
      }

      break;
    }
    case "/replanejamento": {
      const requested = message.split(WHITESPACE_PATTERN)[1] ?? focus?.id;
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
      reply =
        "Comandos disponíveis: /bomdia, /agora, /estado, /fechardia, /replanejamento, /mapa, /evidencia e /bloqueio.";
  }

  return { command, reply, state, requiresApproval };
}
