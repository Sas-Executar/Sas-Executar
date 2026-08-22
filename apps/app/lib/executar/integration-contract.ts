import {
  type AtorOperacional,
  type EstadoOperacional,
  estadoEntrega,
  prepararSincronizacao,
} from "./domain.ts";
import {
  type OrigemProjetoSupabase,
  projetoSupabaseAutorizado,
} from "./supabase-project.ts";

const CLERK_ORGANIZATION_PATTERN = /^org_[A-Za-z0-9_-]+$/;
const CLERK_USER_PATTERN = /^user_[A-Za-z0-9_-]+$/;
const EXPOSED_SECRET_PATTERN =
  /^NEXT_PUBLIC_.*(?:SECRET|SERVICE_ROLE|PRIVATE)/i;
const SUPABASE_REFERENCE_PATTERN = /^[a-z0-9]{8,32}$/i;
const SUPABASE_SECRET_PATTERN = /service_role|sb_secret_/i;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]+$/;

export const VARIAVEIS_INTEGRACAO_ESSENCIAIS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
] as const;

export const VARIAVEIS_INTEGRACAO_OPCIONAIS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "STRIPE_SECRET_KEY",
  "LIVEBLOCKS_SECRET",
  "KNOCK_SECRET_API_KEY",
  "NEXT_PUBLIC_KNOCK_API_KEY",
  "NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID",
] as const;

export const VARIAVEIS_INTEGRACAO_FINAL = [
  ...VARIAVEIS_INTEGRACAO_ESSENCIAIS,
  ...VARIAVEIS_INTEGRACAO_OPCIONAIS,
] as const;

export interface SessaoClerkIntegracao {
  getToken(): Promise<string | null>;
  readonly organizationId: string;
  readonly userId: string;
}

export interface ConfiguracaoSupabaseAutorizado {
  readonly projectOrigin: OrigemProjetoSupabase;
  readonly projectReference: string;
  readonly publishableKey: string;
  readonly url: string;
}

export interface ContratoClienteSupabase {
  readonly accessToken: () => Promise<string | null>;
}

export interface LotePersistenciaOperacional {
  readonly activeProjectId: string;
  readonly actorId: string;
  readonly authority: "Clerk";
  readonly deliveries: readonly {
    organization_id: string;
    project_id: string;
    delivery_id: string;
    title: string;
    front: string;
    operational_date: string;
    estimate_minutes: number;
    stage: number;
    definition_of_done: string | null;
    status: ReturnType<typeof estadoEntrega>;
    started_steps: number;
  }[];
  readonly dependencies: readonly {
    organization_id: string;
    project_id: string;
    delivery_id: string;
    predecessor_id: string;
  }[];
  readonly organizationId: string;
  readonly projects: readonly {
    organization_id: string;
    project_id: string;
    name: string;
    daily_capacity_minutes: number;
  }[];
  readonly revision: number;
  readonly sync: ReturnType<typeof prepararSincronizacao>;
}

function validarSessao(
  organizationId: string,
  session: Pick<SessaoClerkIntegracao, "organizationId" | "userId">
): void {
  if (!CLERK_ORGANIZATION_PATTERN.test(organizationId)) {
    throw new Error("A integração exige uma organização Clerk válida.");
  }

  if (session.organizationId !== organizationId) {
    throw new Error("A sessão Clerk não pode acessar outra organização.");
  }

  if (!CLERK_USER_PATTERN.test(session.userId)) {
    throw new Error("A integração exige um usuário Clerk autenticado.");
  }
}

export function diagnosticarAmbienteFinal(
  environment: Readonly<Record<string, string | undefined>>
): {
  readonly configured: readonly string[];
  readonly missing: readonly string[];
  readonly optionalMissing: readonly string[];
  readonly requiredMissing: readonly string[];
  readonly safe: true;
} {
  for (const [key, value] of Object.entries(environment)) {
    if (value && EXPOSED_SECRET_PATTERN.test(key)) {
      throw new Error(
        `A variável ${key} expõe uma credencial privada ao navegador.`
      );
    }
  }

  return {
    configured: VARIAVEIS_INTEGRACAO_FINAL.filter((key) =>
      Boolean(environment[key]?.trim())
    ),
    missing: VARIAVEIS_INTEGRACAO_FINAL.filter(
      (key) => !environment[key]?.trim()
    ),
    optionalMissing: VARIAVEIS_INTEGRACAO_OPCIONAIS.filter(
      (key) => !environment[key]?.trim()
    ),
    requiredMissing: VARIAVEIS_INTEGRACAO_ESSENCIAIS.filter(
      (key) => !environment[key]?.trim()
    ),
    safe: true,
  };
}

