import {
  type AprovacaoCopiloto,
  type AtorOperacional,
  type EstadoOperacional,
  FERRAMENTAS_OPERACIONAIS,
} from "./domain.ts";
import {
  type ConfiguracaoSupabaseAutorizado,
  criarClienteSupabaseClerk,
  prepararLotePersistencia,
  type SessaoClerkIntegracao,
} from "./integration-contract.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ErroPersistenciaRemota extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, status: number, code = "PERSISTENCIA_REMOTA") {
    super(message);
    this.name = "ErroPersistenciaRemota";
    this.status = status;
    this.code = code;
  }
}

export interface PersistenciaOperacionalRemota {
  aprovar(approvalId: string, approved: boolean): Promise<void>;
  carregar(): Promise<EstadoOperacional | null>;
  salvar(
    state: EstadoOperacional,
    actor: AtorOperacional,
    expectedRevision: number
  ): Promise<{ readonly revision: number }>;
  solicitarAprovacao(approval: AprovacaoCopiloto): Promise<string>;
}

interface ClientePostgrest {
  readonly accessToken: () => Promise<string | null>;
  readonly key: string;
  readonly url: string;
}

function validarAprovacao(
  approval: AprovacaoCopiloto,
  organizationId: string
): void {
  const contract = FERRAMENTAS_OPERACIONAIS.find(
    (item) => item.name === approval.tool
  );
  const expectedId = `${approval.organizationId}:${approval.projectId}:${approval.tool}:${approval.taskId ?? "projeto"}:${approval.expectedRevision}`;

  if (
    approval.organizationId !== organizationId ||
    !contract?.requiresApproval ||
    approval.id !== expectedId ||
    approval.input.name !== approval.tool ||
    approval.input.organizationId !== organizationId ||
    approval.input.projectId !== approval.projectId ||
    approval.input.expectedRevision !== approval.expectedRevision ||
    (approval.input.taskId ?? null) !== approval.taskId ||
    !Number.isSafeInteger(approval.expectedRevision)
  ) {
    throw new ErroPersistenciaRemota(
      "A proposta de aprovação não pertence à sessão autenticada.",
      403,
      "APROVACAO_INVALIDA"
    );
  }
}

