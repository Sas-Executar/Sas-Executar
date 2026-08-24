import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  preflightBinding,
  registrarBinding,
} from "../../apps/app/lib/executar/authority-registry.ts";
import {
  concluirEntrega,
  criarProjeto,
  entregasAtivas,
  executarCopiloto,
  novoEstado,
  POLITICA_CONCLUSAO_LEGADA,
  POLITICA_CONCLUSAO_PADRAO,
  registrarEvidencia,
  restaurarEstado,
  selecionarProjeto,
} from "../../apps/app/lib/executar/domain.ts";
import { planejarOnboarding } from "../../apps/app/lib/executar/onboarding.ts";
import { projetarEstado } from "../../apps/app/lib/executar/projection.ts";
import { executarBomDia } from "../../apps/app/lib/executar/routine.ts";
import {
  finalizarEfeito,
  finalizarRun,
  iniciarRun,
  LEDGER_VAZIO,
  reservarEfeito,
} from "../../apps/app/lib/executar/run-ledger.ts";
import {
  resolverTokens,
  selecionarTemplate,
} from "../../apps/app/lib/executar/template-registry.ts";

const task = (overrides = {}) => ({
  id: "T-1",
  title: "Provar a entrega",
  front: "Produto",
  date: "24/08",
  mins: 30,
  deps: [],
  stage: 1,
  dod: "Evidência verificada e aceita",
  ...overrides,
});

test("política v2 é estrita em projeto novo e restaura legado com segurança", () => {
  const base = novoEstado("org_test");
  const created = criarProjeto(base, "Projeto v2", [task({ dod: undefined })]);
  const selected = selecionarProjeto(created, "projeto-v2");
  const tasks = entregasAtivas(selected);
  const withProof = registrarEvidencia(
    tasks,
    selected,
    "T-1",
    "validado",
    "",
    true
  );

  assert.deepEqual(
    selected.projects.find((project) => project.id === "projeto-v2")
      .completionPolicy,
    POLITICA_CONCLUSAO_PADRAO
  );
  assert.throws(() => concluirEntrega(tasks, withProof, "T-1"), /DoD/);

  const legacy = JSON.parse(JSON.stringify(novoEstado("org_test", [task()])));
  legacy.schemaVersion = undefined;
  legacy.projects[0].completionPolicy = undefined;
  const restored = restaurarEstado(JSON.stringify(legacy), "org_test");

  assert.equal(restored.schemaVersion, "2.0.0");
  assert.deepEqual(
    restored.projects[0].completionPolicy,
    POLITICA_CONCLUSAO_LEGADA
  );
});

test("catálogo canônico resolve /situacao sem criar um nono comando", () => {
  const state = novoEstado("org_test", [task()]);
  const response = executarCopiloto(entregasAtivas(state), state, "/situacao");

  assert.equal(response.command, "/estado");
  assert.match(response.reply, /^Estado:/);
});

test("run ledger faz replay, bloqueia concorrência e conclui só após efeitos", () => {
  const input = {
    id: "run-1",
    idempotencyKey: "cmd:1",
    lockKey: "project:write",
    organizationId: "org_test",
    projectId: "p-1",
    startedAt: "2026-08-24T12:00:00.000Z",
    type: "COMMAND",
  };
  const started = iniciarRun(LEDGER_VAZIO, input);
  const replay = iniciarRun(started.ledger, input);
  const reference = {
    organizationId: input.organizationId,
    projectId: input.projectId,
    runId: input.id,
  };

  assert.equal(replay.replayed, true);
  assert.throws(
    () =>
      iniciarRun(started.ledger, {
        ...input,
        id: "run-2",
        idempotencyKey: "cmd:2",
      }),
    /execução ativa/
  );

  assert.throws(
    () =>
      reservarEfeito(
        started.ledger,
        { ...reference, organizationId: "org_other" },
        "db:state:1"
      ),
    /mesmo tenant/
  );
  const reserved = reservarEfeito(started.ledger, reference, "db:state:1");
  assert.throws(
    () => finalizarRun(reserved, reference, input.startedAt),
    /efeitos pendentes/
  );
  const effected = finalizarEfeito(
    reserved,
    reference,
    "db:state:1",
    "SUCCEEDED"
  );
  const completed = finalizarRun(effected, reference, input.startedAt);

  assert.equal(completed.runs[0].status, "SUCCEEDED");
  assert.equal(reservarEfeito(reserved, reference, "db:state:1"), reserved);
});

