export type FonteEvidenciaProducao =
  | "teste_local"
  | "execucao_hospedada"
  | "servico_real"
  | "piloto_real"
  | "aprovacao_humana";

export type EtapaProducaoId =
  | "pwa_preservada"
  | "fundacao_local"
  | "produto_operacional"
  | "copiloto_agent007"
  | "contratos_distribuicao"
  | "gtm_local"
  | "clerk_real"
  | "actions_verde"
  | "aws_conta_paid"
  | "cloudformation_aws"
  | "aurora_data_api"
  | "isolamento_rls"
  | "s3_isolado"
  | "oidc_vercel_aws"
  | "sincronizacao_aparelhos"
  | "stripe_organizacao"
  | "ai_gateway_real"
  | "mcp_autenticado"
  | "colaboracao_real"
  | "notificacoes_reais"
  | "preview_vercel"
  | "golden_path_e2e"
  | "observabilidade_limpa"
  | "backup_restore"
  | "rollback_comprovado"
  | "privacidade_legal"
  | "piloto_sete_dias"
  | "zero_critical"
  | "signoff_gtm"
  | "clerk_mobile"
  | "eas_android"
  | "eas_ios";

export interface EvidenciaProducao {
  readonly metadata?: Readonly<{
    accountId?: string;
    coverage?: readonly string[];
    criticalCount?: number;
    days?: number;
    executedSteps?: number;
    identityAuthority?: string;
    region?: string;
    tenantCount?: number;
  }>;
  readonly passed: boolean;
  readonly reference: string;
  readonly source: FonteEvidenciaProducao;
  readonly stepId: EtapaProducaoId;
  readonly verifiedAt: string;
}

export interface EtapaProducao {
  readonly id: EtapaProducaoId;
  readonly prerequisites: readonly EtapaProducaoId[];
  readonly requiredSource: FonteEvidenciaProducao;
  readonly title: string;
  readonly wave: 1 | 2 | 3 | 4;
}

export interface EstadoEtapaProducao extends EtapaProducao {
  readonly blockedBy: readonly EtapaProducaoId[];
  readonly evidence: EvidenciaProducao | null;
  readonly status: "bloqueado" | "falhou" | "passou" | "pronto";
}

export interface GateProducao {
  readonly id: "codigo" | "integracao" | "producao" | "mobile";
  readonly pending: readonly EtapaProducaoId[];
  readonly status: "NÃO PASSOU" | "PASSOU";
}

const LOCAL: FonteEvidenciaProducao = "teste_local";
const HOSTED: FonteEvidenciaProducao = "execucao_hospedada";
const SERVICE: FonteEvidenciaProducao = "servico_real";

const step = (
  id: EtapaProducaoId,
  wave: EtapaProducao["wave"],
  title: string,
  prerequisites: readonly EtapaProducaoId[],
  requiredSource: FonteEvidenciaProducao
): EtapaProducao => ({ id, wave, title, prerequisites, requiredSource });

