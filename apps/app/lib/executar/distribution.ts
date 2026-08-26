import type { ProjecaoEstadoMobile } from "@repo/executar-contracts/mobile";
import {
  type AtorOperacional,
  type ComentarioOperacional,
  calendarioProjeto,
  type EstadoOperacional,
  entregasAtivas,
  filaPronta,
  focoAtual,
  type PresencaOperacional,
  projetoAtivo,
  registrarEventoDistribuicao,
} from "./domain.ts";

const CLERK_USER_PATTERN = /^user_[A-Za-z0-9_-]+$/;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]+$/;

export const LIMITES_DISTRIBUICAO = {
  commentCharacters: 2000,
  mentionsPerComment: 10,
  presenceTtlMilliseconds: 120_000,
} as const;

export interface DiretorioClerk {
  readonly organizationId: string;
  readonly userIds: readonly string[];
}

export interface NotificacaoOperacional {
  readonly body: string;
  readonly id: string;
  readonly kind:
    | "mencao"
    | "comentario"
    | "entrega_liberada"
    | "entrega_concluida"
    | "replanejamento";
  readonly organizationId: string;
  readonly projectId: string;
  readonly read: boolean;
  readonly revision: number;
  readonly taskId: string | null;
  readonly title: string;
  readonly userId: string;
}

export interface ResultadoAtualizacaoCompartilhada {
  readonly state: EstadoOperacional;
  readonly status: "aplicada" | "sem_mudanca" | "conflito";
}

export interface GatesMobilidade {
  readonly clerkMobile: boolean;
  readonly remoteSync: boolean;
  readonly tenantIsolation: boolean;
  readonly webProduction: boolean;
}

export interface PreparoMobilidade {
  readonly application: "apps/mobile";
  readonly authority: "Clerk";
  readonly blockers: readonly string[];
  readonly framework: "Expo";
  readonly platforms: readonly ["android", "ios"];
  readonly ready: boolean;
}

export interface EtapaOnboarding {
  readonly complete: boolean;
  readonly id: string;
  readonly title: string;
}

function validarAtor(state: EstadoOperacional, actor: AtorOperacional): void {
  if (actor.organizationId !== state.organizationId) {
    throw new Error("A colaboração não pode acessar outra organização.");
  }

  if (!CLERK_USER_PATTERN.test(actor.userId)) {
    throw new Error(
      "A colaboração exige uma identidade de usuário Clerk válida."
    );
  }

  if (!actor.displayName.trim()) {
    throw new Error("Informe o nome de exibição do usuário autenticado.");
  }
}

function validarEntregaAtiva(state: EstadoOperacional, taskId: string): void {
  if (!entregasAtivas(state).some((task) => task.id === taskId)) {
    throw new Error("A entrega não pertence ao projeto ativo da organização.");
  }
}

export function salaColaboracao(
  state: EstadoOperacional,
  actor: AtorOperacional
): string {
  validarAtor(state, actor);

  if (
    !(
      SAFE_IDENTIFIER_PATTERN.test(state.organizationId) &&
      SAFE_IDENTIFIER_PATTERN.test(state.activeProjectId)
    )
  ) {
    throw new Error(
      "Organização ou projeto inválido para a sala colaborativa."
    );
  }

  return `${state.organizationId}:${state.activeProjectId}`;
}

export function presencasAtivas(
  state: EstadoOperacional,
  actor: AtorOperacional,
  now = Date.now()
): readonly PresencaOperacional[] {
  validarAtor(state, actor);

  return state.collaboration.presence.filter((presence) => {
    const seenAt = Date.parse(presence.seenAt);

    return (
      presence.organizationId === state.organizationId &&
      presence.projectId === state.activeProjectId &&
      Number.isFinite(seenAt) &&
      now >= seenAt &&
      now - seenAt <= LIMITES_DISTRIBUICAO.presenceTtlMilliseconds
    );
  });
}

