import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assumirFoco,
  novoEstado,
  registrarPasso,
} from "../../apps/app/lib/executar/domain.ts";
import { prepararLotePersistencia } from "../../apps/app/lib/executar/integration-contract.ts";
import {
  criarPersistenciaRemota,
  ErroPersistenciaRemota,
} from "../../apps/app/lib/executar/remote-persistence.ts";
import { REFERENCIA_SUPABASE_LEGADO_AUTORIZADO } from "../../apps/app/lib/executar/supabase-project.ts";

const tasks = [
  {
    id: "A",
    title: "Preparar entrega",
    front: "Operações",
    date: "22/08",
    mins: 30,
    deps: [],
    stage: 1,
  },
  {
    id: "B",
    title: "Publicar entrega",
    front: "Operações",
    date: "23/08",
    mins: 45,
    deps: ["A"],
    stage: 2,
  },
];
const configuration = {
  projectOrigin: "existente_autorizado",
  projectReference: REFERENCIA_SUPABASE_LEGADO_AUTORIZADO,
  url: `https://${REFERENCIA_SUPABASE_LEGADO_AUTORIZADO}.supabase.co`,
  publishableKey: "sb_publishable_teste_integracao",
};
const session = {
  organizationId: "org_integracao",
  userId: "user_integracao",
  getToken: async () => "token-clerk-real-nao-exposto",
};
const actor = {
  organizationId: session.organizationId,
  userId: session.userId,
  displayName: "Pessoa de teste",
};
const approval = {
  id: "org_integracao:sprint-principal:concluir_entrega:A:0",
  organizationId: "org_integracao",
  projectId: "sprint-principal",
  expectedRevision: 0,
  tool: "concluir_entrega",
  taskId: "A",
  summary: "Concluir entrega A",
  input: {
    name: "concluir_entrega",
    organizationId: "org_integracao",
    projectId: "sprint-principal",
    expectedRevision: 0,
    taskId: "A",
  },
};