async function executarRequisicao(
  client: ClientePostgrest,
  request: typeof fetch,
  path: string,
  init: RequestInit = {}
): Promise<unknown> {
  const token = await client.accessToken();

  if (!token) {
    throw new ErroPersistenciaRemota(
      "A sessão Clerk foi encerrada.",
      401,
      "SESSAO_ENCERRADA"
    );
  }

  const response = await request(`${client.url}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: client.key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const raw = await response.text();
  let body: unknown;

  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const failure = body as { code?: string; message?: string } | null;
    const conflict = failure?.code === "40001" || response.status === 409;

    throw new ErroPersistenciaRemota(
      conflict
        ? "Outra sessão modificou este projeto; revise antes de sincronizar."
        : (failure?.message ?? "Não foi possível acessar o banco operacional."),
      conflict ? 409 : response.status,
      failure?.code ?? (conflict ? "CONFLITO_REVISAO" : "PERSISTENCIA_REMOTA")
    );
  }

  return body;
}

export function criarPersistenciaRemota(
  configuration: ConfiguracaoSupabaseAutorizado,
  session: SessaoClerkIntegracao,
  request: typeof fetch = fetch
): PersistenciaOperacionalRemota {
  const client = criarClienteSupabaseClerk(
    configuration,
    session,
    (url, key, options) => ({ url, key, accessToken: options.accessToken })
  );
  const organization = encodeURIComponent(session.organizationId);

  return {
    async carregar() {
      const response = await executarRequisicao(
        client,
        request,
        `/rest/v1/executar_events?select=revision,payload&organization_id=eq.${organization}&order=revision.desc&limit=1`
      );

      if (!(Array.isArray(response) && response.length)) {
        return null;
      }

      const candidate = response[0] as {
        payload?: { state?: EstadoOperacional };
        revision?: number;
      };
      const state = candidate.payload?.state;

      if (
        !state ||
        state.organizationId !== session.organizationId ||
        !Number.isSafeInteger(state.revision) ||
        state.revision !== candidate.revision
      ) {
        throw new ErroPersistenciaRemota(
          "O estado remoto não pertence à organização autenticada.",
          409,
          "ESTADO_REMOTO_INVALIDO"
        );
      }

      return state;
    },

    async salvar(state, actor, expectedRevision) {
      if (
        !Number.isSafeInteger(expectedRevision) ||
        expectedRevision < -1 ||
        expectedRevision > state.revision
      ) {
        throw new ErroPersistenciaRemota(
          "A revisão esperada para sincronização é inválida.",
          400,
          "REVISAO_INVALIDA"
        );
      }

      const batch = prepararLotePersistencia(
        state,
        actor,
        Math.max(expectedRevision, 0)
      );
      const response = await executarRequisicao(
        client,
        request,
        "/rest/v1/rpc/executar_persistir_estado",
        {
          method: "POST",
          body: JSON.stringify({
            p_payload: {
              organization_id: batch.organizationId,
              actor_user_id: batch.actorId,
              expected_revision: expectedRevision,
              revision: batch.revision,
              active_project_id: batch.activeProjectId,
              projects: batch.projects,
              deliveries: batch.deliveries,
              dependencies: batch.dependencies,
              events: batch.sync.events,
              state,
            },
          }),
        }
      );
      const saved = response as { organization_id?: string; revision?: number };

      if (
        saved.organization_id !== session.organizationId ||
        saved.revision !== state.revision
      ) {
        throw new ErroPersistenciaRemota(
          "A confirmação remota não corresponde à organização ou revisão.",
          409,
          "CONFIRMACAO_INVALIDA"
        );
      }

      return { revision: saved.revision };
    },

    async solicitarAprovacao(approval) {
      validarAprovacao(approval, session.organizationId);

      const response = await executarRequisicao(
        client,
        request,
        "/rest/v1/executar_approvals?select=approval_id",
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            organization_id: session.organizationId,
            project_id: approval.projectId,
            requested_by_user_id: session.userId,
            tool_name: approval.tool,
            delivery_id: approval.taskId,
            expected_revision: approval.expectedRevision,
            input: approval.input,
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          }),
        }
      );
      const approvalId = Array.isArray(response)
        ? (response[0] as { approval_id?: string } | undefined)?.approval_id
        : undefined;

      if (!(approvalId && UUID_PATTERN.test(approvalId))) {
        throw new ErroPersistenciaRemota(
          "A aprovação não foi registrada pelo servidor.",
          502,
          "APROVACAO_NAO_PERSISTIDA"
        );
      }

      return approvalId;
    },

    async aprovar(approvalId, approved) {
      if (!UUID_PATTERN.test(approvalId)) {
        throw new ErroPersistenciaRemota(
          "O identificador da aprovação é inválido.",
          400,
          "APROVACAO_INVALIDA"
        );
      }

      const id = encodeURIComponent(approvalId);
      const expiration = encodeURIComponent(new Date().toISOString());
      const response = await executarRequisicao(
        client,
        request,
        `/rest/v1/executar_approvals?organization_id=eq.${organization}&approval_id=eq.${id}&status=eq.pending&expires_at=gt.${expiration}&select=approval_id`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            status: approved ? "approved" : "rejected",
            approved_by_user_id: approved ? session.userId : null,
          }),
        }
      );

      if (!(Array.isArray(response) && response.length === 1)) {
        throw new ErroPersistenciaRemota(
          "A aprovação expirou, já foi utilizada ou pertence a outra organização.",
          409,
          "APROVACAO_EXPIRADA"
        );
      }
    },
  };
}