export function registrarPresenca(
  state: EstadoOperacional,
  actor: AtorOperacional,
  taskId: string | null = state.focus,
  now = new Date()
): EstadoOperacional {
  validarAtor(state, actor);

  if (taskId) {
    validarEntregaAtiva(state, taskId);
  }

  const current = now.getTime();
  const presence: PresencaOperacional = {
    organizationId: state.organizationId,
    projectId: state.activeProjectId,
    userId: actor.userId,
    displayName: actor.displayName.trim(),
    taskId,
    seenAt: now.toISOString(),
  };

  return registrarEventoDistribuicao(
    state,
    "colaboracao.presenca",
    taskId,
    {
      ...state.collaboration,
      presence: [
        ...state.collaboration.presence.filter((item) => {
          const seenAt = Date.parse(item.seenAt);

          return (
            item.organizationId === state.organizationId &&
            Number.isFinite(seenAt) &&
            current - seenAt <= LIMITES_DISTRIBUICAO.presenceTtlMilliseconds &&
            !(
              item.projectId === state.activeProjectId &&
              item.userId === actor.userId
            )
          );
        }),
        presence,
      ],
    },
    actor.userId
  );
}

export function extrairMencoes(text: string): readonly string[] {
  return Array.from(
    new Set(
      Array.from(text.matchAll(/@([A-Za-z][A-Za-z0-9_-]{1,63})/g)).map(
        (match) => match[1]
      )
    )
  );
}

export function registrarComentario(
  state: EstadoOperacional,
  actor: AtorOperacional,
  taskId: string,
  message: string,
  directory: DiretorioClerk,
  now = new Date()
): EstadoOperacional {
  validarAtor(state, actor);
  validarEntregaAtiva(state, taskId);

  if (directory.organizationId !== actor.organizationId) {
    throw new Error("O diretório Clerk pertence a outra organização.");
  }

  const body = message.trim();

  if (!body) {
    throw new Error("O comentário não pode ficar vazio.");
  }

  if (body.length > LIMITES_DISTRIBUICAO.commentCharacters) {
    throw new Error("O comentário excede o limite de 2000 caracteres.");
  }

  const mentions = extrairMencoes(body);

  if (mentions.length > LIMITES_DISTRIBUICAO.mentionsPerComment) {
    throw new Error("O comentário excede o limite de 10 menções.");
  }

  const authorized = new Set([actor.userId, ...directory.userIds]);

  if (mentions.some((mention) => !authorized.has(mention))) {
    throw new Error("Menção rejeitada: usuário não autorizado pelo Clerk.");
  }

  const revision = state.revision + 1;
  const comment: ComentarioOperacional = {
    id: `${state.organizationId}:${state.activeProjectId}:comentario:${revision}`,
    organizationId: state.organizationId,
    projectId: state.activeProjectId,
    taskId,
    authorId: actor.userId,
    authorName: actor.displayName.trim(),
    body,
    mentions,
    createdAt: now.toISOString(),
    revision,
  };

  return registrarEventoDistribuicao(
    state,
    "colaboracao.comentario",
    taskId,
    {
      ...state.collaboration,
      comments: [...state.collaboration.comments, comment],
    },
    actor.userId
  );
}