export function criarClienteSupabaseClerk<T>(
  configuration: ConfiguracaoSupabaseAutorizado,
  session: SessaoClerkIntegracao,
  factory: (
    url: string,
    publishableKey: string,
    options: ContratoClienteSupabase
  ) => T
): T {
  validarSessao(session.organizationId, session);

  if (
    !(
      projetoSupabaseAutorizado(
        configuration.projectOrigin,
        configuration.projectReference
      ) && SUPABASE_REFERENCE_PATTERN.test(configuration.projectReference)
    )
  ) {
    throw new Error(
      "Supabase deve ser um projeto novo ou o legado nominalmente autorizado para o EXECUTAR."
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(configuration.url);
  } catch {
    throw new Error("A URL do projeto Supabase é inválida.");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== `${configuration.projectReference}.supabase.co` ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "A URL não pertence ao projeto Supabase autorizado e identificado."
    );
  }

  if (
    !configuration.publishableKey.startsWith("sb_publishable_") ||
    SUPABASE_SECRET_PATTERN.test(configuration.publishableKey)
  ) {
    throw new Error(
      "A integração cliente exige somente uma chave publicável Supabase."
    );
  }

  return factory(configuration.url, configuration.publishableKey, {
    accessToken: async () => session.getToken(),
  });
}

export function caminhoEvidenciaOrganizacao(
  state: EstadoOperacional,
  actor: AtorOperacional,
  taskId: string,
  fileName: string
): string {
  validarSessao(state.organizationId, actor);

  if (
    !(
      SAFE_IDENTIFIER_PATTERN.test(state.activeProjectId) &&
      SAFE_IDENTIFIER_PATTERN.test(taskId)
    )
  ) {
    throw new Error("Projeto ou entrega inválida para o caminho de evidência.");
  }

  if (
    !state.projects.some(
      (project) =>
        project.id === state.activeProjectId &&
        project.tasks.some((task) => task.id === taskId)
    )
  ) {
    throw new Error("A entrega não pertence ao projeto ativo da organização.");
  }

  const normalized = fileName.trim().replace(/[^A-Za-z0-9._-]+/g, "-");

  if (
    !normalized ||
    normalized === "." ||
    normalized === ".." ||
    normalized.includes("..")
  ) {
    throw new Error("O nome do arquivo de evidência é inválido.");
  }

  return `${state.organizationId}/${state.activeProjectId}/${taskId}/${normalized}`;
}

export function prepararLotePersistencia(
  state: EstadoOperacional,
  actor: AtorOperacional,
  syncedRevision = 0
): LotePersistenciaOperacional {
  validarSessao(state.organizationId, actor);

  return {
    authority: "Clerk",
    organizationId: state.organizationId,
    actorId: actor.userId,
    activeProjectId: state.activeProjectId,
    revision: state.revision,
    projects: state.projects.map((project) => ({
      organization_id: state.organizationId,
      project_id: project.id,
      name: project.name,
      daily_capacity_minutes: project.dailyCapacityMinutes,
    })),
    deliveries: state.projects.flatMap((project) => {
      const projectState =
        project.id === state.activeProjectId
          ? state
          : {
              ...state,
              activeProjectId: project.id,
              done: project.snapshot?.done ?? [],
              evidence: project.snapshot?.evidence ?? [],
              focus: project.snapshot?.focus ?? null,
              started: project.snapshot?.started ?? {},
            };

      return project.tasks.map((task) => ({
        organization_id: state.organizationId,
        project_id: project.id,
        delivery_id: task.id,
        title: task.title,
        front: task.front,
        operational_date: task.date,
        estimate_minutes: task.mins,
        stage: task.stage,
        definition_of_done: task.dod ?? null,
        status: estadoEntrega(task, projectState),
        started_steps: projectState.started[task.id] ?? 0,
      }));
    }),
    dependencies: state.projects.flatMap((project) =>
      project.tasks.flatMap((task) =>
        task.deps.map((predecessor) => ({
          organization_id: state.organizationId,
          project_id: project.id,
          delivery_id: task.id,
          predecessor_id: predecessor,
        }))
      )
    ),
    sync: prepararSincronizacao(state, state.organizationId, syncedRevision),
  };
}
