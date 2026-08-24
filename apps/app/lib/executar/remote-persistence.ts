import {
  type AprovacaoCopiloto,
  type AtorOperacional,
  type EstadoOperacional,
  FERRAMENTAS_OPERACIONAIS,
} from "./domain.ts";
import {
  type ConfiguracaoSupabaseAutorizado,
  caminhoEvidenciaOrganizacao,
  criarClienteSupabaseClerk,
  prepararLotePersistencia,
  type SessaoClerkIntegracao,
} from "./integration-contract.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORAGE_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;
const EVIDENCE_BUCKET = "executar-evidencias";
const EVIDENCE_MAX_BYTES = 2_500_000;

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

export interface EntradaRunRemoto {
  readonly idempotencyKey: string;
  readonly lockKey: string;
  readonly projectId: string;
  readonly runId: string;
  readonly type: "COMMAND" | "CONNECTOR" | "PROJECTION" | "ROUTINE";
}

export interface InicioRunRemoto {
  readonly replayed: boolean;
  readonly result: Readonly<Record<string, unknown>>;
  readonly runId: string;
  readonly status: "FAILED" | "RUNNING" | "SUCCEEDED";
}

export interface ReferenciaRunRemoto {
  readonly projectId: string;
  readonly runId: string;
}

export interface LedgerRunRemoto {
  falhar(
    reference: ReferenciaRunRemoto,
    errorCode: string
  ): Promise<void>;
  finalizar(
    reference: ReferenciaRunRemoto,
    result: Readonly<Record<string, unknown>>
  ): Promise<void>;
  finalizarEfeito(
    reference: ReferenciaRunRemoto,
    effectKey: string,
    status: "FAILED" | "SUCCEEDED",
    errorCode?: string
  ): Promise<void>;
  iniciar(input: EntradaRunRemoto): Promise<InicioRunRemoto>;
  reservarEfeito(
    reference: ReferenciaRunRemoto,
    effectKey: string
  ): Promise<void>;
}

export interface PersistenciaOperacionalRemota {
  aprovar(approvalId: string, approved: boolean): Promise<void>;
  baixarEvidencia(path: string): Promise<Response>;
  carregar(): Promise<EstadoOperacional | null>;
  enviarEvidencia(
    state: EstadoOperacional,
    actor: AtorOperacional,
    taskId: string,
    file: File
  ): Promise<{ readonly path: string }>;
  salvar(
    state: EstadoOperacional,
    actor: AtorOperacional,
    expectedRevision: number
  ): Promise<{ readonly revision: number }>;
  readonly runLedger?: LedgerRunRemoto;
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

async function requisicaoAutenticada(
  client: ClientePostgrest,
  request: typeof fetch,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await client.accessToken();

  if (!token) {
    throw new ErroPersistenciaRemota(
      "A sessão Clerk foi encerrada.",
      401,
      "SESSAO_ENCERRADA"
    );
  }

  return request(`${client.url}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: client.key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

async function interpretarResposta(response: Response): Promise<unknown> {
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

async function executarRequisicao(
  client: ClientePostgrest,
  request: typeof fetch,
  path: string,
  init: RequestInit = {}
): Promise<unknown> {
  const response = await requisicaoAutenticada(client, request, path, init);

  return interpretarResposta(response);
}

function validarCaminhoStorage(path: string, organizationId: string): string {
  const segments = path.split("/");

  if (
    segments.length !== 4 ||
    segments[0] !== organizationId ||
    segments.some(
      (segment) =>
        !STORAGE_SEGMENT_PATTERN.test(segment) || segment.includes("..")
    )
  ) {
    throw new ErroPersistenciaRemota(
      "O arquivo não pertence à organização autenticada.",
      403,
      "EVIDENCIA_NAO_AUTORIZADA"
    );
  }

  return segments.map((segment) => encodeURIComponent(segment)).join("/");
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
    async baixarEvidencia(path) {
      const safePath = validarCaminhoStorage(path, session.organizationId);
      const response = await requisicaoAutenticada(
        client,
        request,
        `/storage/v1/object/authenticated/${EVIDENCE_BUCKET}/${safePath}`
      );

      if (!response.ok) {
        await interpretarResposta(response);
      }

      return response;
    },

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

    async enviarEvidencia(state, actor, taskId, file) {
      if (
        !Number.isSafeInteger(file.size) ||
        file.size <= 0 ||
        file.size > EVIDENCE_MAX_BYTES
      ) {
        throw new ErroPersistenciaRemota(
          "O arquivo da evidência deve ter entre 1 byte e 2,5 MB.",
          400,
          "EVIDENCIA_INVALIDA"
        );
      }

      const path = caminhoEvidenciaOrganizacao(state, actor, taskId, file.name);
      const safePath = validarCaminhoStorage(path, session.organizationId);
      const response = (await executarRequisicao(
        client,
        request,
        `/storage/v1/object/${EVIDENCE_BUCKET}/${safePath}`,
        {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "x-upsert": "false",
          },
          body: file,
        }
      )) as { Key?: string; path?: string } | null;
      const confirmed = response?.Key ?? response?.path;

      if (
        confirmed &&
        confirmed !== path &&
        confirmed !== `${EVIDENCE_BUCKET}/${path}`
      ) {
        throw new ErroPersistenciaRemota(
          "O Storage confirmou um arquivo fora da organização autenticada.",
          409,
          "EVIDENCIA_EXTERNA"
        );
      }

      return { path };
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