export function comentariosEntrega(
  state: EstadoOperacional,
  actor: AtorOperacional,
  taskId: string
): readonly ComentarioOperacional[] {
  validarAtor(state, actor);
  validarEntregaAtiva(state, taskId);

  return state.collaboration.comments.filter(
    (comment) =>
      comment.organizationId === state.organizationId &&
      comment.projectId === state.activeProjectId &&
      comment.taskId === taskId
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: consolida comentários, menções e eventos autorizados sem fragmentar a validação de tenant.
export function notificacoesOperacionais(
  state: EstadoOperacional,
  actor: AtorOperacional
): readonly NotificacaoOperacional[] {
  validarAtor(state, actor);

  const read = new Set(
    state.collaboration.notificationReads
      .filter(
        (item) =>
          item.organizationId === state.organizationId &&
          item.projectId === state.activeProjectId &&
          item.userId === actor.userId
      )
      .map((item) => item.id)
  );
  const project = projetoAtivo(state);
  const items: NotificacaoOperacional[] = [];
  const add = (
    id: string,
    kind: NotificacaoOperacional["kind"],
    taskId: string | null,
    title: string,
    body: string,
    revision: number
  ): void => {
    items.push({
      id,
      organizationId: state.organizationId,
      projectId: state.activeProjectId,
      userId: actor.userId,
      taskId,
      kind,
      title,
      body,
      revision,
      read: read.has(id),
    });
  };

  for (const comment of state.collaboration.comments) {
    if (
      comment.organizationId !== state.organizationId ||
      comment.projectId !== state.activeProjectId ||
      comment.authorId === actor.userId
    ) {
      continue;
    }

    if (comment.mentions.includes(actor.userId)) {
      add(
        `${comment.id}:mencao:${actor.userId}`,
        "mencao",
        comment.taskId,
        "Você foi mencionado",
        `${comment.authorName}: ${comment.body}`,
        comment.revision
      );
    } else if (comment.taskId === state.focus) {
      add(
        `${comment.id}:comentario:${actor.userId}`,
        "comentario",
        comment.taskId,
        "Comentário na entrega em foco",
        `${comment.authorName}: ${comment.body}`,
        comment.revision
      );
    }
  }

  for (const event of state.events) {
    if (
      event.organizationId !== state.organizationId ||
      event.projectId !== state.activeProjectId ||
      event.userId === actor.userId
    ) {
      continue;
    }

    if (event.action === "entrega.concluida" && event.taskId) {
      add(
        `${state.organizationId}:${state.activeProjectId}:${event.revision}:concluida:${actor.userId}`,
        "entrega_concluida",
        event.taskId,
        "Entrega concluída",
        `${event.taskId} foi concluída com evidência verificada.`,
        event.revision
      );
    }

    if (event.action === "plano.replanejado" && event.taskId) {
      add(
        `${state.organizationId}:${state.activeProjectId}:${event.revision}:replanejada:${actor.userId}`,
        "replanejamento",
        event.taskId,
        "Replanejamento localizado",
        `O subgrafo de ${event.taskId} foi atualizado.`,
        event.revision
      );
    }
  }

  for (const task of filaPronta(project.tasks, state)) {
    if (!task.deps.length) {
      continue;
    }

    const revisions = state.events
      .filter(
        (event) =>
          event.projectId === project.id &&
          event.action === "entrega.concluida" &&
          event.taskId !== null &&
          task.deps.includes(event.taskId)
      )
      .map((event) => event.revision);

    if (revisions.length) {
      add(
        `${state.organizationId}:${project.id}:liberada:${task.id}:${actor.userId}`,
        "entrega_liberada",
        task.id,
        "Nova entrega liberada",
        `${task.id} — ${task.title} já pode começar.`,
        Math.max(...revisions)
      );
    }
  }

  return items.sort((left, right) => right.revision - left.revision);
}

export function marcarNotificacaoLida(
  state: EstadoOperacional,
  actor: AtorOperacional,
  notificationId: string,
  now = new Date()
): EstadoOperacional {
  const notification = notificacoesOperacionais(state, actor).find(
    (item) => item.id === notificationId
  );

  if (!notification) {
    throw new Error("A notificação não pertence ao usuário e projeto ativos.");
  }

  if (notification.read) {
    return state;
  }

  return registrarEventoDistribuicao(
    state,
    "notificacao.lida",
    notification.taskId,
    {
      ...state.collaboration,
      notificationReads: [
        ...state.collaboration.notificationReads,
        {
          id: notification.id,
          organizationId: state.organizationId,
          projectId: state.activeProjectId,
          userId: actor.userId,
          readAt: now.toISOString(),
        },
      ],
    },
    actor.userId
  );
}

export function receberAtualizacaoCompartilhada(
  current: EstadoOperacional,
  incoming: EstadoOperacional,
  actor: AtorOperacional
): ResultadoAtualizacaoCompartilhada {
  validarAtor(current, actor);

  if (incoming.organizationId !== actor.organizationId) {
    throw new Error("Atualização compartilhada de outra organização recusada.");
  }

  if (incoming.activeProjectId !== current.activeProjectId) {
    return { status: "conflito", state: current };
  }

  if (incoming.revision < current.revision) {
    return { status: "sem_mudanca", state: current };
  }

  if (incoming.revision === current.revision) {
    return JSON.stringify(incoming) === JSON.stringify(current)
      ? { status: "sem_mudanca", state: current }
      : { status: "conflito", state: current };
  }

  const byRevision = new Map(
    incoming.events.map((event) => [event.revision, event] as const)
  );
  const ancestor = current.events.every(
    (event) =>
      JSON.stringify(byRevision.get(event.revision)) === JSON.stringify(event)
  );

  return ancestor
    ? { status: "aplicada", state: incoming }
    : { status: "conflito", state: current };
}

export function prepararMobilidade(gates: GatesMobilidade): PreparoMobilidade {
  const blockers: string[] = [];

  if (!gates.webProduction) {
    blockers.push("Web/SaaS ainda não está aprovado em produção.");
  }

  if (!gates.remoteSync) {
    blockers.push("Sincronização remota do estado canônico não foi validada.");
  }

  if (!gates.tenantIsolation) {
    blockers.push("Isolamento multi-tenant real ainda não foi verificado.");
  }

  if (!gates.clerkMobile) {
    blockers.push("Sessão Clerk compatível com Expo ainda não foi integrada.");
  }

  return {
    ready: blockers.length === 0,
    framework: "Expo",
    application: "apps/mobile",
    platforms: ["android", "ios"],
    authority: "Clerk",
    blockers,
  };
}

export function projetarEstadoMobile(
  state: EstadoOperacional,
  actor: AtorOperacional
): ProjecaoEstadoMobile {
  validarAtor(state, actor);
  const project = projetoAtivo(state);

  return {
    organizationId: state.organizationId,
    projectId: project.id,
    projectName: project.name,
    focus: focoAtual(project.tasks, state),
    ready: filaPronta(project.tasks, state),
    calendar: calendarioProjeto(state),
    evidence: state.evidence.map((item) => ({
      taskId: item.taskId,
      note: item.note,
      url: item.url,
      verified: item.verified,
      createdAt: item.createdAt,
      ...(item.file
        ? {
            file: {
              name: item.file.name,
              type: item.file.type,
              size: item.file.size,
            },
          }
        : {}),
    })),
    revision: state.revision,
  };
}

export function prepararIntegracoesDistribuicao(
  state: EstadoOperacional,
  actor: AtorOperacional,
  configured: {
    readonly liveblocks: boolean;
    readonly knock: boolean;
  }
): {
  readonly collaboration: {
    package: "@repo/collaboration";
    provider: "Liveblocks";
    room: string;
    enabled: boolean;
  };
  readonly notifications: {
    package: "@repo/notifications";
    provider: "Knock";
    recipientId: string;
    enabled: boolean;
  };
} {
  return {
    collaboration: {
      package: "@repo/collaboration",
      provider: "Liveblocks",
      room: salaColaboracao(state, actor),
      enabled: configured.liveblocks,
    },
    notifications: {
      package: "@repo/notifications",
      provider: "Knock",
      recipientId: actor.userId,
      enabled: configured.knock,
    },
  };
}

export function etapasOnboarding(
  state: EstadoOperacional,
  actor: AtorOperacional
): readonly EtapaOnboarding[] {
  validarAtor(state, actor);
  const tasks = entregasAtivas(state);

  return [
    {
      id: "organizacao",
      title: "Entrar na organização autenticada",
      complete: true,
    },
    {
      id: "projeto",
      title: "Definir um projeto operacional",
      complete: Boolean(projetoAtivo(state).name.trim()),
    },
    {
      id: "entrega",
      title: "Organizar a primeira entrega",
      complete: tasks.length > 0,
    },
    {
      id: "foco",
      title: "Assumir o próximo foco",
      complete: Boolean(state.focus || Object.keys(state.started).length),
    },
    {
      id: "evidencia",
      title: "Registrar uma evidência verificável",
      complete: state.evidence.length > 0,
    },
    {
      id: "resultado",
      title: "Concluir a primeira entrega",
      complete: state.done.length > 0,
    },
  ];
}
