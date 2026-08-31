"use client";

import {
  Camera,
  Check,
  Circle,
  ListChecks,
  LockKeyhole,
  Menu,
  MessageCircle,
} from "lucide-react";
import { Fragment } from "react";
import {
  dependenciasPendentes,
  type Entrega,
  type EstadoOperacional,
  estadoEntrega,
  ROTULOS_ESTADO,
} from "@/lib/executar/domain";

interface WorkspaceHeaderProperties {
  readonly completedCount: number;
  readonly menuOpen: boolean;
  readonly onMenuToggle: () => void;
  readonly projectName: string;
  readonly totalCount: number;
}

export function WorkspaceHeader({
  completedCount,
  menuOpen,
  onMenuToggle,
  projectName,
  totalCount,
}: WorkspaceHeaderProperties) {
  return (
    <header className="executarWorkspaceHeader">
      <button
        aria-expanded={menuOpen}
        aria-label="Abrir outras funções"
        className="executarWorkspaceMenu"
        onClick={onMenuToggle}
        type="button"
      >
        <Menu aria-hidden="true" />
      </button>
      <div>
        <small>{projectName}</small>
        <h1>Tarefas</h1>
      </div>
      <output
        aria-label={[
          completedCount,
          "de",
          totalCount,
          "tarefas concluídas",
        ].join(" ")}
      >
        <strong>{completedCount}</strong>
        <small>/{totalCount}</small>
      </output>
    </header>
  );
}

interface WorkspaceSurfaceProperties {
  readonly focusId: string | null;
  readonly onFocus: (taskId: string) => void;
  readonly state: EstadoOperacional;
  readonly tasks: readonly Entrega[];
}

function WorkspaceStatusIcon({
  blocked,
  done,
}: {
  readonly blocked: boolean;
  readonly done: boolean;
}) {
  if (done) {
    return <Check />;
  }

  if (blocked) {
    return <LockKeyhole />;
  }

  return <Circle />;
}

export function WorkspaceSurface({
  focusId,
  onFocus,
  state,
  tasks,
}: WorkspaceSurfaceProperties) {
  let previousDate = "";

  return (
    <section className="executarWorkspaceSurface" data-workspace="tasks">
      <div className="executarWorkspaceList">
        {tasks.map((task) => {
          const status = estadoEntrega(task, state);
          const active = task.id === focusId && status !== "DONE";
          const blocked = status === "BLOCKED";
          const done = status === "DONE";
          const showDate = task.date !== previousDate;

          previousDate = task.date;

          return (
            <Fragment key={task.id}>
              {showDate && (
                <header className="executarWorkspaceDate">
                  <time>{task.date}</time>
                </header>
              )}
              <button
                aria-current={active ? "true" : undefined}
                className={[
                  "executarWorkspaceTask",
                  active ? "active" : "",
                  done ? "done" : "",
                ].join(" ")}
                disabled={blocked || done}
                id={`executar-task-${task.id}`}
                onClick={() => onFocus(task.id)}
                type="button"
              >
                <span aria-hidden="true" className="executarWorkspaceStatus">
                  <WorkspaceStatusIcon blocked={blocked} done={done} />
                </span>
                <span className="executarWorkspaceTaskCopy">
                  <b>{task.title}</b>
                  <small>
                    {task.id} · {task.front} ·{" "}
                    {blocked
                      ? "Aguarda " +
                        dependenciasPendentes(task, state).join(", ")
                      : ROTULOS_ESTADO[status]}
                  </small>
                </span>
                <time>{task.mins} min</time>
              </button>
            </Fragment>
          );
        })}
        {!tasks.length && (
          <p className="executarWorkspaceEmpty">
            Nenhuma tarefa disponível neste projeto.
          </p>
        )}
      </div>
    </section>
  );
}

interface WorkspaceActionsProperties {
  readonly hidden?: boolean;
  readonly onCopilot: () => void;
  readonly onRecentTask: () => void;
  readonly onScanner: () => void;
  readonly recentTaskLabel: string;
}

export function WorkspaceActions({
  hidden = false,
  onCopilot,
  onRecentTask,
  onScanner,
  recentTaskLabel,
}: WorkspaceActionsProperties) {
  if (hidden) {
    return null;
  }

  return (
    <nav aria-label="Ações principais" className="executarWorkspaceActions">
      <button onClick={onScanner} type="button">
        <Camera aria-hidden="true" />
        <span>Scanner</span>
      </button>
      <button onClick={onCopilot} type="button">
        <MessageCircle aria-hidden="true" />
        <span>IA</span>
      </button>
      <button onClick={onRecentTask} type="button">
        <ListChecks aria-hidden="true" />
        <span>{recentTaskLabel}</span>
      </button>
    </nav>
  );
}
