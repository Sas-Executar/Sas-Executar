"use client";

import {
  Bolt,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  FileCheck2,
  FileText,
  Folder,
  FolderKanban,
  Home,
  Link2,
  ListChecks,
  LockKeyhole,
  MapPin,
  Menu,
  MessageCircle,
  Paperclip,
  Printer,
  RefreshCw,
  ScanLine,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  type DiaOperacional,
  dependenciasPendentes,
  type Entrega,
  type EstadoOperacional,
  estadoEntrega,
  type ProjetoOperacional,
  ROTULOS_ESTADO,
} from "@/lib/executar/domain";

export type ProductView =
  | "home"
  | "today"
  | "tomorrow"
  | "now"
  | "done"
  | "replan"
  | "overview"
  | "calendar"
  | "path"
  | "documents";

export type TaskFace = "principal" | "contexto" | "evidencia";

const NAVIGATION = [
  { id: "today", label: "Hoje", icon: Home },
  { id: "tomorrow", label: "Amanhã", icon: CalendarDays },
  { id: "now", label: "Agora", icon: Bolt },
  { id: "done", label: "Feito", icon: CheckCircle2 },
  { id: "replan", label: "Re-Plan", icon: RefreshCw },
] as const satisfies ReadonlyArray<{
  id: ProductView;
  label: string;
  icon: typeof Home;
}>;

export function ExecutarBrand({
  compact = false,
}: {
  readonly compact?: boolean;
}) {
  return (
    <span className={`executarBrand ${compact ? "compact" : ""}`}>
      <Image
        alt=""
        aria-hidden="true"
        height={compact ? 38 : 46}
        priority
        src="/brand/executar-mark.png"
        width={compact ? 38 : 46}
      />
      <span>EXECUTAR</span>
    </span>
  );
}

interface MobileProductHeaderProperties {
  readonly activeModeLabel: string;
  readonly menuOpen: boolean;
  readonly modelSelectorOpen: boolean;
  readonly onHome: () => void;
  readonly onMenuToggle: () => void;
  readonly onModelToggle: () => void;
}

export function MobileProductHeader({
  activeModeLabel,
  menuOpen,
  modelSelectorOpen,
  onHome,
  onMenuToggle,
  onModelToggle,
}: MobileProductHeaderProperties) {
  return (
    <header className="executarProductHeader">
      <button
        aria-expanded={menuOpen}
        aria-label="Abrir outras funções"
        className="executarHeaderCircle"
        onClick={onMenuToggle}
        type="button"
      >
        <Menu aria-hidden="true" />
      </button>
      <button
        aria-label="Ir para o início"
        className="executarHeaderBrand"
        onClick={onHome}
        type="button"
      >
        <ExecutarBrand compact />
      </button>
      <button
        aria-expanded={modelSelectorOpen}
        aria-label={`Trocar modelo do Copiloto. Atual: ${activeModeLabel}`}
        className="executarHeaderCircle"
        onClick={onModelToggle}
        type="button"
      >
        <Sparkles aria-hidden="true" />
      </button>
    </header>
  );
}

interface OperationalNavigationProperties {
  readonly activeView: ProductView;
  readonly hidden?: boolean;
  readonly onSelect: (view: ProductView) => void;
}

export function OperationalNavigation({
  activeView,
  hidden = false,
  onSelect,
}: OperationalNavigationProperties) {
  if (hidden) {
    return null;
  }

  return (
    <nav aria-label="Navegação operacional" className="executarOperationalNav">
      {NAVIGATION.map(({ icon: Icon, id, label }) => {
        const active = activeView === id;

        return (
          <button
            aria-current={active ? "page" : undefined}
            className={`${active ? "active" : ""} ${id === "now" ? "now" : ""}`}
            key={id}
            onClick={() => onSelect(id)}
            type="button"
          >
            <span>
              <Icon aria-hidden="true" />
            </span>
            <small>{label}</small>
          </button>
        );
      })}
    </nav>
  );
}

