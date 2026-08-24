import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  avaliarProducao,
  ETAPAS_PRODUCAO,
  gatesProducao,
} from "../../apps/app/lib/executar/production-readiness.ts";

const now = new Date("2026-08-24T13:00:00.000Z").getTime();
const verifiedAt = "2026-08-24T12:00:00.000Z";

function evidence(stepId, changes = {}) {
  const step = ETAPAS_PRODUCAO.find((item) => item.id === stepId);
  const metadata = {
    ...(stepId === "clerk_real" ? { identityAuthority: "Clerk" } : {}),
    ...(stepId === "actions_verde" ? { executedSteps: 12 } : {}),
    ...(stepId === "aws_conta_paid" ? { accountId: "250892133959" } : {}),
    ...(stepId === "cloudformation_aws" ? { region: "sa-east-1" } : {}),
    ...(stepId === "isolamento_rls"
      ? {
          tenantCount: 2,
          coverage: ["select", "insert", "update", "delete"],
        }
      : {}),
    ...(stepId === "piloto_sete_dias" ? { days: 7 } : {}),
    ...(stepId === "zero_critical" ? { criticalCount: 0 } : {}),
  };

  return {
    stepId,
    source: step?.requiredSource ?? "servico_real",
    reference: `evidence/${stepId}`,
    verifiedAt,
    passed: true,
    ...(Object.keys(metadata).length ? { metadata } : {}),
    ...changes,
  };
}

const codeSteps = [
  "pwa_preservada",
  "fundacao_local",
  "produto_operacional",
  "copiloto_agent007",
  "contratos_distribuicao",
  "gtm_local",
];

test("readiness canônica usa somente AWS, Clerk e Vercel", async () => {
  const source = await readFile(
    new URL(
      "../../apps/app/lib/executar/production-readiness.ts",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(source, /cloudformation_aws/);
  assert.match(source, /aurora_data_api/);
  assert.match(source, /s3_isolado/);
  assert.match(source, /oidc_vercel_aws/);
  assert.doesNotMatch(source, /supabase/i);
});

test("grafo de produção é topológico e não duplica etapas", () => {
  const known = new Set();

  for (const step of ETAPAS_PRODUCAO) {
    assert.ok(!known.has(step.id), step.id);

    for (const dependency of step.prerequisites) {
      assert.ok(known.has(dependency), `${step.id} depende de ${dependency}`);
    }

    known.add(step.id);
  }

  assert.equal(known.size, 32);
});

test("código local não fabrica integração, produção ou mobile", () => {
  const gates = gatesProducao(
    avaliarProducao(codeSteps.map((stepId) => evidence(stepId)), now)
  );

  assert.equal(gates.find((gate) => gate.id === "codigo").status, "PASSOU");
  assert.equal(
    gates.find((gate) => gate.id === "integracao").status,
    "NÃO PASSOU"
  );
  assert.equal(
    gates.find((gate) => gate.id === "producao").status,
    "NÃO PASSOU"
  );
  assert.equal(gates.find((gate) => gate.id === "mobile").status, "NÃO PASSOU");
});

test("todos os gates só passam com evidência compatível por etapa", () => {
  const steps = avaliarProducao(
    ETAPAS_PRODUCAO.map((step) => evidence(step.id)),
    now
  );

  assert.ok(steps.every((step) => step.status === "passou"));
  assert.ok(gatesProducao(steps).every((gate) => gate.status === "PASSOU"));
});

test("RLS exige dois tenants e quatro operações reais", () => {
  assert.throws(
    () =>
      avaliarProducao(
        [
          evidence("isolamento_rls", {
            metadata: { tenantCount: 1, coverage: ["select"] },
          }),
        ],
        now
      ),
    /dois tenants/
  );
});

test("AWS recusa conta ou região diferentes da autorização", () => {
  assert.throws(
    () =>
      avaliarProducao(
        [evidence("aws_conta_paid", { metadata: { accountId: "000000000000" } })],
        now
      ),
    /conta autorizada/
  );
  assert.throws(
    () =>
      avaliarProducao(
        [evidence("cloudformation_aws", { metadata: { region: "us-east-1" } })],
        now
      ),
    /sa-east-1/
  );
});

test("piloto e sign-off não podem ser simulados por teste local", () => {
  assert.throws(
    () =>
      avaliarProducao(
        [evidence("piloto_sete_dias", { metadata: { days: 6 } })],
        now
      ),
    /sete dias/
  );
  assert.throws(
    () =>
      avaliarProducao(
        [evidence("signoff_gtm", { source: "teste_local" })],
        now
      ),
    /aprovacao_humana/
  );
});

test("CSP, rate limit e privacidade estão ligados ao runtime", async () => {
  const [security, proxy, routes, webhook, rateLimit] = await Promise.all([
    readFile(
      new URL("../../packages/security/proxy.ts", import.meta.url),
      "utf8"
    ),
    readFile(new URL("../../apps/app/proxy.ts", import.meta.url), "utf8"),
    Promise.all(
      ["state", "approvals", "copilot", "evidence"].map((route) =>
        readFile(
          new URL(
            `../../apps/app/app/api/executar/${route}/route.ts`,
            import.meta.url
          ),
          "utf8"
        )
      )
    ),
    readFile(
      new URL("../../apps/api/app/webhooks/auth/route.ts", import.meta.url),
      "utf8"
    ),
    readFile(
      new URL("../../packages/rate-limit/index.ts", import.meta.url),
      "utf8"
    ),
  ]);

  assert.match(security, /default-src 'self'/);
  assert.match(security, /frame-ancestors 'none'/);
  assert.match(proxy, /Content-Security-Policy/);
  assert.ok(routes.every((source) => /exigirLimiteOperacional/.test(source)));
  assert.match(rateLimit, /limitOperationalMutation/);
  assert.match(rateLimit, /distributed: false/);
  assert.doesNotMatch(webhook, /\{ id, eventType, body \}/);
});

test("cron legado degrada sem DATABASE_URL e não gera erro operacional", async () => {
  const source = await readFile(
    new URL("../../apps/api/app/cron/keep-alive/route.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /databaseAvailable/);
  assert.match(source, /skipped: true/);
  assert.match(source, /Aurora Data API/);
});
