import {
  type OrigemProjetoSupabase,
  projetoSupabaseAutorizado,
} from "./supabase-project.ts";

export type OrigemEvidencia =
  | "codigo"
  | "teste_local"
  | "servico_real"
  | "execucao_hospedada"
  | "aprovacao_humana";

export type IdentificadorEtapa =
  | "preservacao_pwa"
  | "produto_operacional"
  | "copiloto_operacional"
  | "distribuicao_operacional"
  | "template_rls_storage"
  | "identidade_clerk"
  | "supabase_novo"
  | "clerk_supabase"
  | "schema_rls_storage"
  | "isolamento_multi_tenant"
  | "persistencia_remota"
  | "sincronizacao_remota"
  | "cobranca_stripe"
  | "copiloto_servidor"
  | "modelo_ai_sdk"
  | "mcp_autenticado"
  | "colaboracao_remota"
  | "notificacoes_remotas"
  | "runner_actions"
  | "ci_verde"
  | "deploy_vercel"
  | "observabilidade_privacidade"
  | "smoke_producao"
  | "clerk_mobile"
  | "mobile_expo"
  | "lancamento";

export interface EvidenciaProntidao {
  readonly metadata?: Readonly<{
    projectOrigin?: OrigemProjetoSupabase;
    projectReference?: string;
    identityAuthority?: string;
    tenantCount?: number;
    coverage?: readonly string[];
    executedSteps?: number;
  }>;
  readonly organizationId?: string;
  readonly passed: boolean;
  readonly reference: string;
  readonly source: OrigemEvidencia;
  readonly stepId: IdentificadorEtapa;
  readonly verifiedAt: string;
}

export interface EtapaFechamento {
  readonly id: IdentificadorEtapa;
  readonly prerequisites: readonly IdentificadorEtapa[];
  readonly requiredSources: readonly OrigemEvidencia[];
  readonly requiresExternalAuthorization: boolean;
  readonly title: string;
  readonly wave: 1 | 2 | 3 | 4 | 5;
}

export interface EstadoEtapaFechamento extends EtapaFechamento {
  readonly blockedBy: readonly IdentificadorEtapa[];
  readonly evidence: EvidenciaProntidao | null;
  readonly status: "passou" | "falhou" | "pronto" | "bloqueado";
}

export interface GateFechamento {
  readonly id: "codigo" | "integracao" | "producao" | "mobile";
  readonly pending: readonly IdentificadorEtapa[];
  readonly status: "PASSOU" | "NÃO PASSOU";
}

export interface DiagnosticoActions {
  readonly conclusion: string;
  readonly executedSteps: number;
  readonly nextAction: string;
  readonly rerunAuthorized: boolean;
  readonly status:
    | "nao_executado"
    | "em_execucao"
    | "runner_sem_execucao"
    | "falhou_em_step"
    | "verde";
}

export interface ObservacaoJobActions {
  readonly conclusion: string | null;
  readonly name: string;
  readonly status: string;
  readonly steps: readonly { readonly conclusion: string | null }[];
}

const LOCAL: readonly OrigemEvidencia[] = ["teste_local"];
const SERVICO: readonly OrigemEvidencia[] = ["servico_real"];
const HOSPEDADO: readonly OrigemEvidencia[] = ["execucao_hospedada"];
const CREDENTIAL_PATTERN = /(?:sb_secret_|service_role|bearer\s)/i;
const URL_CREDENTIAL_PATTERN = /:\/\/[^/\s]+:[^/\s]+@/i;
const CLERK_ORGANIZATION_PATTERN = /^org_[A-Za-z0-9_-]+$/;

function etapa(
  id: IdentificadorEtapa,
  wave: 1 | 2 | 3 | 4 | 5,
  title: string,
  prerequisites: readonly IdentificadorEtapa[],
  requiredSources: readonly OrigemEvidencia[] = SERVICO
): EtapaFechamento {
  return {
    id,
    wave,
    title,
    prerequisites,
    requiredSources,
    requiresExternalAuthorization: requiredSources !== LOCAL,
  };
}