interface SprintProgressProperties {
  readonly state: EstadoOperacional;
  readonly tasks: readonly Entrega[];
}

export function SprintProgress({ state, tasks }: SprintProgressProperties) {
  const doneCount = tasks.filter((task) => state.done.includes(task.id)).length;
  const total = tasks.length;
  const percentage = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <section
      aria-label={`Sprint: ${doneCount} de ${total} tarefas concluídas, ${percentage}%`}
      className="executarSprint"
    >
      <b>Sprint</b>
      <div aria-hidden="true" className="executarSprintSegments">
        {tasks.map((task) => (
          <span
            className={state.done.includes(task.id) ? "done" : ""}
            key={task.id}
          />
        ))}
      </div>
      <div>
        <strong>
          {doneCount} / {total}
        </strong>
        <small>{percentage}%</small>
      </div>
    </section>
  );
}

interface HomeSurfaceProperties {
  readonly documentCount: number;
  readonly firstName: string;
  readonly onCopilot: () => void;
  readonly onDocuments: () => void;
  readonly onProjects: () => void;
  readonly onScanner: () => void;
  readonly progress: number;
  readonly projectCount: number;
}

export function HomeSurface({
  documentCount,
  firstName,
  onCopilot,
  onDocuments,
  onProjects,
  onScanner,
  progress,
  projectCount,
}: HomeSurfaceProperties) {
  return (
    <section className="executarHomeSurface">
      <div className="executarHomeIntro">
        <ExecutarBrand />
        <div>
          <p>Olá, {firstName}</p>
          <h1>O que você vai construir hoje?</h1>
        </div>
      </div>
      <div className="executarContextCards">
        <button
          className="executarContextCard projects"
          onClick={onProjects}
          type="button"
        >
          <header>
            <span>
              <FolderKanban aria-hidden="true" />
              <b>Projetos</b>
            </span>
            <span>
              {projectCount} {projectCount === 1 ? "ativo" : "ativos"}
              <ChevronRight aria-hidden="true" />
            </span>
          </header>
          <div>
            <p>Planeje, acompanhe e entregue.</p>
            <span className="executarMiniProgress">
              <i style={{ width: `${progress}%` }} />
            </span>
            <strong>{progress}% de progresso</strong>
          </div>
        </button>
        <button
          className="executarContextCard documents"
          onClick={onDocuments}
          type="button"
        >
          <header>
            <span>
              <FileText aria-hidden="true" />
              <b>Documentos</b>
            </span>
            <span>
              {documentCount} registros
              <ChevronRight aria-hidden="true" />
            </span>
          </header>
          <div>
            <p>Seus projetos e listas.</p>
            <span className="executarDocumentChips">
              <small>Projetos</small>
              <small>Listas</small>
              <small>Recentes</small>
            </span>
          </div>
        </button>
        <button
          className="executarContextCard copilot"
          onClick={onCopilot}
          type="button"
        >
          <header>
            <span>
              <MessageCircle aria-hidden="true" />
              <b>Copiloto Chat</b>
            </span>
            <span>
              IA assistente
              <ChevronRight aria-hidden="true" />
            </span>
          </header>
          <div>
            <p>Converse, planeje, resolva.</p>
            <span className="executarCopilotPrompt">
              <Sparkles aria-hidden="true" /> Como posso ajudar?
            </span>
          </div>
        </button>
        <button
          className="executarContextCard scanner"
          onClick={onScanner}
          type="button"
        >
          <header>
            <span>
              <ScanLine aria-hidden="true" />
              <b>Scanner</b>
            </span>
            <span>
              Câmera
              <ChevronRight aria-hidden="true" />
            </span>
          </header>
          <div>
            <p>Aponte para o Prisma/Tripé e execute.</p>
            <span className="executarCopilotPrompt">
              <ScanLine aria-hidden="true" /> Entrada, Feito, Saída…
            </span>
          </div>
        </button>
      </div>
    </section>
  );
}

