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
  readonly file?: ArquivoEvidencia;
}

export interface ArquivoEvidencia {
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly data: string;
}

export interface EventoOperacional {
  readonly organizationId: string;
  readonly projectId: string;
  readonly revision: number;
  readonly action: string;
  readonly taskId: string | null;
  readonly at: string;
}

export interface ProgressoProjeto {
  readonly done: readonly string[];
  readonly focus: string | null;
  readonly evidence: readonly Evidencia[];
  readonly started: Readonly<Record<string, number>>;
}

export interface ProjetoOperacional {
  readonly id: string;
  readonly name: string;
  readonly tasks: readonly Entrega[];
  readonly dailyCapacityMinutes: number;
  readonly snapshot?: ProgressoProjeto;
}

export interface DiaOperacional {
  readonly date: string;
  readonly tasks: readonly Entrega[];
  readonly plannedMinutes: number;
  readonly completedCount: number;
  readonly capacityMinutes: number;
  readonly overloaded: boolean;
}

export interface CicloOperacional {
  readonly number: number;
  readonly dates: readonly string[];
  readonly taskCount: number;
  readonly completedCount: number;
}

export interface EnvelopeSincronizacao {
  readonly organizationId: string;
  readonly projectId: string;
  readonly baseRevision: number;
  readonly revision: number;
  readonly operationIds: readonly string[];
  readonly events: readonly EventoOperacional[];
}

export interface EstadoOperacional {
  readonly organizationId: string;
  readonly projects: readonly ProjetoOperacional[];
  readonly activeProjectId: string;
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
      },
    ],
  };
}

export function projetoAtivo(
  state: EstadoOperacional
): ProjetoOperacional {
  const project = state.projects.find(
    (candidate) => candidate.id === state.activeProjectId
  );

  if (!project) {
    throw new Error("Projeto ativo não encontrado na organização.");
  }

  return project;
}

export function entregasAtivas(
  state: EstadoOperacional
): readonly Entrega[] {
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
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(task.id)) {
    throw new Error("A entrega precisa de um identificador válido.");
  }

  if (!(task.title.trim() && task.front.trim())) {
    throw new Error("A entrega precisa de título e frente operacional.");
  }

  if (!/^\d{2}\/\d{2}$/.test(task.date)) {
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
}

export function validarGrafo(
  tasks: readonly Entrega[]
): void {
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
        .split(/[|,]/)
        .map((dependency) => dependency.trim())
        .filter(Boolean);

  return {
    id: String(record.id ?? record.codigo ?? "").trim(),
    title: String(record.title ?? record.titulo ?? "").trim(),
    front: String(record.front ?? record.frente ?? "Operações").trim(),
    date: String(record.date ?? record.data ?? "").trim(),
    mins: Number(record.mins ?? record.minutos ?? record.minutes ?? 30),
    deps,
    stage: Number(record.stage ?? record.etapa ?? 1),
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

    const records = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>).tasks ??
          (parsed as Record<string, unknown>).entregas ??
          (parsed as Record<string, unknown>).deliveries
        : undefined;

    if (!Array.isArray(records)) {
      throw new Error("JSON de importação precisa conter tasks ou entregas.");
    }

    return records.map(normalizarImportacao);
  }

  const lines = text
    .split(/\r?\n/)
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
        Object.fromEntries(headers.map((header, index) => [header, values[index]]))
      );
    });
  }

  const tasks = lines
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => {
      const match = line.match(
        /^[-*]\s+(?:\[([^\]]+)\]|([A-Za-z0-9_-]+))\s*[·:|-]?\s*(.+)$/
      );

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
    throw new Error("Formato não reconhecido. Use JSON, CSV ou lista Markdown.");
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

export function exportarPlano(
  state: EstadoOperacional
): string {
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

export function calendarioProjeto(
  state: EstadoOperacional
): DiaOperacional[] {
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

export function ciclosProjeto(
  state: EstadoOperacional
): CicloOperacional[] {
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

export function caminhoCritico(
  tasks: readonly Entrega[]
): {
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
    if (!file.name.trim() || !file.data.startsWith("data:")) {
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
  const events = eventosPendentes(
    state,
    organizationId,
    revisionSincronizada
  );

  return {
    organizationId,
    projectId: state.activeProjectId,
    baseRevision: revisionSincronizada,
    revision: state.revision,
    operationIds: events.map(
      (event) =>
        `${event.organizationId}:${event.projectId}:${event.revision}`
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