export const ETAPAS_FECHAMENTO: readonly EtapaFechamento[] = [
  etapa("preservacao_pwa", 1, "PWA original preservada", [], LOCAL),
  etapa(
    "produto_operacional",
    2,
    "Produto operacional canônico",
    ["preservacao_pwa"],
    LOCAL
  ),
  etapa(
    "copiloto_operacional",
    3,
    "Copiloto local com aprovação humana",
    ["produto_operacional"],
    LOCAL
  ),
  etapa(
    "distribuicao_operacional",
    4,
    "Colaboração e distribuição locais",
    ["copiloto_operacional"],
    LOCAL
  ),
  etapa(
    "template_rls_storage",
    5,
    "Template SQL multi-tenant validado",
    ["preservacao_pwa"],
    LOCAL
  ),
  etapa("identidade_clerk", 1, "Sessão e organização Clerk reais", [
    "preservacao_pwa",
  ]),
  etapa("supabase_novo", 1, "Projeto Supabase identificado e autorizado", [
    "identidade_clerk",
  ]),
  etapa("clerk_supabase", 1, "Clerk integrado como identidade de terceiros", [
    "identidade_clerk",
    "supabase_novo",
  ]),
  etapa("schema_rls_storage", 1, "Schema, RLS e Storage aplicados", [
    "clerk_supabase",
    "template_rls_storage",
  ]),
  etapa(
    "isolamento_multi_tenant",
    1,
    "SELECT, INSERT, UPDATE, DELETE e Storage isolados",
    ["schema_rls_storage"]
  ),
  etapa("persistencia_remota", 2, "Estado canônico persistido remotamente", [
    "produto_operacional",
    "isolamento_multi_tenant",
  ]),
  etapa(
    "sincronizacao_remota",
    2,
    "Sincronização entre aparelhos e reconciliação",
    ["persistencia_remota"]
  ),
  etapa("cobranca_stripe", 2, "Stripe e direitos da organização", [
    "identidade_clerk",
    "persistencia_remota",
  ]),
  etapa(
    "copiloto_servidor",
    3,
    "Ferramentas e aprovações autenticadas no servidor",
    ["copiloto_operacional", "persistencia_remota"]
  ),
  etapa("modelo_ai_sdk", 3, "Modelo real e streaming Vercel AI SDK", [
    "copiloto_servidor",
  ]),
  etapa("mcp_autenticado", 3, "Ferramentas MCP com autoridade Clerk", [
    "copiloto_servidor",
  ]),
  etapa("colaboracao_remota", 4, "Liveblocks isolado entre membros reais", [
    "distribuicao_operacional",
    "sincronizacao_remota",
  ]),
  etapa("notificacoes_remotas", 4, "Knock entrega notificações autorizadas", [
    "distribuicao_operacional",
    "identidade_clerk",
  ]),
  etapa(
    "runner_actions",
    1,
    "Runner GitHub executa steps reais",
    ["preservacao_pwa"],
    HOSPEDADO
  ),
  etapa(
    "ci_verde",
    5,
    "Instalação, typecheck, lint, testes e build verdes",
    ["runner_actions", "template_rls_storage"],
    HOSPEDADO
  ),
  etapa("deploy_vercel", 5, "Deployment Vercel concluído", [
    "ci_verde",
    "isolamento_multi_tenant",
  ]),
  etapa(
    "observabilidade_privacidade",
    5,
    "Erros, privacidade e recuperação verificáveis",
    ["deploy_vercel"]
  ),
  etapa("smoke_producao", 5, "Login, produto e evidência em produção", [
    "deploy_vercel",
    "sincronizacao_remota",
  ]),
  etapa("clerk_mobile", 4, "Sessão Clerk compatível com Expo", [
    "smoke_producao",
  ]),
  etapa("mobile_expo", 4, "Android e iOS usam o mesmo estado canônico", [
    "clerk_mobile",
    "smoke_producao",
    "sincronizacao_remota",
    "isolamento_multi_tenant",
  ]),
  etapa(
    "lancamento",
    5,
    "Lançamento autorizado com evidência verificável",
    [
      "smoke_producao",
      "observabilidade_privacidade",
      "cobranca_stripe",
      "modelo_ai_sdk",
      "mcp_autenticado",
      "colaboracao_remota",
      "notificacoes_remotas",
      "mobile_expo",
    ],
    ["aprovacao_humana"]
  ),
];