interface TimelineSurfaceProperties {
  readonly day: DiaOperacional | undefined;
  readonly emptyMessage: string;
  readonly focusId: string | null;
  readonly heading: string;
  readonly onFocus: (taskId: string) => void;
  readonly state: EstadoOperacional;
}

export function TimelineSurface({
  day,
  emptyMessage,
  focusId,
  heading,
  onFocus,
  state,
}: TimelineSurfaceProperties) {
  if (!day) {
    return <EmptySurface message={emptyMessage} title={heading} />;
  }

  return (
    <section className="executarTimelineSurface">
      <header>
        <small>{day.date}</small>
        <h1>{heading}</h1>
        <p>
          {day.completedCount} de {day.tasks.length} tarefas concluídas ·{" "}
          {day.plannedMinutes} min planejados
        </p>
      </header>
      <div className="executarTimeline">
        {day.tasks.map((task) => {
          const status = estadoEntrega(task, state);
          const active = task.id === focusId && status !== "DONE";
          const available = status !== "BLOCKED" && status !== "DONE";

          return (
            <article
              className={`${active ? "active" : ""} ${status === "DONE" ? "done" : ""}`}
              key={task.id}
            >
              <span aria-hidden="true" className="executarTimelinePoint">
                {status === "DONE" ? <Check /> : <Circle />}
              </span>
              <button
                disabled={!available}
                onClick={() => onFocus(task.id)}
                type="button"
              >
                <div>
                  <span className="executarTaskIcon">
                    {active ? (
                      <Bolt aria-hidden="true" />
                    ) : (
                      <ListChecks aria-hidden="true" />
                    )}
                  </span>
                  <span>
                    <b>{task.title}</b>
                    <small>
                      {status === "BLOCKED"
                        ? `Aguarda ${dependenciasPendentes(task, state).join(", ")}`
                        : `${task.front} · ${ROTULOS_ESTADO[status]}`}
                    </small>
                  </span>
                </div>
                <time>{task.mins} min</time>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

interface FocusSurfaceProperties {
  readonly face: TaskFace;
  readonly focus: Entrega | null;
  readonly onConcluir: () => void;
  readonly onFaceChange: (face: TaskFace) => void;
  readonly onFocus: (taskId: string) => void;
  readonly onOpenEvidence: () => void;
  readonly onReplan: () => void;
  readonly onStart: () => void;
  readonly projectName: string;
  readonly state: EstadoOperacional;
  readonly tasks: readonly Entrega[];
}

type ExecutionContext = "day" | "workflow" | "week" | "cycle";

const EXECUTION_CONTEXT_LABELS: Record<ExecutionContext, string> = {
  day: "Hoje",
  workflow: "Workflow",
  week: "Semana",
  cycle: "Ciclo",
};

export function FocusSurface({
  face,
  focus,
  onConcluir,
  onFaceChange,
  onFocus,
  onOpenEvidence,
  onReplan,
  onStart,
  projectName,
  state,
  tasks,
}: FocusSurfaceProperties) {
  const [context, setContext] = useState<ExecutionContext>("workflow");

  const visibleTasks = useMemo(() => {
    if (!focus) {
      return tasks;
    }

    if (context === "day") {
      return tasks.filter((task) => task.date === focus.date);
    }

    if (context === "cycle") {
      return tasks.filter((task) => task.front === focus.front);
    }

    return tasks;
  }, [context, focus, tasks]);

  if (!focus) {
    return (
      <EmptySurface
        message="Não existe outra tarefa liberada neste momento."
        title="Fase concluída"
      />
    );
  }

  const contextTasks = visibleTasks.length ? visibleTasks : [focus];
  const totalCount = contextTasks.length;
  const doneCount = contextTasks.filter((task) =>
    state.done.includes(task.id)
  ).length;
  const currentPosition = Math.max(
    1,
    contextTasks.findIndex((task) => task.id === focus.id) + 1
  );
  const progress = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const steps = Math.max(1, Math.ceil(focus.mins / 15));
  const completedSteps = state.started[focus.id] ?? 0;
  const evidence = state.evidence.filter((item) => item.taskId === focus.id);
  const readyTasks = tasks.filter(
    (task) => task.id !== focus.id && estadoEntrega(task, state) === "READY"
  );
  const blockedTasks = tasks.filter(
    (task) => estadoEntrega(task, state) === "BLOCKED"
  );
  const taskById = new Map(tasks.map((task) => [task.id, task]));

  function reveal(sectionId: string, nextFace: TaskFace) {
    onFaceChange(nextFace);
    document.getElementById(sectionId)?.scrollIntoView({ block: "start" });
  }

  return (
    <section
      className="executarFocusSurface executarExecutionSurface"
      data-active-face={face}
    >
      <article className="executarExecutionHero">
        <header className="executarExecutionHeader">
          <label>
            <span>Contexto</span>
            <select
              aria-label="Selecionar contexto de execução"
              onChange={(event) =>
                setContext(event.target.value as ExecutionContext)
              }
              value={context}
            >
              {Object.entries(EXECUTION_CONTEXT_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span>{projectName}</span>
            <strong>
              {doneCount} de {totalCount}
            </strong>
          </div>
        </header>

        <div className="executarExecutionGauge">
          <svg
            aria-label={`${doneCount} de ${totalCount} ações concluídas, ${progress}%`}
            aria-valuemax={totalCount}
            aria-valuemin={0}
            aria-valuenow={doneCount}
            className="executarExecutionArc"
            role="progressbar"
            viewBox="0 0 224 128"
          >
            {contextTasks.map((task, index) => {
              const segmentLength = Math.max(3, 100 / totalCount - 2.4);
              let status: "current" | "done" | "pending" = "pending";

              if (state.done.includes(task.id)) {
                status = "done";
              } else if (task.id === focus.id) {
                status = "current";
              }

              return (
                <path
                  className={status}
                  d="M 18 112 A 94 94 0 0 1 206 112"
                  key={task.id}
                  pathLength="100"
                  strokeDasharray={`${segmentLength} ${100 - segmentLength}`}
                  strokeDashoffset={-(index * (100 / totalCount) + 1.2)}
                />
              );
            })}
          </svg>
          <button
            aria-label={`Concluir: ${focus.title}`}
            className="executarExecutionDone"
            onClick={onConcluir}
            title="Concluir tarefa"
            type="button"
          >
            <Check aria-hidden="true" />
          </button>
        </div>

        <div className="executarExecutionCurrent">
          <small>
            MODO FOCO · AÇÃO {String(currentPosition).padStart(2, "0")} ·{" "}
            {progress}% CONCLUÍDO
          </small>
          <h1>{focus.title}</h1>
          <p>
            {focus.front} · {focus.mins} min
          </p>
        </div>

        <button
          aria-label="Rolar para os detalhes da tarefa"
          className="executarExecutionScrollCue"
          onClick={() => reveal("execucao-agora", "principal")}
          title="Ver detalhes"
          type="button"
        >
          <ChevronDown aria-hidden="true" />
        </button>
      </article>

      <div className="executarExecutionStory">
        <section
          className="executarStorySection executarStoryCurrent"
          id="execucao-agora"
        >
          <header>
            <span>01</span>
            <div>
              <small>AGORA</small>
              <h2>Avance uma ação por vez.</h2>
            </div>
          </header>
          <p className="executarStoryTaskTitle">{focus.title}</p>
          <div className="executarStoryFacts">
            <span>
              <b>{completedSteps}</b>
              <small>de {steps} passos</small>
            </span>
            <span>
              <b>{focus.mins}</b>
              <small>minutos</small>
            </span>
            <span>
              <b>{evidence.length}</b>
              <small>evidências</small>
            </span>
          </div>
          <p className="executarStoryDefinition">
            <FileCheck2 aria-hidden="true" />
            <span>
              <small>CONCLUI QUANDO</small>
              <b>
                {focus.dod ??
                  "A entrega estiver comprovada por evidência verificada."}
              </b>
            </span>
          </p>
          <div className="executarIconActions">
            <span>
              <button
                aria-label="Registrar avanço"
                onClick={onStart}
                title="Registrar avanço"
                type="button"
              >
                <Bolt aria-hidden="true" />
              </button>
              <small>Avançar</small>
            </span>
            <span>
              <button
                aria-label="Ver contexto"
                onClick={() => reveal("execucao-contexto", "contexto")}
                title="Ver contexto"
                type="button"
              >
                <ListChecks aria-hidden="true" />
              </button>
              <small>Contexto</small>
            </span>
            <span>
              <button
                aria-label="Ver evidências"
                onClick={() => reveal("execucao-evidencia", "evidencia")}
                title="Ver evidências"
                type="button"
              >
                <Paperclip aria-hidden="true" />
              </button>
              <small>Evidência</small>
            </span>
            <span>
              <button
                aria-label="Replanejar tarefa"
                onClick={onReplan}
                title="Replanejar tarefa"
                type="button"
              >
                <RefreshCw aria-hidden="true" />
              </button>
              <small>Replanejar</small>
            </span>
          </div>
        </section>

        <section className="executarStorySection">
          <header>
            <span>02</span>
            <div>
              <small>DEPOIS</small>
              <h2>As próximas ações, sem abreviação.</h2>
            </div>
          </header>
          <div className="executarReadableTasks">
            {readyTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => onFocus(task.id)}
                type="button"
              >
                <span className="executarReadableTaskIcon">
                  <ListChecks aria-hidden="true" />
                </span>
                <span>
                  <b>{task.title}</b>
                  <small>
                    {task.front} · {task.date} · {task.mins} min
                  </small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            ))}
            {!readyTasks.length && (
              <p className="executarStoryEmpty">
                Nenhuma outra ação está liberada agora.
              </p>
            )}
          </div>
        </section>

        <section className="executarStorySection">
          <header>
            <span>03</span>
            <div>
              <small>BLOQUEIOS</small>
              <h2>O que ainda depende de outra entrega.</h2>
            </div>
          </header>
          <div className="executarBlockedTasks">
            {blockedTasks.map((task) => {
              const pending = dependenciasPendentes(task, state);

              return (
                <article key={task.id}>
                  <LockKeyhole aria-hidden="true" />
                  <span>
                    <b>{task.title}</b>
                    <small>
                      Aguarda{" "}
                      {pending
                        .map((id) => taskById.get(id)?.title ?? id)
                        .join(", ")}
                    </small>
                  </span>
                </article>
              );
            })}
            {!blockedTasks.length && (
              <p className="executarStoryEmpty">
                Nenhum bloqueio neste workflow.
              </p>
            )}
          </div>
        </section>

        <section className="executarStorySection" id="execucao-contexto">
          <header>
            <span>04</span>
            <div>
              <small>CONTEXTO</small>
              <h2>Detalhes para decidir sem perder o foco.</h2>
            </div>
          </header>
          <dl className="executarExecutionContext">
            <div>
              <FolderKanban aria-hidden="true" />
              <dt>Projeto</dt>
              <dd>{projectName}</dd>
            </div>
            <div>
              <Wrench aria-hidden="true" />
              <dt>Frente</dt>
              <dd>{focus.front}</dd>
            </div>
            <div>
              <MapPin aria-hidden="true" />
              <dt>Entrega</dt>
              <dd>{focus.date}</dd>
            </div>
            <div>
              <Link2 aria-hidden="true" />
              <dt>Dependências</dt>
              <dd>
                {focus.deps.length
                  ? focus.deps
                      .map((id) => taskById.get(id)?.title ?? id)
                      .join(", ")
                  : "Livre para começar"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="executarStorySection" id="execucao-evidencia">
          <header>
            <span>05</span>
            <div>
              <small>EVIDÊNCIA</small>
              <h2>A memória verificável desta entrega.</h2>
            </div>
          </header>
          <div className="executarEvidenceStack">
            {evidence.map((item) => (
              <article key={`${item.taskId}-${item.createdAt}`}>
                <FileCheck2 aria-hidden="true" />
                <span>
                  <b>{item.note || item.file?.name || "Referência salva"}</b>
                  <small>
                    {item.verified ? "Verificada" : "Aguardando verificação"}
                  </small>
                </span>
              </article>
            ))}
            {!evidence.length && (
              <p className="executarStoryEmpty">
                Nenhuma evidência registrada ainda.
              </p>
            )}
          </div>
          <button
            className="executarEvidenceAdd"
            onClick={onOpenEvidence}
            type="button"
          >
            <Paperclip aria-hidden="true" /> Adicionar evidência
          </button>
        </section>
      </div>
    </section>
  );
}

interface DoneSurfaceProperties {
  readonly state: EstadoOperacional;
  readonly tasks: readonly Entrega[];
}

export function DoneSurface({ state, tasks }: DoneSurfaceProperties) {
  const completed = tasks.filter((task) => state.done.includes(task.id));

  return (
    <section className="executarDoneSurface">
      <header>
        <small>HISTÓRICO COMPROVADO</small>
        <h1>Feito</h1>
        <p>{completed.length} tarefas concluídas nesta Sprint.</p>
      </header>
      <div>
        {completed.map((task) => {
          const proofs = state.evidence.filter(
            (item) => item.taskId === task.id
          );

          return (
            <article key={task.id}>
              <CheckCircle2 aria-hidden="true" />
              <span>
                <b>{task.title}</b>
                <small>
                  {task.front} · {proofs.length} evidência(s)
                </small>
              </span>
              <time>{task.date}</time>
            </article>
          );
        })}
        {!completed.length && (
          <EmptySurface
            message="As tarefas comprovadas aparecerão aqui."
            title="Nada concluído ainda"
          />
        )}
      </div>
    </section>
  );
}

interface ReplanSurfaceProperties {
  readonly onCalendar: () => void;
  readonly onPath: () => void;
  readonly onProjects: () => void;
  readonly project: ProjetoOperacional;
  readonly state: EstadoOperacional;
}

export function ReplanSurface({
  onCalendar,
  onPath,
  onProjects,
  project,
  state,
}: ReplanSurfaceProperties) {
  const blocked = project.tasks.filter(
    (task) =>
      dependenciasPendentes(task, state).length > 0 &&
      !state.done.includes(task.id)
  ).length;

  return (
    <section className="executarReplanSurface">
      <header>
        <small>RE-PLAN</small>
        <h1>Replaneje sem perder o que já avançou.</h1>
        <p>
          {project.name} · {blocked} tarefas ainda dependem de outra entrega.
        </p>
      </header>
      <div>
        <button onClick={onCalendar} type="button">
          <CalendarDays aria-hidden="true" />
          <span>
            <b>Calendário</b>
            <small>Datas, capacidade e ciclos de 72 horas</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
        <button onClick={onPath} type="button">
          <RefreshCw aria-hidden="true" />
          <span>
            <b>Caminho</b>
            <small>Dependências, bloqueios e sucessores</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
        <button onClick={onProjects} type="button">
          <FolderKanban aria-hidden="true" />
          <span>
            <b>Gerenciar plano</b>
            <small>Projetos, entregas e capacidade diária</small>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

type DocumentFilter = "projects" | "lists" | "recent";

interface DocumentsSurfaceProperties {
  readonly onOpenMapaOS: () => void;
  readonly onOpenProjects: () => void;
  readonly onSelectProject: (projectId: string) => void;
  readonly state: EstadoOperacional;
}

export function DocumentsSurface({
  onOpenMapaOS,
  onOpenProjects,
  onSelectProject,
  state,
}: DocumentsSurfaceProperties) {
  const [filter, setFilter] = useState<DocumentFilter>("projects");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const activeProject = state.projects.find(
    (project) => project.id === state.activeProjectId
  );
  const projects = useMemo(
    () =>
      state.projects.filter((project) =>
        project.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery)
      ),
    [normalizedQuery, state.projects]
  );
  const tasks = (activeProject?.tasks ?? []).filter((task) =>
    task.title.toLocaleLowerCase("pt-BR").includes(normalizedQuery)
  );
  const evidence = state.evidence.filter((item) =>
    `${item.note} ${item.file?.name ?? ""}`
      .toLocaleLowerCase("pt-BR")
      .includes(normalizedQuery)
  );

  return (
    <section className="executarDocumentsSurface">
      <header>
        <div>
          <h1>Documentos</h1>
          <p>Seus projetos e listas</p>
        </div>
        <button
          aria-label="Gerenciar documentos e projetos"
          onClick={onOpenProjects}
          type="button"
        >
          <Folder aria-hidden="true" />
        </button>
      </header>
      <label className="executarDocumentsSearch">
        <Search aria-hidden="true" />
        <span className="executarVisuallyHidden">
          Buscar documentos, projetos e listas
        </span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar documentos, projetos, listas..."
          type="search"
          value={query}
        />
      </label>
      <button
        className="executarMapaOsDocument"
        onClick={onOpenMapaOS}
        type="button"
      >
        <span className="executarMapaOsDocumentIcon">
          <Printer aria-hidden="true" />
        </span>
        <span>
          <b>Mapa-OS do projeto</b>
          <small>Visualizar e imprimir em Prisma ou Tripé A4</small>
        </span>
        <ChevronRight aria-hidden="true" />
      </button>
      <div className="executarDocumentTabs" role="tablist">
        {(
          [
            ["projects", "Projetos", FolderKanban],
            ["lists", "Listas", ListChecks],
            ["recent", "Recentes", Clock3],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            aria-selected={filter === id}
            key={id}
            onClick={() => setFilter(id)}
            role="tab"
            type="button"
          >
            <Icon aria-hidden="true" /> {label}
          </button>
        ))}
      </div>
      <div className="executarDocumentsStack">
        {filter === "projects" &&
          projects.map((project) => (
            <button
              className={project.id === state.activeProjectId ? "active" : ""}
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              type="button"
            >
              <span className="executarFolderTab" />
              <span>
                <b>{project.name}</b>
                <small>
                  {project.tasks.length} tarefas · {state.evidence.length}{" "}
                  registros
                </small>
              </span>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
        {filter === "lists" &&
          tasks.map((task) => (
            <article key={task.id}>
              <ListChecks aria-hidden="true" />
              <span>
                <b>{task.title}</b>
                <small>
                  {task.date} · {task.front}
                </small>
              </span>
              {state.done.includes(task.id) && (
                <CheckCircle2 aria-label="Concluída" />
              )}
            </article>
          ))}
        {filter === "recent" &&
          evidence
            .slice()
            .reverse()
            .map((item) => (
              <article key={`${item.taskId}-${item.createdAt}`}>
                <FileCheck2 aria-hidden="true" />
                <span>
                  <b>{item.note || item.file?.name || "Evidência salva"}</b>
                  <small>
                    {item.taskId} ·{" "}
                    {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                  </small>
                </span>
                {item.file && <Paperclip aria-label="Possui arquivo" />}
              </article>
            ))}
        {((filter === "projects" && !projects.length) ||
          (filter === "lists" && !tasks.length) ||
          (filter === "recent" && !evidence.length)) && (
          <EmptySurface
            message={
              normalizedQuery
                ? "Tente outra busca."
                : "Os registros aparecerão aqui."
            }
            title="Nada encontrado"
          />
        )}
      </div>
    </section>
  );
}

function EmptySurface({
  message,
  title,
}: {
  readonly message: string;
  readonly title: string;
}) {
  return (
    <div className="executarEmptySurface">
      <FileText aria-hidden="true" />
      <b>{title}</b>
      <p>{message}</p>
    </div>
  );
}