function state() {
  return novoEstado(session.organizationId, tasks);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("persistência carrega snapshot autenticado com sessão Clerk e RLS", async () => {
  const current = state();
  const persistence = criarPersistenciaRemota(
    configuration,
    session,
    (url, options) => {
      assert.match(url, /\/rest\/v1\/executar_events/);
      assert.match(url, /organization_id=eq\.org_integracao/);
      assert.equal(options.cache, "no-store");
      assert.equal(options.headers.apikey, configuration.publishableKey);
      assert.equal(
        options.headers.Authorization,
        "Bearer token-clerk-real-nao-exposto"
      );

      return json([{ revision: 0, payload: { state: current } }]);
    }
  );

  assert.deepEqual(await persistence.carregar(), current);
});

test("organização sem snapshot remoto mantém inicialização local", async () => {
  const persistence = criarPersistenciaRemota(
    configuration,
    session,
    async () => json([])
  );

  assert.equal(await persistence.carregar(), null);
});

test("evidência é enviada ao bucket privado com JWT Clerk e prefixo da organização", async () => {
  const file = new File(["comprovante"], "nota final.pdf", {
    type: "application/pdf",
  });
  const expected = "org_integracao/sprint-principal/A/nota-final.pdf";
  const persistence = criarPersistenciaRemota(
    configuration,
    session,
    (url, options) => {
      assert.equal(
        url,
        `${configuration.url}/storage/v1/object/executar-evidencias/${expected}`
      );
      assert.equal(options.method, "POST");
      assert.equal(options.body, file);
      assert.equal(options.headers["Content-Type"], "application/pdf");
      assert.equal(options.headers["x-upsert"], "false");
      assert.equal(
        options.headers.Authorization,
        "Bearer token-clerk-real-nao-exposto"
      );

      return json({ Key: `executar-evidencias/${expected}` }, 200);
    }
  );

  assert.deepEqual(
    await persistence.enviarEvidencia(state(), actor, "A", file),
    {
      path: expected,
    }
  );
});

test("upload não aceita arquivo vazio, maior que o bucket ou organização externa", async () => {
  let called = false;
  const persistence = criarPersistenciaRemota(configuration, session, () => {
    called = true;
    return Promise.resolve(json({}));
  });

  await assert.rejects(
    () =>
      persistence.enviarEvidencia(
        state(),
        actor,
        "A",
        new File([], "vazio.txt")
      ),
    /entre 1 byte e 2,5 MB/
  );
  await assert.rejects(
    () =>
      persistence.enviarEvidencia(
        state(),
        actor,
        "A",
        new File([new Uint8Array(2_500_001)], "grande.txt")
      ),
    /entre 1 byte e 2,5 MB/
  );
  await assert.rejects(
    () =>
      persistence.enviarEvidencia(
        state(),
        { ...actor, organizationId: "org_externa" },
        "A",
        new File(["ok"], "prova.txt")
      ),
    /outra organização/
  );
  assert.equal(called, false);
});

test("confirmação Storage não pode apontar para outra organização", async () => {
  const persistence = criarPersistenciaRemota(
    configuration,
    session,
    async () =>
      json({ Key: "executar-evidencias/org_externa/projeto/A/prova.txt" })
  );

  await assert.rejects(
    () =>
      persistence.enviarEvidencia(
        state(),
        actor,
        "A",
        new File(["ok"], "prova.txt")
      ),
    /fora da organização autenticada/
  );
});

test("download de bucket privado exige JWT Clerk e caminho autenticado", async () => {
  const path = "org_integracao/sprint-principal/A/prova.pdf";
  const persistence = criarPersistenciaRemota(
    configuration,
    session,
    (url, options) => {
      assert.equal(
        url,
        `${configuration.url}/storage/v1/object/authenticated/executar-evidencias/${path}`
      );
      assert.equal(
        options.headers.Authorization,
        "Bearer token-clerk-real-nao-exposto"
      );

      return new Response("comprovante privado", {
        headers: { "Content-Type": "application/pdf" },
      });
    }
  );
  const response = await persistence.baixarEvidencia(path);

  assert.equal(await response.text(), "comprovante privado");
});

test("download recusa outro tenant, path traversal e caminhos incompletos", async () => {
  let called = false;
  const persistence = criarPersistenciaRemota(configuration, session, () => {
    called = true;
    return Promise.resolve(json({}));
  });

  for (const path of [
    "org_externa/sprint-principal/A/prova.pdf",
    "org_integracao/sprint-principal/../prova.pdf",
    "org_integracao/sprint-principal/A",
    "org_integracao/sprint-principal/A/prova%2Fexterna.pdf",
  ]) {
    await assert.rejects(
      () => persistence.baixarEvidencia(path),
      /organização autenticada/
    );
  }

  assert.equal(called, false);
});

test("snapshot remoto de outra organização é rejeitado", async () => {
  const external = novoEstado("org_externa", tasks);
  const persistence = criarPersistenciaRemota(
    configuration,
    session,
    async () => json([{ revision: 0, payload: { state: external } }])
  );

  await assert.rejects(() => persistence.carregar(), /organização autenticada/);
});

test("snapshot remoto com revisão divergente não é restaurado", async () => {
  const persistence = criarPersistenciaRemota(
    configuration,
    session,
    async () => json([{ revision: 9, payload: { state: state() } }])
  );

  await assert.rejects(() => persistence.carregar(), /organização autenticada/);
});

test("primeira sincronização usa RPC transacional e revisão inexistente", async () => {
  const current = state();
  const persistence = criarPersistenciaRemota(
    configuration,
    session,
    (url, options) => {
      const body = JSON.parse(options.body).p_payload;

      assert.match(url, /\/rpc\/executar_persistir_estado$/);
      assert.equal(options.method, "POST");
      assert.equal(body.expected_revision, -1);
      assert.equal(body.revision, 0);
      assert.equal(body.organization_id, actor.organizationId);
      assert.equal(body.actor_user_id, actor.userId);
      assert.equal(body.deliveries[0].status, "READY");
      assert.equal(body.deliveries[1].status, "BLOCKED");
      assert.deepEqual(body.events, []);

      return json({ organization_id: actor.organizationId, revision: 0 });
    }
  );

  assert.deepEqual(await persistence.salvar(current, actor, -1), {
    revision: 0,
  });
});

test("sincronização deriva foco, passos e eventos do estado canônico", () => {
  const focused = assumirFoco(tasks, state(), "A");
  const progressed = registrarPasso(tasks, focused, "A");
  const batch = prepararLotePersistencia(progressed, actor, 1);

  assert.equal(batch.deliveries[0].status, "DOING");
  assert.equal(batch.deliveries[0].started_steps, 1);
  assert.equal(batch.deliveries[1].status, "BLOCKED");
  assert.equal(batch.sync.events.length, 1);
  assert.equal(batch.sync.events[0].revision, 2);
});

test("conflito de revisão PostgreSQL é convertido em HTTP 409", async () => {
  const persistence = criarPersistenciaRemota(
    configuration,
    session,
    async () => json({ code: "40001", message: "Conflito de revisão" }, 500)
  );

  await assert.rejects(
    () => persistence.salvar(state(), actor, -1),
    (error) =>
      error instanceof ErroPersistenciaRemota &&
      error.status === 409 &&
      error.code === "40001"
  );
});

test("revisão esperada inválida não dispara requisição remota", async () => {
  let called = false;
  const persistence = criarPersistenciaRemota(configuration, session, () => {
    called = true;
    return Promise.resolve(json({}));
  });

  await assert.rejects(() => persistence.salvar(state(), actor, -2), /revisão/);
  assert.equal(called, false);
});

test("sessão Clerk encerrada não envia credencial inventada", async () => {
  let called = false;
  const persistence = criarPersistenciaRemota(
    configuration,
    { ...session, getToken: async () => null },
    () => {
      called = true;
      return Promise.resolve(json([]));
    }
  );

  await assert.rejects(() => persistence.carregar(), /sessão Clerk/);
  assert.equal(called, false);
});

test("gravação remota recusa ator pertencente a outra organização", async () => {
  const persistence = criarPersistenciaRemota(
    configuration,
    session,
    async () => json({})
  );

  await assert.rejects(
    () =>
      persistence.salvar(
        state(),
        { ...actor, organizationId: "org_externa" },
        -1
      ),
    /outra organização/
  );
});

test("confirmação de gravação não pode trocar organização ou revisão", async () => {
  for (const returned of [
    { organization_id: "org_externa", revision: 0 },
    { organization_id: actor.organizationId, revision: 9 },
  ]) {
    const persistence = criarPersistenciaRemota(
      configuration,
      session,
      async () => json(returned)
    );

    await assert.rejects(
      () => persistence.salvar(state(), actor, -1),
      /confirmação remota/
    );
  }
});

test("aprovação sensível é registrada com identidade Clerk no servidor", async () => {
  const approvalId = "123e4567-e89b-12d3-a456-426614174000";
  const persistence = criarPersistenciaRemota(
    configuration,
    session,
    (url, options) => {
      const body = JSON.parse(options.body);

      assert.match(url, /executar_approvals\?select=approval_id/);
      assert.equal(body.organization_id, actor.organizationId);
      assert.equal(body.requested_by_user_id, actor.userId);
      assert.equal(body.tool_name, "concluir_entrega");
      assert.equal(body.expected_revision, 0);

      return json([{ approval_id: approvalId }], 201);
    }
  );

  assert.equal(await persistence.solicitarAprovacao(approval), approvalId);
});

test("aprovação forjada ou de outra organização é rejeitada", async () => {
  const persistence = criarPersistenciaRemota(
    configuration,
    session,
    async () => json([])
  );

  for (const forged of [
    { ...approval, organizationId: "org_externa" },
    { ...approval, id: "forjada" },
    { ...approval, tool: "assumir_foco" },
    { ...approval, input: { ...approval.input, approved: true, taskId: "B" } },
  ]) {
    await assert.rejects(
      () => persistence.solicitarAprovacao(forged),
      /proposta de aprovação/
    );
  }
});

test("aprovação humana confirma o usuário da sessão autenticada", async () => {
  const approvalId = "123e4567-e89b-12d3-a456-426614174000";
  const persistence = criarPersistenciaRemota(
    configuration,
    session,
    (url, options) => {
      const body = JSON.parse(options.body);

      assert.match(url, /organization_id=eq\.org_integracao/);
      assert.match(url, /status=eq\.pending/);
      assert.match(url, /expires_at=gt\./);
      assert.equal(options.method, "PATCH");
      assert.equal(body.status, "approved");
      assert.equal(body.approved_by_user_id, actor.userId);

      return json([{ approval_id: approvalId }]);
    }
  );

  await persistence.aprovar(approvalId, true);
});

test("aprovação expirada, repetida ou externa não pode ser concluída", async () => {
  const persistence = criarPersistenciaRemota(
    configuration,
    session,
    async () => json([])
  );

  await assert.rejects(
    () => persistence.aprovar("123e4567-e89b-12d3-a456-426614174000", true),
    /expirou/
  );
  await assert.rejects(
    () => persistence.aprovar("nao-e-uuid", true),
    /inválido/
  );
});

test("rotas servidor derivam usuário e organização exclusivamente do Clerk", async () => {
  const [context, stateRoute, approvalsRoute, evidenceRoute] =
    await Promise.all([
      readFile(
        new URL(
          "../../apps/app/lib/executar/server-persistence.ts",
          import.meta.url
        ),
        "utf8"
      ),
      readFile(
        new URL(
          "../../apps/app/app/api/executar/state/route.ts",
          import.meta.url
        ),
        "utf8"
      ),
      readFile(
        new URL(
          "../../apps/app/app/api/executar/approvals/route.ts",
          import.meta.url
        ),
        "utf8"
      ),
      readFile(
        new URL(
          "../../apps/app/app/api/executar/evidence/route.ts",
          import.meta.url
        ),
        "utf8"
      ),
    ]);

  assert.match(context, /await auth\(\)/);
  assert.match(context, /criarPersistenciaAws\(actor\)/);
  assert.doesNotMatch(context, /projectOrigin|projectReference|getToken/);
  assert.match(
    stateRoute,
    /payload\.state\.organizationId !== actor\.organizationId/
  );
  assert.match(approvalsRoute, /persistence\.solicitarAprovacao/);
  assert.match(approvalsRoute, /persistence\.aprovar/);
  assert.match(evidenceRoute, /persistence\.enviarEvidencia/);
  assert.match(evidenceRoute, /persistence\.baixarEvidencia/);
  assert.match(
    evidenceRoute,
    /state\.organizationId !== actor\.organizationId/
  );
  assert.match(evidenceRoute, /private, no-store/);
});

test("interface mantém offline e sincroniza pelo servidor autenticado", async () => {
  const component = await readFile(
    new URL(
      "../../apps/app/app/(authenticated)/components/executar-operacional.tsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(component, /window\.localStorage\.setItem/);
  assert.match(component, /fetch\("\/api\/executar\/state"/);
  assert.match(component, /fetch\("\/api\/executar\/approvals"/);
  assert.match(component, /fetch\("\/api\/executar\/evidence"/);
  assert.match(component, /proof\.file\.storagePath/);
  assert.match(component, /expectedRevision: remoteRevision\.current/);
  assert.match(component, /receberAtualizacaoCompartilhada/);
  assert.match(component, /serverApprovals\.current\.get/);
});

test("migration real mantém RLS, transação, revisão e aprovação no banco", async () => {
  const migration = await readFile(
    new URL(
      "../../supabase/migrations/20260822165019_executar_operational_transactional_persistence.sql",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(migration, /create function public\.executar_persistir_estado/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /errcode = '40001'/);
  assert.match(migration, /approved_by_user_id = v_actor_user_id/);
  assert.match(migration, /revoke all on function .* from public/);
  assert.match(migration, /grant execute on function .* to authenticated/);
  assert.doesNotMatch(migration, /security definer/i);
});

test("migration adicional projeta evidências, comentários e leituras sem contornar RLS", async () => {
  const migration = await readFile(
    new URL(
      "../../supabase/migrations/20260822201910_executar_evidence_and_collaboration_projection.sql",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(
    migration,
    /create function public\.executar_projetar_registros_operacionais/
  );
  assert.match(migration, /security invoker/);
  assert.match(migration, /after insert on public\.executar_events/);
  assert.match(migration, /insert into public\.executar_evidence/);
  assert.match(migration, /insert into public\.executar_comments/);
  assert.match(migration, /insert into public\.executar_notification_reads/);
  assert.match(migration, /split_part\(v_storage_path, '\/', 1\)/);
  assert.match(migration, /v_comment ->> 'authorId'/);
  assert.match(migration, /v_read ->> 'userId'/);
  assert.match(migration, /revoke all on function .* from public/);
  assert.doesNotMatch(migration, /security definer/i);
});

test("CI diagnostica apenas disponibilidade, sem imprimir valores de segredos", async () => {
  const workflow = await readFile(
    new URL("../../.github/workflows/onda-1.yml", import.meta.url),
    "utf8"
  );

  assert.match(workflow, /EXECUTAR_HAS_VERCEL_TOKEN/);
  assert.match(workflow, /EXECUTAR_HAS_CLERK_SECRET_KEY/);
  assert.match(workflow, /EXECUTAR_HAS_SUPABASE_ACCESS_TOKEN/);
  assert.match(workflow, /value === 'true'/);
  assert.doesNotMatch(workflow, /console\.log\([^\n]*process\.env/);
});

test("env de produção versionado contém somente configuração pública", async () => {
  const productionEnv = await readFile(
    new URL("../../apps/app/.env.production", import.meta.url),
    "utf8"
  );
  const assignments = productionEnv
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  assert.ok(assignments.length > 0);

  for (const assignment of assignments) {
    const [key, ...valueParts] = assignment.split("=");
    const value = valueParts.join("=").replace(/^"|"$/g, "");

    assert.match(key, /^NEXT_PUBLIC_[A-Z0-9_]+$/);
    assert.ok(value.length > 0, `${key} precisa ter valor público explícito`);
    assert.doesNotMatch(
      key,
      /SECRET|SERVICE_ROLE|DATABASE|DIRECT_URL|PASSWORD|ACCESS_TOKEN|VERCEL_TOKEN/
    );
    assert.doesNotMatch(value, /^(?:sb_secret_|sk_|whsec_)/);
  }

  assert.doesNotMatch(productionEnv, /SUPABASE|AWS_|AURORA_|EVIDENCE_BUCKET/);
  assert.match(productionEnv, /NEXT_PUBLIC_APP_URL="https:\/\/\$VERCEL_URL"/);
  assert.match(productionEnv, /NEXT_PUBLIC_WEB_URL="https:\/\/\$VERCEL_URL"/);
  assert.doesNotMatch(productionEnv, /eyJhbGciOi/);
});

test("build do aplicativo não exige cliente Prisma/Neon sem uso operacional", async () => {
  const appEnv = await readFile(
    new URL("../../apps/app/env.ts", import.meta.url),
    "utf8"
  );

  assert.match(appEnv, /@repo\/auth\/keys/);
  assert.match(appEnv, /@repo\/next-config\/keys/);
  assert.doesNotMatch(appEnv, /@repo\/database\/keys/);
  assert.doesNotMatch(appEnv, /database\(\)/);
});