test("onboarding importa em preview sem alterar o estado recebido", () => {
  const state = novoEstado("org_test");
  const before = JSON.stringify(state);
  const plan = planejarOnboarding(
    {
      mode: "IMPORT_FILE",
      organizationId: "org_test",
      content: JSON.stringify([task()]),
    },
    state
  );

  assert.equal(plan.status, "READY");
  assert.match(plan.summary, /1 entrega/);
  assert.equal(JSON.stringify(state), before);
  assert.notEqual(plan.nextState, state);
});

test("bindings exigem escopo, direção e autoridade ativa", () => {
  const binding = {
    organizationId: "org_test",
    projectId: "p-1",
    provider: "DRIVE",
    logicalKey: "DAILY_LOG",
    direction: "EXPORT",
    externalId: "drive-file-1",
    status: "ACTIVE",
  };
  const registered = registrarBinding([], binding);

  assert.equal(registrarBinding(registered, binding), registered);
  assert.equal(
    preflightBinding(registered, {
      organizationId: "org_test",
      projectId: "p-1",
      provider: "DRIVE",
      logicalKey: "DAILY_LOG",
      direction: "EXPORT",
    }).externalId,
    "drive-file-1"
  );
  assert.throws(
    () =>
      preflightBinding(registered, {
        organizationId: "org_other",
        projectId: "p-1",
        provider: "DRIVE",
        logicalKey: "DAILY_LOG",
        direction: "EXPORT",
      }),
    /não está vinculada/
  );
});

test("/bomdia e projeção são determinísticos e não expõem bytes", () => {
  const state = novoEstado("org_test", [task()]);
  const first = executarBomDia(
    LEDGER_VAZIO,
    state,
    "2026-08-24",
    "2026-08-24T09:00:00.000Z"
  );
  const replay = executarBomDia(
    first.ledger,
    state,
    "2026-08-24",
    "2026-08-24T09:05:00.000Z"
  );
  const projection = projetarEstado(
    state,
    "MAPA_OS",
    "2026-08-24T09:00:00.000Z"
  );

  assert.equal(replay.replayed, true);
  assert.equal(replay.reply, first.reply);
  assert.equal(projection.projectionId, "org_test:sprint-principal:0:MAPA_OS");
  assert.equal(projection.schemaVersion, "1.0.0");
  assert.equal(projection.sourceRevision, state.revision);
  assert.equal(projection.kind, "MAPA_OS");
  assert.equal(JSON.stringify(projection).includes("data:"), false);
  assert.equal("state" in projection, false);
});

test("registry escolhe template e tokens exigem justificativa para override", () => {
  assert.equal(selecionarTemplate("MAPA_OS", "swiss").version, "1.0.0");
  assert.deepEqual(
    resolverTokens({ color: "black" }, { spacing: "8" }).values,
    { color: "black", spacing: "8" }
  );
  assert.throws(
    () => resolverTokens({ color: "black" }, {}, { color: "blue" }),
    /justificativa/
  );
});

test("migração Agent-007 cria ledger/bindings com isolamento tenant", async () => {
  const migration = await readFile(
    new URL(
      "../../infra/aws/migrations/003_agent_007_foundation.sql",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(migration, /create table public\.executar_runs/);
  assert.match(migration, /unique \(organization_id, idempotency_key\)/);
  assert.match(migration, /executar_runs_active_lock/);
  assert.match(migration, /create table public\.executar_connector_bindings/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /executar_current_organization\(\)/);
  assert.doesNotMatch(migration, /security definer/i);
});
