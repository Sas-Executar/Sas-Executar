import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const load = (filename) => readFile(path.join(root, filename), "utf8");

test("Aurora permanece privado e acessível somente pela Data API", async () => {
  const template = await load("infra/aws/template.yaml");

  assert.match(template, /EnableHttpEndpoint: true/);
  assert.match(template, /PubliclyAccessible: false/);
  assert.match(template, /DeletionProtection: true/);
  assert.match(template, /StorageEncrypted: true/);
  assert.match(template, /SecurityGroupEgress: \[\]/);
  assert.doesNotMatch(template, /SecurityGroupIngress|0\.0\.0\.0\/0/);
  assert.doesNotMatch(template, /AWS::EC2::(?:InternetGateway|NatGateway|EIP)/);
});

test("S3 e role Vercel usam bloqueio público, prefixos e OIDC", async () => {
  const template = await load("infra/aws/template.yaml");

  assert.match(template, /BlockPublicAcls: true/);
  assert.match(template, /RestrictPublicBuckets: true/);
  assert.match(template, /VersioningConfiguration:\n\s+Status: Enabled/);
  assert.match(template, /aws:SecureTransport: false/);
  assert.match(template, /sts:AssumeRoleWithWebIdentity/);
  assert.match(template, /oidc\.vercel\.com\/sas-executar1:aud/);
  assert.match(template, /rds-data:ExecuteStatement/);
  assert.match(template, /secretsmanager:GetSecretValue/);
  assert.match(template, /s3:PutObject/);
  assert.doesNotMatch(template, /Action:\s*["']?\*["']?/);
});

test("migrations forçam RLS e mantêm eventos imutáveis", async () => {
  const [core, persistence] = await Promise.all([
    load("infra/aws/migrations/001_executar_core.sql"),
    load("infra/aws/migrations/002_executar_persistence.sql"),
  ]);

  assert.match(core, /force row level security/);
  assert.match(core, /executar_current_organization\(\)/);
  assert.match(core, /for select to executar_runtime/);
  assert.match(core, /for insert to executar_runtime/);
  assert.match(core, /for update to executar_runtime/);
  assert.match(core, /for delete to executar_runtime/);
  assert.match(
    core,
    /revoke update, delete on public\.executar_events from executar_runtime/
  );
  assert.match(persistence, /security invoker/g);
  assert.match(
    persistence,
    /p_payload ->> 'organization_id' is distinct from p_organization_id/
  );
  assert.doesNotMatch(`${core}\n${persistence}`, /security definer/i);
});

test("workflow assume AWS por OIDC, migra e prova isolamento real", async () => {
  const workflow = await load(".github/workflows/aws-infra.yml");

  assert.match(workflow, /aws-actions\/configure-aws-credentials@v5/);
  assert.match(workflow, /role-to-assume: \$\{\{ env\.AWS_ROLE_ARN \}\}/);
  assert.match(workflow, /250892133959/);
  assert.match(workflow, /cloudformation deploy/);
  assert.match(workflow, /freetier get-account-plan-state/);
  assert.match(workflow, /account_plan" != "PAID"/);
  assert.match(workflow, /migrate-data-api\.mjs/);
  assert.match(workflow, /smoke-data-api\.mjs/);
  assert.match(workflow, /env add[\s\S]*preview "\$GITHUB_REF_NAME"/);
  assert.doesNotMatch(workflow, /AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY/);
});

test("runtime AWS usa código server-only e credenciais temporárias Vercel", async () => {
  const [persistence, envExample] = await Promise.all([
    load("apps/app/lib/executar/aws-persistence.ts"),
    load("apps/app/.env.example"),
  ]);

  assert.match(persistence, /import "server-only"/);
  assert.match(persistence, /awsCredentialsProvider/);
  assert.match(persistence, /ExecuteStatementCommand/);
  assert.match(persistence, /PutObjectCommand/);
  assert.match(persistence, /IfNoneMatch: "\*"/);
  assert.match(envExample, /AURORA_RUNTIME_SECRET_ARN=""/);
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_(?:AWS|AURORA|EVIDENCE)/);
});
