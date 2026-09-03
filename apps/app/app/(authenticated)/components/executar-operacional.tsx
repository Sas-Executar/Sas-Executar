"use client";

import { OrganizationSwitcher, UserButton, useUser } from "@repo/auth/client";
import { NotificationsTrigger } from "@repo/notifications/components/trigger";
import { X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { lerFluxoCopiloto } from "@/lib/executar/copilot-stream";
import {
  notificacoesOperacionais,
  registrarPresenca,
} from "@/lib/executar/distribution";
import {
  type AprovacaoCopiloto,
  type ArquivoEvidencia,
  type AtorOperacional,
  assumirFoco,
  concluirEntrega,
  concluirPorGestoHumano,
  type EstadoOperacional,
  entregasAtivas,
  estadoEntrega,
  executarAcaoCopiloto,
  focoAtual,
  projetoAtivo,
  registrarEvidencia,
  registrarPasso,
  resolverAprovacaoCopiloto,
  restaurarEstado,
  selecionarProjeto,
} from "@/lib/executar/domain";
import { ENTREGAS_SPRINT } from "@/lib/executar/seed";
import { useSincronizacaoRemota } from "@/lib/executar/use-sincronizacao-remota";
import { CollaborationProvider } from "./collaboration-provider";
import { CollaborationPanel } from "./executar-collaboration-panel";
import {
  COPILOT_MODES,
  type CopilotMode,
  CopilotModelSelector,
  CopilotPanel,
  criarMensagemCopiloto,
  type MensagemCopiloto,
} from "./executar-copilot-panel";
import { ExecutarBrand, FocusSurface, type TaskFace } from "./executar-handoff";
import { MobileDrawer } from "./executar-mobile-drawer";
import { ProductSurface } from "./executar-product-surface";
import { ProjectManager } from "./executar-project-manager";
import {
  VIEW_TITLES,
  VIEWS,
  type View,
  viewInicialDaUrl,
} from "./executar-view-types";
import { WorkspaceActions, WorkspaceHeader } from "./executar-workspace";
import "../executar.css";
import "../handoff.css";

interface ExecutarOperacionalProperties {
  readonly collaborationAvailable: boolean;
  readonly externalNotificationsAvailable: boolean;
  readonly organizationId: string;
  readonly remotePersistenceAvailable: boolean;
  readonly userId: string;
}

function lerArquivoEvidencia(file: File): Promise<ArquivoEvidencia> {
  if (file.size > 2_500_000) {
    return Promise.reject(
      new Error("O arquivo da evidência deve ter no máximo 2,5 MB.")
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Não foi possível ler o arquivo da evidência."));
        return;
      }

      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result,
      });
    };
    reader.onerror = () =>
      reject(new Error("Não foi possível ler o arquivo da evidência."));
    reader.readAsDataURL(file);
  });
}