export const ETAPAS_PRODUCAO: readonly EtapaProducao[] = [
  step("pwa_preservada", 1, "PWA e referência visual preservadas", [], LOCAL),
  step(
    "fundacao_local",
    1,
    "Build, tipos, lint, segurança e testes locais",
    ["pwa_preservada"],
    LOCAL
  ),
  step(
    "produto_operacional",
    2,
    "Domínio, local-first e evidências executáveis",
    ["fundacao_local"],
    LOCAL
  ),
  step(
    "copiloto_agent007",
    3,
    "Copiloto e Agent-007 com aprovação e ledger",
    ["produto_operacional"],
    LOCAL
  ),
  step(
    "contratos_distribuicao",
    4,
    "Colaboração, notificações e contratos mobile",
    ["copiloto_agent007"],
    LOCAL
  ),
  step(
    "gtm_local",
    4,
    "Landing, onboarding, analytics e suporte preparados",
    ["contratos_distribuicao"],
    LOCAL
  ),
  step(
    "clerk_real",
    1,
    "Sessão e organização Clerk reais",
    ["pwa_preservada"],
    SERVICE
  ),
  step(
    "actions_verde",
    1,
    "GitHub Actions executa todos os checks",
    ["fundacao_local"],
    HOSTED
  ),
  step(
    "aws_conta_paid",
    1,
    "Conta AWS compatível com Aurora privado",
    ["clerk_real"],
    SERVICE
  ),
  step(
    "cloudformation_aws",
    1,
    "CloudFormation aplicado em sa-east-1",
    ["aws_conta_paid", "actions_verde"],
    SERVICE
  ),
  step(
    "aurora_data_api",
    1,
    "Aurora privado e migrations via Data API",
    ["cloudformation_aws"],
    SERVICE
  ),
  step(
    "isolamento_rls",
    1,
    "RLS comprovada com dois tenants",
    ["aurora_data_api"],
    SERVICE
  ),
  step(
    "s3_isolado",
    1,
    "S3 privado e prefixos isolados por organização",
    ["cloudformation_aws"],
    SERVICE
  ),
  step(
    "oidc_vercel_aws",
    1,
    "Runtime Vercel assume AWS por OIDC",
    ["cloudformation_aws"],
    SERVICE
  ),
  step(
    "sincronizacao_aparelhos",
    2,
    "Sincronização, conflito e offline entre aparelhos",
    ["isolamento_rls", "oidc_vercel_aws"],
    SERVICE
  ),
  step(
    "stripe_organizacao",
    2,
    "Stripe concede direitos à organização",
    ["clerk_real", "sincronizacao_aparelhos"],
    SERVICE
  ),
  step(
    "ai_gateway_real",
    3,
    "AI Gateway responde com estado canônico",
    ["sincronizacao_aparelhos", "copiloto_agent007"],
    SERVICE
  ),
  step(
    "mcp_autenticado",
    3,
    "MCP respeita Clerk, tenant e aprovação",
    ["ai_gateway_real"],
    SERVICE
  ),
  step(
    "colaboracao_real",
    4,
    "Liveblocks isolado entre organizações",
    ["sincronizacao_aparelhos", "contratos_distribuicao"],
    SERVICE
  ),
  step(
    "notificacoes_reais",
    4,
    "Knock entrega somente a membros autorizados",
    ["clerk_real", "contratos_distribuicao"],
    SERVICE
  ),
  step(
    "preview_vercel",
    4,
    "Preview Vercel READY no mesmo SHA",
    ["actions_verde", "oidc_vercel_aws"],
    HOSTED
  ),
  step(
    "golden_path_e2e",
    4,
    "Golden path completo no Preview",
    [
      "preview_vercel",
      "stripe_organizacao",
      "mcp_autenticado",
      "colaboracao_real",
      "notificacoes_reais",
    ],
    HOSTED
  ),
  step(
    "observabilidade_limpa",
    4,
    "Logs, métricas e alertas sem erro crítico",
    ["golden_path_e2e"],
    SERVICE
  ),
  step(
    "backup_restore",
    4,
    "Backup e restauração comprovados",
    ["aurora_data_api", "s3_isolado"],
    SERVICE
  ),
  step(
    "rollback_comprovado",
    4,
    "Rollback do mesmo artefato comprovado",
    ["preview_vercel", "backup_restore"],
    SERVICE
  ),
  step(
    "privacidade_legal",
    4,
    "Privacidade e termos correspondem ao runtime",
    ["golden_path_e2e"],
    SERVICE
  ),
  step(
    "piloto_sete_dias",
    4,
    "Piloto real de sete dias concluído",
    ["golden_path_e2e", "observabilidade_limpa"],
    "piloto_real"
  ),
  step(
    "zero_critical",
    4,
    "Zero achado CRITICAL aberto",
    ["rollback_comprovado", "piloto_sete_dias", "privacidade_legal"],
    SERVICE
  ),
  step(
    "signoff_gtm",
    4,
    "Sign-off humano para GTM",
    ["zero_critical"],
    "aprovacao_humana"
  ),
  step(
    "clerk_mobile",
    4,
    "Sessão Clerk móvel validada",
    ["golden_path_e2e"],
    SERVICE
  ),
  step(
    "eas_android",
    4,
    "Build Android reproduzível",
    ["clerk_mobile", "sincronizacao_aparelhos"],
    SERVICE
  ),
  step(
    "eas_ios",
    4,
    "Build iOS reproduzível",
    ["clerk_mobile", "sincronizacao_aparelhos"],
    SERVICE
  ),
] as const;

const INDEX = new Map(ETAPAS_PRODUCAO.map((item) => [item.id, item]));
const REFERENCE_SECRET_PATTERN =
  /(?:bearer\s|secret|service[_-]?role|token=|password=)/i;
const COVERAGE = ["select", "insert", "update", "delete"] as const;

type PassingValidator = (evidence: EvidenciaProducao) => void;

const passingValidators: Partial<
  Readonly<Record<EtapaProducaoId, PassingValidator>>
> = {
  clerk_real(evidence) {
    if (evidence.metadata?.identityAuthority !== "Clerk") {
      throw new Error("Clerk deve permanecer a autoridade de identidade.");
    }
  },
  aws_conta_paid(evidence) {
    if (evidence.metadata?.accountId !== "250892133959") {
      throw new Error("A integração AWS precisa usar a conta autorizada.");
    }
  },
  cloudformation_aws(evidence) {
    if (evidence.metadata?.region !== "sa-east-1") {
      throw new Error("A stack canônica deve ser aplicada em sa-east-1.");
    }
  },
  isolamento_rls(evidence) {
    const coverage = new Set(evidence.metadata?.coverage ?? []);
    const missingOperation = COVERAGE.some((item) => !coverage.has(item));

    if ((evidence.metadata?.tenantCount ?? 0) < 2 || missingOperation) {
      throw new Error(
        "RLS exige dois tenants e SELECT, INSERT, UPDATE e DELETE reais."
      );
    }
  },
  actions_verde(evidence) {
    if ((evidence.metadata?.executedSteps ?? 0) < 1) {
      throw new Error("Actions exige steps realmente executados.");
    }
  },
  piloto_sete_dias(evidence) {
    if ((evidence.metadata?.days ?? 0) < 7) {
      throw new Error("O piloto precisa cobrir sete dias corridos.");
    }
  },
  zero_critical(evidence) {
    if (evidence.metadata?.criticalCount !== 0) {
      throw new Error("O gate GTM exige zero CRITICAL aberto.");
    }
  },
};

