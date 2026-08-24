"use client";

import {
  ArrowRight,
  Bolt,
  CalendarDays,
  Check,
  CheckCircle2,
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
  MapPin,
  Menu,
  MessageCircle,
  Paperclip,
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
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
  readonly progress: number;
  readonly projectCount: number;
}

export function HomeSurface({
  documentCount,
  firstName,
  onCopilot,
  onDocuments,
  onProjects,
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
  readonly onFaceChange: (face: TaskFace) => void;
  readonly onNext: () => void;
  readonly onOpenEvidence: () => void;
  readonly onReplan: () => void;
  readonly onStart: () => void;
  readonly projectName: string;
  readonly readyCount: number;
  readonly state: EstadoOperacional;
}

export function FocusSurface({
  face,
  focus,
  onFaceChange,
  onNext,
  onOpenEvidence,
  onReplan,
  onStart,
  projectName,
  readyCount,
  state,
}: FocusSurfaceProperties) {
  if (!focus) {
    return (
      <EmptySurface
        message="Não existe outra tarefa liberada neste momento."
        title="Fase concluída"
      />
    );
  }

  const steps = Math.max(1, Math.ceil(focus.mins / 15));
  const completedSteps = state.started[focus.id] ?? 0;
  const evidence = state.evidence.filter((item) => item.taskId === focus.id);

  return (
    <section className="executarFocusSurface">
      <div aria-hidden="true" className="executarTaskStack" />
      <article className="executarFocusCard">
        <div
          aria-label={`Face ${face}`}
          className="executarFocusSteps"
          role="tablist"
        >
          {(["principal", "contexto", "evidencia"] as const).map((item) => (
            <button
              aria-selected={face === item}
              className={face === item ? "active" : ""}
              key={item}
              onClick={() => onFaceChange(item)}
              role="tab"
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        {face === "principal" && (
          <div className="executarTaskFace executarTaskPrincipal">
            <small>
              MODO FOCO · PASSO{" "}
              {String(Math.min(completedSteps + 1, steps)).padStart(2, "0")}
            </small>
            <h1>O que você vai fazer agora para avançar esta tarefa?</h1>
            <p className="executarFocusTaskTitle">{focus.title}</p>
            <div className="executarFocusOptions">
              <button onClick={onStart} type="button">
                <Bolt aria-hidden="true" />
                <span>
                  <b>Executar agora</b>
                  <small>
                    {completedSteps} de {steps} passos registrados
                  </small>
                </span>
              </button>
              <button onClick={() => onFaceChange("contexto")} type="button">
                <ListChecks aria-hidden="true" />
                <span>
                  <b>Ver contexto</b>
                  <small>Projeto, dependências e critério</small>
                </span>
              </button>
              <button onClick={() => onFaceChange("evidencia")} type="button">
                <Paperclip aria-hidden="true" />
                <span>
                  <b>Salvar evidência</b>
                  <small>{evidence.length} registro(s) nesta tarefa</small>
                </span>
              </button>
              <button onClick={onReplan} type="button">
                <RefreshCw aria-hidden="true" />
                <span>
                  <b>Re-planejar</b>
                  <small>Revisar datas e dependências</small>
                </span>
              </button>
            </div>
          </div>
        )}
        {face === "contexto" && (
          <div className="executarTaskFace executarTaskContext">
            <small>CONTEXTO SOB DEMANDA</small>
            <h1>{focus.title}</h1>
            <dl>
              <div>
                <FolderKanban aria-hidden="true" />
                <dt>Projeto</dt>
                <dd>{projectName}</dd>
              </div>
              <div>
                <UserRound aria-hidden="true" />
                <dt>Responsável</dt>
                <dd>Você</dd>
              </div>
              <div>
                <Wrench aria-hidden="true" />
                <dt>Frente</dt>
                <dd>{focus.front}</dd>
              </div>
              <div>
                <MapPin aria-hidden="true" />
                <dt>Entrega</dt>
                <dd>
                  {focus.date} · {focus.mins} min
                </dd>
              </div>
              <div>
                <Link2 aria-hidden="true" />
                <dt>Dependências</dt>
                <dd>
                  {focus.deps.length
                    ? focus.deps.join(", ")
                    : "Livre para começar"}
                </dd>
              </div>
              <div>
                <FileCheck2 aria-hidden="true" />
                <dt>Conclui quando</dt>
                <dd>
                  {focus.dod ??
                    "A entrega estiver comprovada por evidência verificada."}
                </dd>
              </div>
            </dl>
          </div>
        )}
        {face === "evidencia" && (
          <div className="executarTaskFace executarTaskEvidence">
            <small>MEMÓRIA DA TAREFA</small>
            <h1>Evidência</h1>
            <p>
              Salve informações, provas ou referências que sustentam esta
              entrega.
            </p>
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
                <small>Nenhuma evidência registrada ainda.</small>
              )}
            </div>
            <button
              className="executarEvidenceAdd"
              onClick={onOpenEvidence}
              type="button"
            >
              <Paperclip aria-hidden="true" /> Adicionar evidência
            </button>
          </div>
        )}
        <footer className="executarFocusFooter">
          <button
            className="executarFocusBack"
            onClick={() => onFaceChange("principal")}
            type="button"
          >
            Voltar
          </button>
          <button
            className="executarFocusDone"
            onClick={onOpenEvidence}
            type="button"
          >
            Feito · comprovar
            <CheckCircle2 aria-hidden="true" />
          </button>
          <button
            aria-label="Assumir próxima tarefa liberada"
            className="executarFocusNext"
            disabled={readyCount < 2}
            onClick={onNext}
            type="button"
          >
            <ArrowRight aria-hidden="true" />
          </button>
        </footer>
      </article>
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
  readonly onOpenProjects: () => void;
  readonly onSelectProject: (projectId: string) => void;
  readonly state: EstadoOperacional;
}

export function DocumentsSurface({
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
