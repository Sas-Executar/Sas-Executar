import { OrganizationSwitcher, UserButton } from "@repo/auth/client";
import { NotificationsTrigger } from "@repo/notifications/components/trigger";
import {
  CalendarDays,
  FileText,
  FolderKanban,
  ListChecks,
  Printer,
  Route,
  Users,
  X,
} from "lucide-react";
import { ExecutarBrand } from "./executar-handoff";
import type { View } from "./executar-view-types";

interface MobileDrawerProperties {
  readonly activeProjectName: string;
  readonly currentView: View;
  readonly externalNotificationsAvailable: boolean;
  readonly onClose: () => void;
  readonly onOpenCollaboration: () => void;
  readonly onOpenMapaOS: () => void;
  readonly onOpenProjects: () => void;
  readonly onSelectView: (view: View) => void;
  readonly open: boolean;
  readonly unreadNotifications: number;
}

/**
 * Menu secundário mobile (funções que não cabem na barra de ações
 * flutuante). Extraído de executar-operacional.tsx na correção estrutural
 * da auditoria de 02/09/2026 — puramente presentacional, sem estado
 * próprio.
 */
export function MobileDrawer({
  activeProjectName,
  currentView,
  externalNotificationsAvailable,
  onClose,
  onOpenCollaboration,
  onOpenMapaOS,
  onOpenProjects,
  onSelectView,
  open,
  unreadNotifications,
}: MobileDrawerProperties) {
  if (!open) {
    return null;
  }

  return (
    <div className="executarMobileDrawerLayer">
      <button
        aria-label="Fechar outras funções"
        className="executarFloatingBackdrop"
        onClick={onClose}
        type="button"
      />
      <aside aria-label="Outras funções" className="executarMobileDrawer">
        <div className="executarDrawerHead">
          <div className="executarDrawerBrand">
            <ExecutarBrand compact />
            <div>
              <small>{activeProjectName}</small>
            </div>
          </div>
          <button
            aria-label="Fechar outras funções"
            className="executarDrawerClose"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Funções secundárias" className="executarDrawerNav">
          <button
            aria-current={currentView === "workspace" ? "page" : undefined}
            onClick={() => onSelectView("workspace")}
            type="button"
          >
            <ListChecks aria-hidden="true" />
            <span>
              <b>Tarefas</b>
              <small>Lista única do projeto ativo</small>
            </span>
          </button>
          <button
            aria-current={currentView === "overview" ? "page" : undefined}
            onClick={() => onSelectView("overview")}
            type="button"
          >
            <FolderKanban aria-hidden="true" />
            <span>
              <b>Visão dos projetos</b>
              <small>Plano, métricas e entregas</small>
            </span>
          </button>
          <button
            aria-current={currentView === "documents" ? "page" : undefined}
            onClick={() => onSelectView("documents")}
            type="button"
          >
            <FileText aria-hidden="true" />
            <span>
              <b>Documentos</b>
              <small>Projetos, listas e recentes</small>
            </span>
          </button>
          <button onClick={onOpenMapaOS} type="button">
            <Printer aria-hidden="true" />
            <span>
              <b>Mapa-OS</b>
              <small>Visualizar e imprimir Prisma ou Tripé</small>
            </span>
          </button>
          <button
            aria-current={currentView === "calendar" ? "page" : undefined}
            onClick={() => onSelectView("calendar")}
            type="button"
          >
            <CalendarDays aria-hidden="true" />
            <span>
              <b>Calendário</b>
              <small>Datas, ciclos e capacidade</small>
            </span>
          </button>
          <button
            aria-current={currentView === "path" ? "page" : undefined}
            onClick={() => onSelectView("path")}
            type="button"
          >
            <Route aria-hidden="true" />
            <span>
              <b>Caminho</b>
              <small>Ainda não pode · dependências e resultado</small>
            </span>
          </button>
          <button onClick={onOpenProjects} type="button">
            <FolderKanban aria-hidden="true" />
            <span>
              <b>Projetos</b>
              <small>Planos e entregas</small>
            </span>
          </button>
          <button onClick={onOpenCollaboration} type="button">
            <Users aria-hidden="true" />
            <span>
              <b>Equipe</b>
              <small>
                Colaboração
                {unreadNotifications ? ` · ${unreadNotifications} novos` : ""}
              </small>
            </span>
          </button>
        </nav>
        {externalNotificationsAvailable && (
          <div className="executarDrawerNotifications">
            <span>Notificações</span>
            <NotificationsTrigger />
          </div>
        )}
        <div className="executarDrawerAccount">
          <OrganizationSwitcher />
          <UserButton />
        </div>
      </aside>
    </div>
  );
}