const COBERTURA_ISOLAMENTO = [
  "select",
  "insert",
  "update",
  "delete",
  "storage",
] as const;
const INDICE_ETAPAS = new Map(ETAPAS_FECHAMENTO.map((item) => [item.id, item]));

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: cada gate mantém sua validação de origem, tenant e integração real no mesmo ponto de segurança.
function validarEvidencia(
  evidence: EvidenciaProntidao,
  organizationId: string,
  now: number
): void {
  const definition = INDICE_ETAPAS.get(evidence.stepId);

  if (!definition) {
    throw new Error(`Etapa de fechamento desconhecida: ${evidence.stepId}.`);
  }

  if (!definition.requiredSources.includes(evidence.source)) {
    throw new Error(
      `A etapa ${evidence.stepId} exige evidência real compatível.`
    );
  }

  if (
    !evidence.reference.trim() ||
    CREDENTIAL_PATTERN.test(evidence.reference) ||
    URL_CREDENTIAL_PATTERN.test(evidence.reference)
  ) {
    throw new Error("A referência da evidência é inválida ou expõe segredo.");
  }

  const verifiedAt = Date.parse(evidence.verifiedAt);

  if (!Number.isFinite(verifiedAt) || verifiedAt > now) {
    throw new Error("A evidência exige uma data verificada não futura.");
  }

  if (evidence.organizationId && evidence.organizationId !== organizationId) {
    throw new Error("A evidência pertence a outra organização.");
  }

  if (!evidence.passed) {
    return;
  }

  if (
    evidence.stepId === "supabase_novo" &&
    !(
      projetoSupabaseAutorizado(
        evidence.metadata?.projectOrigin,
        evidence.metadata?.projectReference
      ) && evidence.metadata?.projectReference?.trim()
    )
  ) {
    throw new Error(
      "O Supabase precisa ser um projeto novo ou o legado nominalmente autorizado e identificável."
    );
  }

  if (
    evidence.stepId === "clerk_supabase" &&
    evidence.metadata?.identityAuthority !== "Clerk"
  ) {
    throw new Error("Clerk deve permanecer a única autoridade de identidade.");
  }

  if (evidence.stepId === "isolamento_multi_tenant") {
    const coverage = new Set(evidence.metadata?.coverage ?? []);

    if (
      (evidence.metadata?.tenantCount ?? 0) < 2 ||
      COBERTURA_ISOLAMENTO.some((operation) => !coverage.has(operation))
    ) {
      throw new Error(
        "O isolamento exige dois tenants e SELECT, INSERT, UPDATE, DELETE e Storage reais."
      );
    }
  }

  if (
    (evidence.stepId === "runner_actions" || evidence.stepId === "ci_verde") &&
    (evidence.metadata?.executedSteps ?? 0) < 1
  ) {
    throw new Error(
      "GitHub Actions não pode ser aprovado sem steps realmente executados."
    );
  }
}

export function avaliarFechamento(
  organizationId: string,
  evidence: readonly EvidenciaProntidao[],
  now = Date.now()
): readonly EstadoEtapaFechamento[] {
  if (!CLERK_ORGANIZATION_PATTERN.test(organizationId)) {
    throw new Error("A avaliação exige uma organização Clerk autenticada.");
  }

  const byStep = new Map<IdentificadorEtapa, EvidenciaProntidao>();

  for (const item of evidence) {
    validarEvidencia(item, organizationId, now);

    if (byStep.has(item.stepId)) {
      throw new Error(`A etapa ${item.stepId} possui evidências duplicadas.`);
    }

    byStep.set(item.stepId, item);
  }

  const evaluated = new Map<IdentificadorEtapa, EstadoEtapaFechamento>();

  for (const definition of ETAPAS_FECHAMENTO) {
    const observation = byStep.get(definition.id) ?? null;
    const blockedBy = definition.prerequisites.filter(
      (dependency) => evaluated.get(dependency)?.status !== "passou"
    );
    let status: EstadoEtapaFechamento["status"] = "pronto";

    if (blockedBy.length) {
      status = "bloqueado";
    } else if (observation) {
      status = observation.passed ? "passou" : "falhou";
    }

    evaluated.set(definition.id, {
      ...definition,
      status,
      evidence: observation,
      blockedBy,
    });
  }

  return [...evaluated.values()];
}