export function ExecutarOperacional({
  collaborationAvailable,
  externalNotificationsAvailable,
  organizationId,
  remotePersistenceAvailable,
  userId,
}: ExecutarOperacionalProperties) {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>("workspace");
  const deepLinkAplicado = useRef(false);
  const deepLinkTaskAplicado = useRef(false);
  const deepLinkTaskId = searchParams?.get("task") ?? null;

  // Aplica `?view=` (ex.: vindo do Seletor do Scanner) uma única vez, no
  // primeiro render — ajuste de estado durante a renderização em vez de um
  // efeito, para preservar "home" como o valor inicial literal de `view`.
  if (!deepLinkAplicado.current) {
    deepLinkAplicado.current = true;
    const viewSolicitada = viewInicialDaUrl(searchParams);

    if (viewSolicitada !== "workspace") {
      setView(viewSolicitada);
    }
  }

  const [taskFace, setTaskFace] = useState<TaskFace>("principal");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotMode, setCopilotMode] = useState<CopilotMode>("automatic");
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [workspaceTaskOpen, setWorkspaceTaskOpen] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [pendingApproval, setPendingApproval] =
    useState<AprovacaoCopiloto | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MensagemCopiloto[]>([
    {
      author: "copiloto",
      id: "copiloto-inicial",
      text: "Posso orientar a execução real. Pergunte “o que faço agora?” ou use /estado.",
    },
  ]);
  const serverApprovals = useRef(new Map<string, string>());
  const displayName = user?.fullName ?? user?.username ?? userId;
  const actor = useMemo<AtorOperacional>(
    () => ({ organizationId, userId, displayName }),
    [displayName, organizationId, userId]
  );
  const activeCopilotMode =
    COPILOT_MODES.find((mode) => mode.id === copilotMode) ?? COPILOT_MODES[0];

  // Estado local-first + os 6 laços de sincronização (hidratação, gravação
  // local, POST/poll remotos, sincronização entre abas) vivem em
  // useSincronizacaoRemota — extraído deste componente na correção
  // estrutural da auditoria de 02/09/2026. `onReiniciar` limpa o mapa de
  // aprovações pendentes no servidor (só faz sentido aqui, é específico do
  // Copiloto) sempre que a hidratação inicial reinicia.
  const {
    loaded,
    remoteReady,
    remoteRevisionRef,
    setState,
    setSyncNotice,
    state,
    syncNotice,
  } = useSincronizacaoRemota({
    actor,
    onReiniciar: () => serverApprovals.current.clear(),
    organizationId,
    remotePersistenceAvailable,
    userId,
  });

  useEffect(() => {
    function closeFloatingNavigation(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setMobileMenuOpen(false);
      setModelSelectorOpen(false);
      setCommandMenuOpen(false);
    }

    window.addEventListener("keydown", closeFloatingNavigation);
    return () => window.removeEventListener("keydown", closeFloatingNavigation);
  }, []);

  useEffect(() => {
    if (
      deepLinkTaskAplicado.current ||
      !deepLinkTaskId ||
      !loaded ||
      (remotePersistenceAvailable && !remoteReady)
    ) {
      return;
    }

    deepLinkTaskAplicado.current = true;
    const tasks = entregasAtivas(state);
    const task = tasks.find((item) => item.id === deepLinkTaskId);

    const taskStatus = task ? estadoEntrega(task, state) : null;

    if (!task || taskStatus === "BLOCKED" || taskStatus === "DONE") {
      return;
    }

    setState(assumirFoco(tasks, state, task.id));
    setWorkspaceTaskOpen(true);
  }, [
    deepLinkTaskId,
    loaded,
    remotePersistenceAvailable,
    remoteReady,
    setState,
    state,
  ]);

  const tasks = useMemo(() => entregasAtivas(state), [state]);
  const focus = useMemo(() => focoAtual(tasks, state), [state, tasks]);
  const activeProject = projetoAtivo(state);
  const unreadNotifications = useMemo(
    () =>
      notificacoesOperacionais(state, actor).filter((item) => !item.read)
        .length,
    [actor, state]
  );
  const title = VIEW_TITLES[view];

  async function saveEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!focus) {
      return;
    }

    try {
      let file = evidenceFile
        ? await lerArquivoEvidencia(evidenceFile)
        : undefined;

      if (file && evidenceFile && remotePersistenceAvailable && remoteReady) {
        const form = new FormData();

        form.set("state", JSON.stringify(state));
        form.set("taskId", focus.id);
        form.set("file", evidenceFile, evidenceFile.name);

        const response = await fetch("/api/executar/evidence", {
          method: "POST",
          body: form,
        });
        const result = (await response.json()) as {
          error?: string;
          path?: string;
        };

        if (!(response.ok && result.path)) {
          throw new Error(
            result.error ?? "Não foi possível enviar o arquivo da evidência."
          );
        }

        // Não propaga `file.data` (base64) daqui pra frente: o upload já
        // confirmou o arquivo no armazenamento remoto, então manter o
        // base64 no estado local-first só duplicaria o payload pra sempre
        // (achado da auditoria de 02/09/2026 — ver docs/design-system ou o
        // relatório publicado na sessão).
        file = {
          name: file.name,
          size: file.size,
          storagePath: result.path,
          type: file.type,
        };
      }

      const withEvidence = registrarEvidencia(
        tasks,
        state,
        focus.id,
        note,
        url,
        verified,
        file,
        actor.userId
      );

      setState(concluirEntrega(tasks, withEvidence, focus.id));
      setEvidenceOpen(false);
      setNote("");
      setUrl("");
      setEvidenceFile(null);
      setVerified(false);
      setError("");
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "Não foi possível concluir."
      );
    }
  }

  /**
   * Botão "Concluir" do app: como um checklist comum, clicar já conclui —
   * sem abrir o formulário de evidência. O próprio clique é o gesto humano
   * que confirma (decisão do usuário, 28/08/2026 — ver
   * `concluirPorGestoHumano` em domain.ts). Se algo impedir a conclusão
   * (ex.: a tarefa saiu de foco por outra aba/dispositivo), cai de volta
   * pro formulário de evidência em vez de falhar em silêncio.
   */
  function concluirRapido() {
    if (!focus) {
      return;
    }

    try {
      setState(
        concluirPorGestoHumano(tasks, state, focus.id, "Concluído no app.")
      );
      setError("");
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "Não foi possível concluir."
      );
      setEvidenceOpen(true);
    }
  }

  function executarCopilotoLocal(question: string) {
    try {
      const answer = executarAcaoCopiloto(state, question);

      if (answer.state !== state) {
        setState(answer.state);
      }

      setPendingApproval(answer.approval);

      if (answer.approval && remotePersistenceAvailable && remoteReady) {
        const requested = answer.approval;

        fetch("/api/executar/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "solicitar", approval: requested }),
        })
          .then(async (response) => {
            const body = (await response.json()) as {
              approvalId?: string;
              error?: string;
            };

            if (!(response.ok && body.approvalId)) {
              throw new Error(
                body.error ?? "Não foi possível registrar a aprovação humana."
              );
            }

            serverApprovals.current.set(requested.id, body.approvalId);
          })
          .catch((problem: unknown) => {
            setSyncNotice(
              problem instanceof Error
                ? problem.message
                : "Não foi possível registrar a aprovação humana."
            );
          });
      }

      setMessages((previous) => [
        ...previous,
        criarMensagemCopiloto("pessoa", question),
        criarMensagemCopiloto("copiloto", answer.reply),
      ]);
    } catch (problem) {
      setMessages((previous) => [
        ...previous,
        criarMensagemCopiloto("pessoa", question),
        criarMensagemCopiloto(
          "copiloto",
          problem instanceof Error
            ? problem.message
            : "Não foi possível executar a ação solicitada."
        ),
      ]);
    }
  }

  async function atualizarEstadoDepoisIa(
    latestRevision: number
  ): Promise<void> {
    if (latestRevision <= remoteRevisionRef.current) {
      return;
    }

    const updated = await fetch("/api/executar/state", {
      cache: "no-store",
    });

    if (!updated.ok) {
      throw new Error("Não foi possível atualizar a ação feita pela IA.");
    }

    const body = (await updated.json()) as {
      state: EstadoOperacional | null;
    };

    if (body.state) {
      const restored = restaurarEstado(
        JSON.stringify(body.state),
        organizationId,
        ENTREGAS_SPRINT
      );
      remoteRevisionRef.current = restored.revision;
      setState(restored);
    }
  }

  async function responderComIa(question: string): Promise<void> {
    const userMessage = criarMensagemCopiloto("pessoa", question);
    const assistantMessage = criarMensagemCopiloto("copiloto", "");
    let receivedText = false;
    let latestRevision = remoteRevisionRef.current;

    setCopilotLoading(true);
    setMessages((previous) => [...previous, userMessage, assistantMessage]);

    try {
      const history = [...messages.slice(-10), userMessage]
        .filter((entry) => entry.text.trim())
        .map((entry) => ({
          id: entry.id,
          role: entry.author === "pessoa" ? "user" : "assistant",
          parts: [{ type: "text", text: entry.text }],
        }));
      const response = await fetch("/api/executar/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!(response.ok && response.body)) {
        throw new Error("A IA não está disponível neste ambiente.");
      }

      await lerFluxoCopiloto(response.body, {
        text(value) {
          receivedText = true;
          setMessages((previous) =>
            previous.map((entry) =>
              entry.id === assistantMessage.id
                ? { ...entry, text: entry.text + value }
                : entry
            )
          );
        },
        mutation(revision) {
          latestRevision = Math.max(latestRevision, revision);
        },
        approval(approval, approvalId) {
          if (approval.organizationId !== organizationId) {
            throw new Error("A aprovação não pertence à organização ativa.");
          }

          serverApprovals.current.set(approval.id, approvalId);
          setPendingApproval(approval);
        },
      });

      if (!receivedText) {
        throw new Error("A IA não retornou uma resposta operacional.");
      }

      await atualizarEstadoDepoisIa(latestRevision);
    } catch (problem) {
      const notice =
        problem instanceof Error
          ? problem.message
          : "A IA não está disponível neste ambiente.";

      if (receivedText) {
        setSyncNotice(notice);
      } else {
        setMessages((previous) =>
          previous.filter(
            (entry) =>
              entry.id !== userMessage.id && entry.id !== assistantMessage.id
          )
        );
        setSyncNotice(`${notice} O Copiloto operacional continua disponível.`);
        executarCopilotoLocal(question);
      }
    } finally {
      setCopilotLoading(false);
    }
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!(message.trim() && !copilotLoading)) {
      return;
    }

    const question = message.trim();

    setMessage("");
    setCommandMenuOpen(false);

    if (
      copilotMode === "local" ||
      question.startsWith("/") ||
      !(remotePersistenceAvailable && remoteReady)
    ) {
      executarCopilotoLocal(question);
      return;
    }

    responderComIa(question).catch(() => {
      setSyncNotice("Não foi possível iniciar a resposta do Copiloto.");
    });
  }

  async function decideApproval(approved: boolean): Promise<void> {
    if (!pendingApproval) {
      return;
    }

    try {
      if (remotePersistenceAvailable && remoteReady) {
        const approvalId = serverApprovals.current.get(pendingApproval.id);

        if (!approvalId) {
          throw new Error("A aprovação ainda não foi registrada no servidor.");
        }

        const response = await fetch("/api/executar/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resolver",
            approvalId,
            approved,
          }),
        });

        if (!response.ok) {
          const failure = (await response.json()) as { error?: string };

          throw new Error(
            failure.error ?? "A aprovação humana não foi validada no servidor."
          );
        }

        serverApprovals.current.delete(pendingApproval.id);
      }

      const result = resolverAprovacaoCopiloto(
        state,
        pendingApproval,
        approved
      );
      setState(result.state);
      setMessages((previous) => [
        ...previous,
        criarMensagemCopiloto("copiloto", result.reply),
      ]);
      setPendingApproval(null);
    } catch (problem) {
      setMessages((previous) => [
        ...previous,
        criarMensagemCopiloto(
          "copiloto",
          problem instanceof Error
            ? problem.message
            : "Não foi possível aplicar a aprovação."
        ),
      ]);
    }
  }

  function selectProductView(nextView: View) {
    setMobileMenuOpen(false);
    setModelSelectorOpen(false);
    setCollaborationOpen(false);
    setCopilotOpen(false);
    setView(nextView);
  }

  function openCopilot() {
    setMobileMenuOpen(false);
    setModelSelectorOpen(false);
    setCollaborationOpen(false);
    setCopilotOpen(true);
  }

  function selectDrawerView(nextView: View) {
    selectProductView(nextView);
  }

  function toggleModelSelector() {
    setMobileMenuOpen(false);
    setModelSelectorOpen((open) => !open);
  }

  function toggleCollaboration() {
    if (collaborationOpen) {
      setCollaborationOpen(false);
      return;
    }

    setState((current) => registrarPresenca(current, actor, current.focus));
    setMobileMenuOpen(false);
    setCopilotOpen(false);
    setCollaborationOpen(true);
  }

  return (
    <>
      <div id="app">
        <WorkspaceHeader
          completedCount={state.done.length}
          menuOpen={mobileMenuOpen}
          onMenuToggle={() => {
            setModelSelectorOpen(false);
            setMobileMenuOpen((open) => !open);
          }}
          projectName={activeProject.name}
          totalCount={tasks.length}
        />
        <aside className="side">
          <div className="brand">
            <ExecutarBrand />
          </div>
          <nav aria-label="Navegação principal">
            {VIEWS.map((item) => (
              <button
                aria-current={view === item.id ? "page" : undefined}
                className={`navItem ${view === item.id ? "active" : ""}`}
                key={item.id}
                onClick={() => selectProductView(item.id)}
                type="button"
              >
                <span>{item.icon}</span>
                <b>{item.label}</b>
              </button>
            ))}
          </nav>
          <div className="executarProjectSwitch">
            <label htmlFor="executar-sidebar-projeto">Projeto</label>
            <select
              id="executar-sidebar-projeto"
              onChange={(event) =>
                setState(selecionarProjeto(state, event.target.value))
              }
              value={state.activeProjectId}
            >
              {state.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              className="softBtn"
              onClick={() => setProjectManagerOpen(true)}
              type="button"
            >
              Gerenciar plano
            </button>
          </div>
          <div className="sideFoot">
            <OrganizationSwitcher />
            <div className="executarConta">
              <UserButton />
              <small>Organização isolada neste dispositivo.</small>
            </div>
          </div>
        </aside>
        <main className="main">
          <header className="top">
            <div>
              <div className="eyebrow">
                PRÓXIMO 1 POR VEZ · {activeProject.name}
              </div>
              <h1>{title}</h1>
            </div>
            <div className="topActions">
              <span className="dateChip">24 ago — 04 set</span>
              {externalNotificationsAvailable && <NotificationsTrigger />}
              <button
                className="softBtn executarMobileProject"
                onClick={() => setProjectManagerOpen(true)}
                type="button"
              >
                Projetos
              </button>
              <button
                aria-expanded={collaborationOpen}
                className="softBtn"
                onClick={toggleCollaboration}
                type="button"
              >
                Equipe{unreadNotifications ? ` · ${unreadNotifications}` : ""}
              </button>
              <button
                aria-expanded={copilotOpen}
                className="softBtn"
                onClick={() => {
                  if (copilotOpen) {
                    setCopilotOpen(false);
                  } else {
                    openCopilot();
                  }
                }}
                type="button"
              >
                Copiloto
              </button>
            </div>
          </header>
          {syncNotice && (
            <output className="executarSyncNotice">{syncNotice}</output>
          )}
          <ProductSurface
            focus={focus}
            onOpenCurrentTask={() => setWorkspaceTaskOpen(true)}
            onOpenMapaOS={() => window.location.assign("/mapa-os")}
            onOpenProjects={() => setProjectManagerOpen(true)}
            onStateChange={setState}
            state={state}
            tasks={tasks}
            view={view}
          />
        </main>
      </div>
      <WorkspaceActions
        hidden={
          copilotOpen ||
          collaborationOpen ||
          evidenceOpen ||
          projectManagerOpen ||
          workspaceTaskOpen
        }
        onCopilot={openCopilot}
        onRecentTask={() => setWorkspaceTaskOpen(true)}
        onScanner={() => window.location.assign("/scanner")}
        recentTaskLabel={focus?.id ?? "Tarefa"}
      />
      {workspaceTaskOpen && focus && (
        <div className="executarWorkspaceTaskLayer">
          <button
            aria-label="Fechar tarefa atual"
            className="executarFloatingBackdrop"
            onClick={() => setWorkspaceTaskOpen(false)}
            type="button"
          />
          <section
            aria-label="Tarefa atual"
            className="executarWorkspaceTaskSheet"
          >
            <button
              aria-label="Fechar tarefa atual"
              className="executarWorkspaceTaskClose"
              onClick={() => setWorkspaceTaskOpen(false)}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
            <FocusSurface
              face={taskFace}
              focus={focus}
              onConcluir={concluirRapido}
              onFaceChange={setTaskFace}
              onFocus={(taskId) => setState(assumirFoco(tasks, state, taskId))}
              onOpenEvidence={() => setEvidenceOpen(true)}
              onReplan={() => {
                setWorkspaceTaskOpen(false);
                selectProductView("calendar");
              }}
              onStart={() => setState(registrarPasso(tasks, state, focus.id))}
              projectName={activeProject.name}
              state={state}
              tasks={tasks}
            />
          </section>
        </div>
      )}
      <MobileDrawer
        activeProjectName={activeProject.name}
        currentView={view}
        externalNotificationsAvailable={externalNotificationsAvailable}
        onClose={() => setMobileMenuOpen(false)}
        onOpenCollaboration={toggleCollaboration}
        onOpenMapaOS={() => window.location.assign("/mapa-os")}
        onOpenProjects={() => {
          setMobileMenuOpen(false);
          setProjectManagerOpen(true);
        }}
        onSelectView={selectDrawerView}
        open={mobileMenuOpen}
        unreadNotifications={unreadNotifications}
      />
      <CopilotModelSelector
        activeMode={copilotMode}
        onClose={() => setModelSelectorOpen(false)}
        onSelect={(mode) => {
          setCopilotMode(mode);
          setModelSelectorOpen(false);
        }}
        open={modelSelectorOpen}
        remoteAvailable={remotePersistenceAvailable && remoteReady}
      />
      {projectManagerOpen && (
        <ProjectManager
          onClose={() => setProjectManagerOpen(false)}
          setState={setState}
          state={state}
        />
      )}
      {collaborationOpen &&
        (collaborationAvailable ? (
          <CollaborationProvider
            orgId={organizationId}
            projectId={state.activeProjectId}
          >
            <CollaborationPanel
              actor={actor}
              key={state.activeProjectId}
              onClose={() => setCollaborationOpen(false)}
              setState={setState}
              state={state}
            />
          </CollaborationProvider>
        ) : (
          <CollaborationPanel
            actor={actor}
            key={state.activeProjectId}
            onClose={() => setCollaborationOpen(false)}
            setState={setState}
            state={state}
          />
        ))}
      <CopilotPanel
        activeModeLabel={activeCopilotMode.label}
        commandMenuOpen={commandMenuOpen}
        loading={copilotLoading}
        message={message}
        messages={messages}
        modelSelectorOpen={modelSelectorOpen}
        onClose={() => setCopilotOpen(false)}
        onDecideApproval={decideApproval}
        onMessageChange={setMessage}
        onModelToggle={toggleModelSelector}
        onSubmit={sendMessage}
        onToggleCommands={() => setCommandMenuOpen((open) => !open)}
        open={copilotOpen}
        pendingApproval={pendingApproval}
      />
      {evidenceOpen && focus && (
        <div className="executarEvidenceBackdrop">
          <div
            aria-labelledby="executar-evidencia-titulo"
            aria-modal="true"
            className="executarEvidenceDialog"
            role="dialog"
          >
            <form className="dialogCard" onSubmit={saveEvidence}>
              <div className="dialogHead">
                <div>
                  <small>COMPROVAR</small>
                  <h3 id="executar-evidencia-titulo">{focus.title}</h3>
                </div>
                <button
                  aria-label="Fechar evidência"
                  className="iconBtn"
                  onClick={() => setEvidenceOpen(false)}
                  type="button"
                >
                  ×
                </button>
              </div>
              <label>
                O que comprova que terminou?
                <textarea
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ex.: publicado, teste passou, registro salvo..."
                  rows={4}
                  value={note}
                />
              </label>
              <label>
                Ligação opcional
                <input
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://"
                  type="url"
                  value={url}
                />
              </label>
              <label className="filePick">
                Adicionar arquivo · máximo 2,5 MB
                <input
                  onChange={(event) =>
                    setEvidenceFile(event.target.files?.[0] ?? null)
                  }
                  type="file"
                />
              </label>
              <label className="executarVerificacao">
                <input
                  checked={verified}
                  onChange={(event) => setVerified(event.target.checked)}
                  type="checkbox"
                />
                Verifiquei a entrega e confirmei a evidência.
              </label>
              {error && (
                <p className="executarErro" role="alert">
                  {error}
                </p>
              )}
              <div className="dialogActions">
                <button
                  className="softBtn"
                  onClick={() => setEvidenceOpen(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="primaryBtn"
                  disabled={
                    !(verified && (note.trim() || url.trim() || evidenceFile))
                  }
                  type="submit"
                >
                  Salvar e concluir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
