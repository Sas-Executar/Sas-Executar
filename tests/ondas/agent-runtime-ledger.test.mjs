import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { novoEstado } from "../../apps/app/lib/executar/domain.ts";
import {
  criarSessaoAgenteServidor,
} from "../../apps/app/lib/executar/server-agent.ts";

const actor = {
  organizationId: "org_ledger",
  userId: "user_ledger",
  displayName: "Ledger",
};

function runtime(started) {
  let state = novoEstado(actor.organizationId);
  const calls = [];

  return {
    calls,
    current: () => state,
    aprovar: async () => undefined,
    baixarEvidencia: async () => new Response(),
    carregar: async () => state,
    enviarEvidencia: async () => ({ path: "org_ledger/p/t/e.txt" }),
    salvar: async (next) => {
      calls.push(["save", next.revision]);
      state = next;
      return { revision: next.revision };
    },
    solicitarAprovacao: async () => "approval-1",
    runLedger: {
      iniciar: async (input) => {
        calls.push(["start", input]);
        return (
          started ?? {
            replayed: false,
            result: {},
            runId: input.runId,
            status: "RUNNING",
          }
        );
      },
      reservarEfeito: async (reference, effectKey) => {
        calls.push(["reserve", reference, effectKey]);
      },
      finalizarEfeito: async (reference, effectKey, status, errorCode) => {
        calls.push(["effect", reference, effectKey, status, errorCode]);
      },
      finalizar: async (reference, result) => {
        calls.push(["finish", reference, result]);
      },
      falhar: async (reference, errorCode) => {
        calls.push(["fail", reference, errorCode]);
      },
    },
  };
}

test("Copiloto persiste run, efeito e resultado no ledger remoto", async () => {
  const remote = runtime();
  const session = await criarSessaoAgenteServidor(actor, remote);
  const result = await session.invoke("criar_projeto", {
    projectName: "Projeto ledger",
  });
  const names = remote.calls.map(([name]) => name);

  assert.deepEqual(names, ["start", "reserve", "save", "effect", "finish"]);
  assert.equal(result.status, "executado");
  assert.equal(remote.current().revision, result.revision);
  assert.match(remote.calls[0][1].idempotencyKey, /^agent:[a-f0-9]{64}$/);
  assert.match(remote.calls[0][1].runId, /^agent-[a-f0-9]{40}$/);
  assert.equal(remote.calls[3][3], "SUCCEEDED");
});

test("replay concluído devolve resultado sem repetir efeito", async () => {
  const replayResult = {
    approval: null,
    approvalId: null,
    context: {},
    revision: 0,
    status: "executado",
    text: "resultado persistido",
  };
  const remote = runtime({
    replayed: true,
    result: replayResult,
    runId: "agent-replay",
    status: "SUCCEEDED",
  });
  const session = await criarSessaoAgenteServidor(actor, remote);
  const result = await session.invoke("consultar_estado", {});

  assert.deepEqual(result, replayResult);
  assert.deepEqual(remote.calls.map(([name]) => name), ["start"]);
});

test("run ativo ou falho não é executado novamente", async () => {
  for (const status of ["RUNNING", "FAILED"]) {
    const remote = runtime({
      replayed: true,
      result: {},
      runId: "agent-replay",
      status,
    });
    const session = await criarSessaoAgenteServidor(actor, remote);

    await assert.rejects(
      session.invoke("consultar_estado", {}),
      status === "RUNNING" ? /ainda está ativa/ : /não será repetida/
    );
    assert.deepEqual(remote.calls.map(([name]) => name), ["start"]);
  }
});

test("falha de efeito é registrada antes de falhar o run", async () => {
  const remote = runtime();
  remote.salvar = async () => {
    throw new Error("banco indisponível");
  };
  const session = await criarSessaoAgenteServidor(actor, remote);

  await assert.rejects(
    session.invoke("criar_projeto", { projectName: "Falha" }),
    /banco indisponível/
  );

  assert.deepEqual(remote.calls.map(([name]) => name), [
    "start",
    "reserve",
    "effect",
    "fail",
  ]);
  assert.equal(remote.calls[2][3], "FAILED");
  assert.equal(remote.calls[3][2], "EXECUCAO_AGENTE_FALHOU");
});

test("Aurora expõe funções runtime com tenant, lease e efeitos", async () => {
  const [migration, adapter, server] = await Promise.all([
    readFile(
      new URL(
        "../../infra/aws/migrations/004_agent_007_runtime.sql",
        import.meta.url
      ),
      "utf8"
    ),
    readFile(
      new URL("../../apps/app/lib/executar/aws-persistence.ts", import.meta.url),
      "utf8"
    ),
    readFile(
      new URL("../../apps/app/lib/executar/server-agent.ts", import.meta.url),
      "utf8"
    ),
  ]);

  assert.match(migration, /executar_iniciar_run/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /RUN_LEASE_EXPIRED/);
  assert.match(migration, /executar_reservar_efeito_run/);
  assert.match(migration, /executar_finalizar_efeito_run/);
  assert.match(migration, /executar_finalizar_run/);
  assert.match(migration, /executar_falhar_run/);
  assert.match(migration, /executar_current_organization\(\)/);
  assert.doesNotMatch(migration, /security definer/i);
  assert.match(adapter, /runLedger/);
  assert.match(server, /idempotencyKey/);
});