export function proximasEtapasProntas(
  steps: readonly EstadoEtapaFechamento[],
  includeExternal = true
): readonly EstadoEtapaFechamento[] {
  return steps.filter(
    (step) =>
      step.status === "pronto" &&
      (includeExternal || !step.requiresExternalAuthorization)
  );
}

export function gatesFechamento(
  steps: readonly EstadoEtapaFechamento[]
): readonly GateFechamento[] {
  const code: readonly IdentificadorEtapa[] = [
    "preservacao_pwa",
    "produto_operacional",
    "copiloto_operacional",
    "distribuicao_operacional",
    "template_rls_storage",
  ];
  const integration: readonly IdentificadorEtapa[] = [
    "identidade_clerk",
    "supabase_novo",
    "clerk_supabase",
    "schema_rls_storage",
    "isolamento_multi_tenant",
    "persistencia_remota",
    "sincronizacao_remota",
    "cobranca_stripe",
    "copiloto_servidor",
    "modelo_ai_sdk",
    "mcp_autenticado",
    "colaboracao_remota",
    "notificacoes_remotas",
    "ci_verde",
  ];
  const production: readonly IdentificadorEtapa[] = [
    ...integration,
    "deploy_vercel",
    "observabilidade_privacidade",
    "smoke_producao",
  ];
  const mobile: readonly IdentificadorEtapa[] = [
    "smoke_producao",
    "sincronizacao_remota",
    "isolamento_multi_tenant",
    "clerk_mobile",
    "mobile_expo",
  ];
  const indexed = new Map(steps.map((step) => [step.id, step]));

  return (
    [
      ["codigo", code],
      ["integracao", integration],
      ["producao", production],
      ["mobile", mobile],
    ] as const
  ).map(([id, required]) => {
    const pending = required.filter(
      (step) => indexed.get(step)?.status !== "passou"
    );
    const status: GateFechamento["status"] = pending.length
      ? "NÃO PASSOU"
      : "PASSOU";

    return { id, status, pending };
  });
}

export function diagnosticarActions(
  jobs: readonly ObservacaoJobActions[],
  rerunAuthorized = false
): DiagnosticoActions {
  if (!jobs.length) {
    return {
      status: "nao_executado",
      rerunAuthorized,
      executedSteps: 0,
      conclusion: "Nenhum job foi observado.",
      nextAction: "Confirmar se o workflow foi efetivamente disparado.",
    };
  }

  const executedSteps = jobs.reduce(
    (total, job) => total + job.steps.length,
    0
  );

  if (jobs.some((job) => job.status !== "completed")) {
    return {
      status: "em_execucao",
      rerunAuthorized,
      executedSteps,
      conclusion: "A execução hospedada ainda não terminou.",
      nextAction: "Aguardar o resultado real dos jobs hospedados.",
    };
  }

  if (jobs.some((job) => job.conclusion === "failure") && executedSteps === 0) {
    return {
      status: "runner_sem_execucao",
      rerunAuthorized,
      executedSteps,
      conclusion: "O runner falhou antes de executar qualquer step.",
      nextAction:
        "Verificar a causa real de disponibilidade ou política do runner; não atribuir cobrança sem evidência.",
    };
  }

  if (jobs.some((job) => job.conclusion !== "success")) {
    return {
      status: "falhou_em_step",
      rerunAuthorized,
      executedSteps,
      conclusion: "Um job hospedado falhou ou não concluiu com sucesso.",
      nextAction: "Inspecionar o primeiro step executado que falhou.",
    };
  }

  if (executedSteps === 0) {
    return {
      status: "runner_sem_execucao",
      rerunAuthorized,
      executedSteps,
      conclusion: "Não existe evidência de steps realmente executados.",
      nextAction: "Confirmar execução efetiva antes de aprovar o CI.",
    };
  }

  return {
    status: "verde",
    rerunAuthorized,
    executedSteps,
    conclusion: "Todos os jobs executados terminaram com sucesso.",
    nextAction:
      "Registrar a URL e os steps executados como evidência hospedada.",
  };
}
