import {
  assumirFoco,
  type Entrega,
  type EstadoOperacional,
  selecionarProjeto,
} from "@/lib/executar/domain";
import { DocumentsSurface } from "./executar-handoff";
import type { View } from "./executar-view-types";
import { Calendar, Overview, Path } from "./executar-views";
import { WorkspaceSurface } from "./executar-workspace";

interface ProductSurfaceProperties {
  readonly focus: Entrega | null;
  readonly onOpenCurrentTask: () => void;
  readonly onOpenMapaOS: () => void;
  readonly onOpenProjects: () => void;
  readonly onStateChange: (state: EstadoOperacional) => void;
  readonly state: EstadoOperacional;
  readonly tasks: readonly Entrega[];
  readonly view: View;
}

/**
 * Dispatcher da view ativa do dashboard — extraído de
 * executar-operacional.tsx na correção estrutural da auditoria de
 * 02/09/2026. Sem estado próprio: só decide qual view renderizar.
 */
export function ProductSurface({
  focus,
  onOpenMapaOS,
  onOpenCurrentTask,
  onOpenProjects,
  onStateChange,
  state,
  tasks,
  view,
}: ProductSurfaceProperties) {
  function selectTask(taskId: string) {
    onStateChange(assumirFoco(tasks, state, taskId));
  }

  switch (view) {
    case "workspace":
      return (
        <WorkspaceSurface
          focusId={focus?.id ?? null}
          onFocus={selectTask}
          state={state}
          tasks={tasks}
        />
      );
    case "documents":
      return (
        <DocumentsSurface
          onOpenMapaOS={onOpenMapaOS}
          onOpenProjects={onOpenProjects}
          onSelectProject={(projectId) =>
            onStateChange(selecionarProjeto(state, projectId))
          }
          state={state}
        />
      );
    case "overview":
      return (
        <Overview
          changeView={onOpenCurrentTask}
          focus={focus}
          state={state}
          tasks={tasks}
        />
      );
    case "calendar":
      return <Calendar state={state} />;
    case "path":
      return <Path state={state} tasks={tasks} />;
    default:
      return null;
  }
}
