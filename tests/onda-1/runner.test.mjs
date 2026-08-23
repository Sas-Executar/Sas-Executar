import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const canonicalRepository = "Sas-Executar/Sas-Executar";
const legacyDirectory = "apps/app/public/legado/sprint-operacional/";
const load = (filename) => readFile(path.join(root, filename), "utf8");

test("AGENTS identifica o repositório canônico e a PWA preservada", async () => {
  const agents = await load("AGENTS.md");
  assert.ok(agents.includes(canonicalRepository));
  assert.ok(agents.includes(legacyDirectory));
  assert.ok(agents.includes("docs/runner/PLANO_SAAS_4_ONDAS.md"));
});

test("runner e plano usam o next-forge como repositório de execução", async () => {
  for (const filename of [
    "docs/runner/README.md",
    "docs/runner/PLANO_SAAS_4_ONDAS.md",
    "docs/runner/RUNNER_CODEX.md",
    "docs/runner/USER_MESSAGE_CODEX.md",
    "docs/runner/INVENTARIO_LEGADO.md",
    "docs/runner/PWA_ORIGINAL.md",
  ]) {
    const content = await load(filename);
    assert.ok(content.includes(canonicalRepository), filename);
  }
});

test("plano preserva quatro ondas e autoridade de identidade do Clerk", async () => {
  const plan = await load("docs/runner/PLANO_SAAS_4_ONDAS.md");
  for (const wave of ["ONDA 1", "ONDA 2", "ONDA 3", "ONDA 4"]) {
    assert.ok(plan.includes(wave), wave);
  }
  assert.ok(plan.includes("Clerk é a autoridade"));
  assert.ok(plan.includes("AWS é a plataforma de dados transversal"));
  assert.ok(plan.includes("Aurora PostgreSQL privado"));
});

test("configuração Vercel preserva headers e escopo do service worker", async () => {
  const config = JSON.parse(await load("apps/app/vercel.json"));
  const serviceWorker = config.headers.find((entry) =>
    entry.source.endsWith("/sw.js")
  );
  assert.ok(serviceWorker);
  assert.ok(
    serviceWorker.headers.some(
      (header) =>
        header.key === "Service-Worker-Allowed" &&
        header.value === "/legado/sprint-operacional/"
    )
  );
});

test("rota Next.js direciona para a aplicação legada preservada", async () => {
  const route = await load("apps/app/app/legado/sprint-operacional/route.ts");
  assert.ok(route.includes("/legado/sprint-operacional/index.html"));
  assert.ok(route.includes("NextResponse.redirect"));
});

test("exemplo declara integração AWS somente no servidor", async () => {
  const appEnv = await load("apps/app/.env.example");
  for (const variable of [
    "AWS_REGION=",
    "AWS_ROLE_ARN=",
    "AURORA_DATABASE=",
    "AURORA_RESOURCE_ARN=",
    "AURORA_RUNTIME_SECRET_ARN=",
    "EVIDENCE_BUCKET=",
  ]) {
    assert.ok(appEnv.includes(variable), variable);
  }
  assert.ok(!appEnv.includes("DATABASE_URL="));
  assert.ok(!appEnv.includes("DIRECT_URL="));
  assert.doesNotMatch(appEnv, /NEXT_PUBLIC_(?:AWS|AURORA|EVIDENCE)/);
  assert.doesNotMatch(appEnv, /NEXT_PUBLIC_SUPABASE/);
});
