import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

async function json(path) {
  return JSON.parse(await text(path));
}

const gapId = (number) => `GAP-${String(number).padStart(3, "0")}`;

test("manifesto do Gate 0 aponta somente para artefatos versionados", async () => {
  const manifest = await json("docs/agent-007/gate-0-manifest.json");

  assert.equal(manifest.track, "agent-007");
  assert.equal(manifest.status, "IN_REVIEW");
  assert.equal(manifest.gapCount, 22);
  assert.deepEqual(manifest.priorities, { P0: 8, P1: 9, P2: 5 });
  assert.equal(manifest.source.rawCommitted, false);
  assert.equal(manifest.source.sanitized, true);
  assert.match(manifest.source.sha256, /^[a-f0-9]{64}$/);

  await Promise.all(
    manifest.artifacts.map((path) => access(new URL(path, root)))
  );
});

test("plano reconcilia exatamente os 22 gaps do handoff", async () => {
  const plan = await text("docs/agent-007/PLANO_DESENVOLVIMENTO.md");
  const found = new Set(plan.match(/GAP-[0-9]{3}/g) ?? []);

  assert.deepEqual(
    [...found].sort(),
    Array.from({ length: 22 }, (_, index) => gapId(index + 1))
  );
  assert.match(plan, /A UI não será ampliada/);
  assert.match(plan, /Gate 0 \+ três ondas/);
  assert.match(plan, /Aurora\/S3/);
});

test("state contract v2 preserva estados canônicos e política completa", async () => {
  const schema = await json(
    "docs/agent-007/contracts/state-contract.v2.schema.json"
  );
  const states = schema.$defs.deliveryState.enum;

  assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(schema.properties.schemaVersion.const, "2.0.0");
  assert.deepEqual(states, [
    "BACKLOG_VALIDATED",
    "READY",
    "DOING",
    "VERIFY",
    "DONE",
    "BLOCKED",
  ]);
  assert.ok(
    schema.$defs.project.required.includes("completionPolicy"),
    "todo projeto v2 precisa declarar sua política de conclusão"
  );
  assert.deepEqual(schema.$defs.completionPolicy.required, [
    "requireDod",
    "requireEvidence",
    "requireVerification",
    "requireHumanApproval",
  ]);
  assert.ok(
    schema["x-executar-invariants"].some((rule) => rule.includes("DONE"))
  );
});

test("projection contract é versionado, somente leitura e cobre os renderers", async () => {
  const schema = await json(
    "docs/agent-007/contracts/projection-contract.v1.schema.json"
  );

  assert.equal(schema.properties.schemaVersion.const, "1.0.0");
  assert.deepEqual(schema.properties.kind.enum, [
    "APP_DASHBOARD",
    "MAPA_OS",
    "PRISMA",
    "WORKBOOK",
    "SHOWROOM",
  ]);
  assert.ok(schema.required.includes("sourceRevision"));
  assert.ok(schema.required.includes("slots"));
  assert.equal("state" in schema.properties, false);
  assert.equal("evidenceBytes" in schema.properties, false);
  assert.ok(
    schema["x-executar-invariants"].some((rule) =>
      rule.includes("somente leitura")
    )
  );
});

test("matriz E2E cobre fronteiras e gaps P0", async () => {
  const matrix = await json(
    "docs/agent-007/validation/e2e-matrix.json"
  );
  const ids = matrix.scenarios.map((scenario) => scenario.id);
  const coveredBoundaries = new Set(
    matrix.scenarios.flatMap((scenario) => scenario.boundaries)
  );
  const coveredGaps = new Set(matrix.scenarios.flatMap((scenario) => scenario.gaps));

  assert.deepEqual(
    ids,
    Array.from({ length: 12 }, (_, index) => `E2E-${String(index + 1).padStart(2, "0")}`)
  );
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(matrix.scenarios.every((scenario) => scenario.status === "PLANNED"));

  for (const boundary of matrix.requiredBoundaries) {
    assert.ok(coveredBoundaries.has(boundary), `fronteira ausente: ${boundary}`);
  }

  for (let number = 1; number <= 8; number += 1) {
    assert.ok(coveredGaps.has(gapId(number)), `gap P0 sem cenário: ${gapId(number)}`);
  }
});

test("ADR mantém AWS canônica e conectores como adaptadores", async () => {
  const adr = await text("docs/agent-007/ADR_001_AUTORIDADE_DADOS.md");

  assert.match(adr, /Aurora PostgreSQL/);
  assert.match(adr, /S3 privado/);
  assert.match(adr, /Drive e Linear entram como adaptadores/);
  assert.match(adr, /Não haverá sincronização bidirecional genérica/);
  assert.match(adr, /run_id/);
  assert.match(adr, /expectedRevision/);
});