function validateEvidence(evidence: EvidenciaProducao, now: number): void {
  const definition = INDEX.get(evidence.stepId);

  if (!definition) {
    throw new Error(`Etapa de produção desconhecida: ${evidence.stepId}.`);
  }

  if (evidence.source !== definition.requiredSource) {
    throw new Error(
      `A etapa ${evidence.stepId} exige evidência ${definition.requiredSource}.`
    );
  }

  if (
    !evidence.reference.trim() ||
    REFERENCE_SECRET_PATTERN.test(evidence.reference)
  ) {
    throw new Error("A referência da evidência é inválida ou expõe segredo.");
  }

  const verifiedAt = Date.parse(evidence.verifiedAt);

  if (!Number.isFinite(verifiedAt) || verifiedAt > now) {
    throw new Error("A evidência exige data válida e não futura.");
  }

  if (!evidence.passed) {
    return;
  }

  passingValidators[evidence.stepId]?.(evidence);
}

function statusEtapa(
  blockedBy: readonly EtapaProducaoId[],
  observation: EvidenciaProducao | null
): EstadoEtapaProducao["status"] {
  if (blockedBy.length) {
    return "bloqueado";
  }

  if (!observation) {
    return "pronto";
  }

  return observation.passed ? "passou" : "falhou";
}

export function avaliarProducao(
  evidence: readonly EvidenciaProducao[],
  now = Date.now()
): readonly EstadoEtapaProducao[] {
  const observations = new Map<EtapaProducaoId, EvidenciaProducao>();

  for (const observation of evidence) {
    validateEvidence(observation, now);

    if (observations.has(observation.stepId)) {
      throw new Error(
        `A etapa ${observation.stepId} possui evidência duplicada.`
      );
    }

    observations.set(observation.stepId, observation);
  }

  const evaluated = new Map<EtapaProducaoId, EstadoEtapaProducao>();

  for (const definition of ETAPAS_PRODUCAO) {
    const blockedBy = definition.prerequisites.filter(
      (dependency) => evaluated.get(dependency)?.status !== "passou"
    );
    const observation = observations.get(definition.id) ?? null;
    const status = statusEtapa(blockedBy, observation);

    evaluated.set(definition.id, {
      ...definition,
      blockedBy,
      evidence: observation,
      status,
    });
  }

  return [...evaluated.values()];
}

export function gatesProducao(
  steps: readonly EstadoEtapaProducao[]
): readonly GateProducao[] {
  const code: readonly EtapaProducaoId[] = [
    "pwa_preservada",
    "fundacao_local",
    "produto_operacional",
    "copiloto_agent007",
    "contratos_distribuicao",
    "gtm_local",
  ];
  const integration: readonly EtapaProducaoId[] = ETAPAS_PRODUCAO.map(
    (item) => item.id
  ).filter(
    (id) =>
      !(
        code.includes(id) ||
        [
          "golden_path_e2e",
          "observabilidade_limpa",
          "backup_restore",
          "rollback_comprovado",
          "privacidade_legal",
          "piloto_sete_dias",
          "zero_critical",
          "signoff_gtm",
          "clerk_mobile",
          "eas_android",
          "eas_ios",
        ].includes(id)
      )
  );
  const production: readonly EtapaProducaoId[] = [
    ...integration,
    "golden_path_e2e",
    "observabilidade_limpa",
    "backup_restore",
    "rollback_comprovado",
    "privacidade_legal",
    "piloto_sete_dias",
    "zero_critical",
    "signoff_gtm",
  ];
  const mobile: readonly EtapaProducaoId[] = [
    "golden_path_e2e",
    "sincronizacao_aparelhos",
    "isolamento_rls",
    "clerk_mobile",
    "eas_android",
    "eas_ios",
  ];
  const byId = new Map(steps.map((item) => [item.id, item]));

  return (
    [
      ["codigo", code],
      ["integracao", integration],
      ["producao", production],
      ["mobile", mobile],
    ] as const
  ).map(([id, required]) => {
    const pending = required.filter(
      (stepId) => byId.get(stepId)?.status !== "passou"
    );

    return { id, pending, status: pending.length ? "NÃO PASSOU" : "PASSOU" };
  });
}
