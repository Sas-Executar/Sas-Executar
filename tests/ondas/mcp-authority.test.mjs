import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { authorizeMcpInvocation } from "../../packages/mcp/index.ts";

const session = {
  organizationId: "org_mcp",
  scopes: ["executar:read", "executar:write", "executar:approve"],
  sessionId: "sess_mcp",
  userId: "user_mcp",
};
const state = {
  organizationId: "org_mcp",
  projectId: "projeto-principal",
  revision: 7,
};

test("MCP recebe autoridade somente da sessão e do estado", () => {
  const invocation = authorizeMcpInvocation(
    session,
    state,
    { effect: "write", name: "registrar_progresso" },
    "call-1",
    { taskId: "T-1" }
  );

  assert.equal(invocation.authority.organizationId, "org_mcp");
  assert.equal(invocation.authority.userId, "user_mcp");
  assert.equal(invocation.authority.expectedRevision, 7);
  assert.deepEqual(invocation.arguments, { taskId: "T-1" });
});

test("MCP recusa outro tenant e autoridade em argumentos", () => {
  assert.throws(
    () =>
      authorizeMcpInvocation(
        session,
        { ...state, organizationId: "org_other" },
        { effect: "read", name: "consultar_estado" },
        "call-2",
        {}
      ),
    /não pode escolher tenant/
  );
  assert.throws(
    () =>
      authorizeMcpInvocation(
        session,
        state,
        { effect: "write", name: "criar_entrega" },
        "call-3",
        { organizationId: "org_other" }
      ),
    /definir autoridade/
  );
});

test("escrita relevante exige escopo e ainda sinaliza aprovação humana", () => {
  assert.throws(
    () =>
      authorizeMcpInvocation(
        { ...session, scopes: ["executar:write"] },
        state,
        { effect: "relevant-write", name: "concluir_entrega" },
        "call-4",
        { taskId: "T-1" }
      ),
    /escopo de aprovação/
  );
  const invocation = authorizeMcpInvocation(
    session,
    state,
    { effect: "relevant-write", name: "concluir_entrega" },
    "call-5",
    { taskId: "T-1" }
  );

  assert.equal(invocation.requiresHumanApproval, true);
});

test("registry não fabrica endpoint MCP ativo", async () => {
  const registry = JSON.parse(
    await readFile(
      new URL("../../operations/mcp/registry.json", import.meta.url),
      "utf8"
    )
  );

  assert.equal(registry.status, "local-contract-only");
  assert.equal(registry.identityAuthority, "Clerk");
  assert.equal(registry.tools.length, 15);
});
