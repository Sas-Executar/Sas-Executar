import {
  prepararSincronizacao,
  type AtorOperacional,
  type EstadoOperacional,
} from "./domain.ts";

export const VARIAVEIS_INTEGRACAO_FINAL = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "LIVEBLOCKS_SECRET",
  "KNOCK_SECRET_API_KEY",
  "NEXT_PUBLIC_KNOCK_API_KEY",
  "NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID",
] as const;

export interface SessaoClerkIntegracao {
  readonly organizationId: string;
  readonly userId: string;
  getToken(): Promise<string | null>;
}

export interface ConfiguracaoSupabaseNovo {
  readonly projectOrigin: "novo" | "existente";
  readonly projectReference: string;
  readonly url: string;
  readonly publishableKey: string;
}

export interface ContratoClienteSupabase {
  readonly accessToken: () => Promise<string | null>;
}

export interface LotePersistenciaOperacional {
  readonly authority: "Clerk";
  readonly organizationId: string;
  readonly actorId: string;
  readonly activeProjectId: string;
  readonly revision: number;
  readonly projects: readonly {
    organization_id: string;
    project_id: string;
    name: string;
    daily_capacity_minutes: number;
  }[];
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
  }[];
  readonly dependencies: readonly {
    organization_id: string;
    project_id: string;
    delivery_id: string;
    predecessor_id: string;
  }[];
  readonly sync: ReturnType<typeof prepararSincronizacao>;
}

function validarSessao(
  organizationId: string,
  session: Pick<SessaoClerkIntegracao, "organizationId" | "userId">
): void {
  if (!/^org_[A-Za-z0-9_-]+$/.test(organizationId)) {
    throw new Error("A integração exige uma organização Clerk válida.");
  }

  if (session.organizationId !== organizationId) {
    throw new Error("A sessão Clerk não pode acessar outra organização.");
  }

  if (!/^user_[A-Za-z0-9_-]+$/.test(session.userId)) {
    throw new Error("A integração exige um usuário Clerk autenticado.");
  }
}

export function diagnosticarAmbienteFinal(
  environment: Readonly<Record<string, string | undefined>>
): {
  readonly configured: readonly string[];
  readonly missing: readonly string[];
  readonly safe: true;
} {
  for (const [key, value] of Object.entries(environment)) {
    if (value && /^NEXT_PUBLIC_.*(?:SECRET|SERVICE_ROLE|PRIVATE)/i.test(key)) {
      throw new Error(`A variável ${key} expõe uma credencial privada ao navegador.`);
    }
  }

  return {
    configured: VARIAVEIS_INTEGRACAO_FINAL.filter((key) =>
      Boolean(environment[key]?.trim())
    ),
    missing: VARIAVEIS_INTEGRACAO_FINAL.filter(
      (key) => !environment[key]?.trim()
    ),
    safe: true,
  };
}

export function criarClienteSupabaseClerk<T>(
  configuration: ConfiguracaoSupabaseNovo,
  session: SessaoClerkIntegracao,
  factory: (
    url: string,
    publishableKey: string,
    options: ContratoClienteSupabase
  ) => T
): T {
  validarSessao(session.organizationId, session);

  if (
    configuration.projectOrigin !== "novo" ||
    !/^[a-z0-9]{8,32}$/i.test(configuration.projectReference)
  ) {
    throw new Error("Supabase deve ser um projeto novo e dedicado ao EXECUTAR.");
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
    throw new Error("A URL não pertence ao novo projeto Supabase identificado.");
  }

  if (
    !configuration.publishableKey.startsWith("sb_publishable_") ||
    /service_role|sb_secret_/i.test(configuration.publishableKey)
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
    !/^[A-Za-z0-9_-]+$/.test(state.activeProjectId) ||
    !/^[A-Za-z0-9_-]+$/.test(taskId)
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
    deliveries: state.projects.flatMap((project) =>
      project.tasks.map((task) => ({
        organization_id: state.organizationId,
        project_id: project.id,
        delivery_id: task.id,
        title: task.title,
        front: task.front,
        operational_date: task.date,
        estimate_minutes: task.mins,
        stage: task.stage,
        definition_of_done: task.dod ?? null,
      }))
    ),
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
