import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assumirFoco,
  criarProjeto,
  novoEstado,
  registrarEvidencia,
} from "../../apps/app/lib/executar/domain.ts";
import {
  caminhoEvidenciaOrganizacao,
  criarClienteSupabaseClerk,
  diagnosticarAmbienteFinal,
  prepararLotePersistencia,
  VARIAVEIS_INTEGRACAO_FINAL,
} from "../../apps/app/lib/executar/integration-contract.ts";
import {
  avaliarFechamento,
  diagnosticarActions,
  ETAPAS_FECHAMENTO,
  gatesFechamento,
  proximasEtapasProntas,
} from "../../apps/app/lib/executar/readiness.ts";
import { REFERENCIA_SUPABASE_LEGADO_AUTORIZADO } from "../../apps/app/lib/executar/supabase-project.ts";

const now = new Date("2026-08-21T21:00:00.000Z").getTime();
const checkedAt = "2026-08-21T20:00:00.000Z";
const actor = {
  organizationId: "org_executar",
  userId: "user_ana",
  displayName: "Ana",
};
const tasks = [
  {
    id: "A",
    title: "Preparar entrega",
    front: "Operações",
    date: "24/08",
    mins: 30,
    deps: [],
    stage: 1,
  },
  {
    id: "B",
    title: "Publicar entrega",
    front: "Operações",
    date: "25/08",
    mins: 45,
    deps: ["A"],
    stage: 2,
    dod: "Publicação validada",
  },
];
const configuration = {
  projectOrigin: "novo",
  projectReference: "executar12345678",
  url: "https://executar12345678.supabase.co",
  publishableKey: "sb_publishable_exemplo_seguro",
};
const session = {
  organizationId: actor.organizationId,
  userId: actor.userId,
  getToken: async () => "clerk-session-token",
};

function evidence(stepId, changes = {}) {
  const step = ETAPAS_FECHAMENTO.find((item) => item.id === stepId);

  return {
    stepId,
    source: step?.requiredSources[0] ?? "servico_real",
    reference: `evidencia/${stepId}`,
    verifiedAt: checkedAt,
    passed: true,
    organizationId: actor.organizationId,
    ...(stepId === "supabase_novo"
      ? {
          metadata: {
            projectOrigin: "novo",
            projectReference: "executar12345678",
          },
        }
      : {}),
    ...(stepId === "clerk_supabase"
      ? { metadata: { identityAuthority: "Clerk" } }
      : {}),
    ...(stepId === "isolamento_multi_tenant"
      ? {
          metadata: {
            tenantCount: 2,
            coverage: ["select", "insert", "update", "delete", "storage"],
          },
        }
      : {}),
    ...(stepId === "runner_actions" || stepId === "ci_verde"
      ? { metadata: { executedSteps: 5 } }
      : {}),
    ...changes,
  };
}

function localEvidence() {
  return [
    "preservacao_pwa",
    "produto_operacional",
    "copiloto_operacional",
    "distribuicao_operacional",
    "template_rls_storage",
  ].map((id) => evidence(id));
}

function allEvidence() {
  return ETAPAS_FECHAMENTO.map((step) => evidence(step.id));
}

function state() {
  return novoEstado(actor.organizationId, tasks);
}

function template() {
  return readFile(
    new URL(
      "../../docs/runner/sql/EXECUTAR_SUPABASE_TEMPLATE.sql",
      import.meta.url
    ),
    "utf8"
  );
}

test("onda 5 mantém identificadores únicos e dependências topologicamente ordenadas", () => {
  const known = new Set();

  for (const step of ETAPAS_FECHAMENTO) {
    assert.ok(!known.has(step.id), step.id);

    for (const dependency of step.prerequisites) {
      assert.ok(known.has(dependency), `${step.id} depende de ${dependency}`);
    }

    known.add(step.id);
  }

  assert.equal(known.size, 26);
});

test("evidência local aprova código, nunca integração, produção ou mobile", () => {
  const gates = gatesFechamento(
    avaliarFechamento(actor.organizationId, localEvidence(), now)
  );

  assert.equal(gates.find((gate) => gate.id === "codigo").status, "PASSOU");

  for (const id of ["integracao", "producao", "mobile"]) {
    assert.equal(gates.find((gate) => gate.id === id).status, "NÃO PASSOU");
  }
});

test("primeiras pendências externas prontas são Clerk real e runner Actions", () => {
  const ready = proximasEtapasProntas(
    avaliarFechamento(actor.organizationId, localEvidence(), now)
  );

  assert.deepEqual(
    ready.map((step) => step.id),
    ["identidade_clerk", "runner_actions"]
  );
  assert.ok(ready.every((step) => step.requiresExternalAuthorization));
});

test("fila local não inicia integração externa sem autorização", () => {
  const ready = proximasEtapasProntas(
    avaliarFechamento(actor.organizationId, localEvidence(), now),
    false
  );

  assert.deepEqual(ready, []);
});

test("sem provas, somente preservação está pronta", () => {
  const ready = proximasEtapasProntas(
    avaliarFechamento(actor.organizationId, [], now)
  );

  assert.deepEqual(
    ready.map((step) => step.id),
    ["preservacao_pwa"]
  );
});

test("organização vazia ou não emitida pelo Clerk é recusada", () => {
  for (const organizationId of ["", "visitante", "org_", "org_/externa"]) {
    assert.throws(
      () => avaliarFechamento(organizationId, [], now),
      /organização Clerk/
    );
  }
});

test("evidência de outro tenant não contamina o fechamento", () => {
  assert.throws(
    () =>
      avaliarFechamento(
        actor.organizationId,
        [evidence("preservacao_pwa", { organizationId: "org_externa" })],
        now
      ),
    /outra organização/
  );
});

test("etapa não catalogada é rejeitada", () => {
  assert.throws(
    () => avaliarFechamento(actor.organizationId, [evidence("inventada")], now),
    /desconhecida/
  );
});

test("teste local não comprova serviço externo", () => {
  assert.throws(
    () =>
      avaliarFechamento(
        actor.organizationId,
        [evidence("identidade_clerk", { source: "teste_local" })],
        now
      ),
    /evidência real compatível/
  );
});

test("referências vazias ou com credenciais não entram na trilha", () => {
  for (const reference of [
    " ",
    "sb_secret_abcd",
    "Bearer token-real",
    "postgres://user:password@db.example",
    "service_role_key",
  ]) {
    assert.throws(
      () =>
        avaliarFechamento(
          actor.organizationId,
          [evidence("preservacao_pwa", { reference })],
          now
        ),
      /inválida ou expõe segredo/
    );
  }
});

test("data inválida ou futura não fabrica verificação", () => {
  for (const verifiedAt of ["inventada", "2026-08-22T20:00:00.000Z"]) {
    assert.throws(
      () =>
        avaliarFechamento(
          actor.organizationId,
          [evidence("preservacao_pwa", { verifiedAt })],
          now
        ),
      /não futura/
    );
  }
});

test("evidência duplicada não sobrescreve resultado silenciosamente", () => {
  assert.throws(
    () =>
      avaliarFechamento(
        actor.organizationId,
        [evidence("preservacao_pwa"), evidence("preservacao_pwa")],
        now
      ),
    /duplicadas/
  );
});

test("falha comprovada permanece explícita e bloqueia sucessores", () => {
  const steps = avaliarFechamento(
    actor.organizationId,
    [evidence("preservacao_pwa", { passed: false })],
    now
  );

  assert.equal(
    steps.find((step) => step.id === "preservacao_pwa").status,
    "falhou"
  );
  assert.equal(
    steps.find((step) => step.id === "produto_operacional").status,
    "bloqueado"
  );
});

test("prova de sucessor não ignora predecessor pendente", () => {
  const steps = avaliarFechamento(
    actor.organizationId,
    [evidence("produto_operacional")],
    now
  );

  assert.equal(
    steps.find((step) => step.id === "produto_operacional").status,
    "bloqueado"
  );
});

test("projeto Supabase existente sem autorização nominal nunca é aprovado", () => {
  for (const metadata of [
    { projectOrigin: "existente", projectReference: "anterior1234" },
    {
      projectOrigin: "existente_autorizado",
      projectReference: "projetoexterno1234",
    },
    { projectOrigin: "novo", projectReference: "" },
    {},
  ]) {
    assert.throws(
      () =>
        avaliarFechamento(
          actor.organizationId,
          [evidence("supabase_novo", { metadata })],
          now
        ),
      /projeto novo/
    );
  }
});

test("projeto Supabase legado nominalmente autorizado pode aprovar o gate", () => {
  const steps = avaliarFechamento(
    actor.organizationId,
    [
      evidence("preservacao_pwa"),
      evidence("identidade_clerk"),
      evidence("supabase_novo", {
        metadata: {
          projectOrigin: "existente_autorizado",
          projectReference: REFERENCIA_SUPABASE_LEGADO_AUTORIZADO,
        },
      }),
    ],
    now
  );

  assert.equal(
    steps.find((step) => step.id === "supabase_novo").status,
    "passou"
  );
});

test("integração recusa autoridade de identidade paralela", () => {
  assert.throws(
    () =>
      avaliarFechamento(
        actor.organizationId,
        [
          evidence("clerk_supabase", {
            metadata: { identityAuthority: "Supabase Auth" },
          }),
        ],
        now
      ),
    /única autoridade/
  );
});

test("isolamento exige dois tenants e cinco operações reais", () => {
  for (const metadata of [
    {
      tenantCount: 1,
      coverage: ["select", "insert", "update", "delete", "storage"],
    },
    { tenantCount: 2, coverage: ["select", "insert", "update", "delete"] },
    { tenantCount: 2, coverage: ["storage"] },
  ]) {
    assert.throws(
      () =>
        avaliarFechamento(
          actor.organizationId,
          [evidence("isolamento_multi_tenant", { metadata })],
          now
        ),
      /dois tenants/
    );
  }
});

test("runner e CI não passam com zero steps", () => {
  for (const stepId of ["runner_actions", "ci_verde"]) {
    assert.throws(
      () =>
        avaliarFechamento(
          actor.organizationId,
          [evidence(stepId, { metadata: { executedSteps: 0 } })],
          now
        ),
      /steps realmente executados/
    );
  }
});

test("todos os gates passam somente com provas reais para cada dependência", () => {
  const steps = avaliarFechamento(actor.organizationId, allEvidence(), now);

  assert.ok(steps.every((step) => step.status === "passou"));
  assert.ok(gatesFechamento(steps).every((gate) => gate.status === "PASSOU"));
});

test("mobile segue bloqueado antes de produção web, sync, isolamento e Clerk móvel", () => {
  const steps = avaliarFechamento(actor.organizationId, localEvidence(), now);
  const mobile = steps.find((step) => step.id === "mobile_expo");

  assert.equal(mobile.status, "bloqueado");
  assert.deepEqual(mobile.blockedBy, [
    "clerk_mobile",
    "smoke_producao",
    "sincronizacao_remota",
    "isolamento_multi_tenant",
  ]);
});

test("Actions sem jobs não representa execução", () => {
  assert.equal(diagnosticarActions([]).status, "nao_executado");
});

test("Actions em andamento não é aprovado antecipadamente", () => {
  const result = diagnosticarActions([
    { name: "Preservação", status: "in_progress", conclusion: null, steps: [] },
  ]);

  assert.equal(result.status, "em_execucao");
});

test("reexecução autorizada com zero steps continua bloqueada", () => {
  const result = diagnosticarActions(
    [
      {
        name: "Preservação",
        status: "completed",
        conclusion: "failure",
        steps: [],
      },
      { name: "Build", status: "completed", conclusion: "skipped", steps: [] },
    ],
    true
  );

  assert.equal(result.status, "runner_sem_execucao");
  assert.equal(result.rerunAuthorized, true);
  assert.equal(result.executedSteps, 0);
  assert.match(result.nextAction, /não atribuir cobrança sem evidência/);
});

test("falha depois de executar steps é diferenciada de runner indisponível", () => {
  const result = diagnosticarActions([
    {
      name: "Build",
      status: "completed",
      conclusion: "failure",
      steps: [{ conclusion: "success" }, { conclusion: "failure" }],
    },
  ]);

  assert.equal(result.status, "falhou_em_step");
  assert.equal(result.executedSteps, 2);
});

test("job marcado sucesso sem steps não fabrica CI verde", () => {
  const result = diagnosticarActions([
    { name: "Build", status: "completed", conclusion: "success", steps: [] },
  ]);

  assert.equal(result.status, "runner_sem_execucao");
});

test("Actions verde exige steps executados e jobs bem-sucedidos", () => {
  const result = diagnosticarActions([
    {
      name: "Preservação",
      status: "completed",
      conclusion: "success",
      steps: [{ conclusion: "success" }],
    },
    {
      name: "Build",
      status: "completed",
      conclusion: "success",
      steps: [{ conclusion: "success" }, { conclusion: "success" }],
    },
  ]);

  assert.equal(result.status, "verde");
  assert.equal(result.executedSteps, 3);
});

test("pacote somente de configuração não executa typecheck na raiz do monorepo", async () => {
  const configurationPackage = JSON.parse(
    await readFile(
      new URL("../../packages/typescript-config/package.json", import.meta.url),
      "utf8"
    )
  );

  assert.equal(configurationPackage.name, "@repo/typescript-config");
  assert.ok(!("typecheck" in configurationPackage.scripts));
});

test("database gera cliente Prisma antes do typecheck exigido pelo starter", async () => {
  const databasePackage = JSON.parse(
    await readFile(
      new URL("../../packages/database/package.json", import.meta.url),
      "utf8"
    )
  );
  const command = databasePackage.scripts.typecheck;

  assert.match(command, /^prisma generate --no-hints --schema=/);
  assert.ok(
    command.indexOf("prisma generate") < command.indexOf("tsc --noEmit")
  );
});

test("layout mantém URLs legais válidas quando o build dispensa validação externa", async () => {
  const source = await readFile(
    new URL("../../apps/app/app/layout.tsx", import.meta.url),
    "utf8"
  );

  assert.match(
    source,
    /env\.NEXT_PUBLIC_WEB_URL \?\? "http:\/\/localhost:3001"/
  );
  assert.match(source, /new URL\("\/legal\/privacy", webUrl\)/);
  assert.match(source, /new URL\("\/legal\/terms", webUrl\)/);
});

test("Knock v1 usa options tipadas e degrada sem chave configurada", async () => {
  const source = await readFile(
    new URL("../../packages/notifications/index.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /new Knock\(\{ apiKey: key \}\)/);
  assert.match(source, /key \? new Knock/);
  assert.match(source, /: undefined/);
  assert.doesNotMatch(source, /new Knock\(key\)/);
});

test("design system usa payload explícito compatível com Recharts v3", async () => {
  const source = await readFile(
    new URL(
      "../../packages/design-system/components/ui/chart.tsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(source, /RechartsPrimitive\.TooltipPayloadEntry/);
  assert.match(source, /string \| number/);
  assert.match(source, /RechartsPrimitive\.LegendPayload\[\]/);
  assert.match(
    source,
    /formatter\(item\.value, item\.name, item, index, payload\)/
  );
  assert.doesNotMatch(
    source,
    /Pick<RechartsPrimitive\.LegendProps, "payload" \| "verticalAlign">/
  );
});

test("painéis preservam wrappers e usam primitivas acessíveis da versão 4", async () => {
  const source = await readFile(
    new URL(
      "../../packages/design-system/components/ui/resizable.tsx",
      import.meta.url
    ),
    "utf8"
  );

  assert.match(source, /ResizablePrimitive\.Group/);
  assert.match(source, /ResizablePrimitive\.Separator/);
  assert.match(source, /aria-\[orientation=vertical\]/);
  assert.doesNotMatch(source, /ResizablePrimitive\.PanelGroup/);
  assert.doesNotMatch(source, /ResizablePrimitive\.PanelResizeHandle/);
  assert.match(
    source,
    /export \{ ResizablePanelGroup, ResizablePanel, ResizableHandle \}/
  );
});

test("restauração colaborativa conserva campos dinâmicos com type guard seguro", async () => {
  const source = await readFile(
    new URL("../../apps/app/lib/executar/domain.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /item is Record<string, unknown> &/);
  assert.match(source, /\(mention: unknown\) => typeof mention === "string"/);
});

test("lint mantém regras de produção e flexibiliza regex somente nos testes", async () => {
  const configuration = JSON.parse(
    await readFile(new URL("../../biome.jsonc", import.meta.url), "utf8")
  );
  const testOverride = configuration.overrides.find((entry) =>
    entry.includes.includes("tests/**/*.mjs")
  );

  assert.equal(testOverride.linter.rules.performance.useTopLevelRegex, "off");
  assert.ok(!("useTopLevelRegex" in configuration.linter.rules.performance));
});

test("diagnóstico de ambiente lista nomes, nunca divulga valores", () => {
  const result = diagnosticarAmbienteFinal({
    CLERK_SECRET_KEY: "segredo-real-jamais-exposto",
    NEXT_PUBLIC_SUPABASE_URL: configuration.url,
  });

  assert.deepEqual(result.configured, [
    "NEXT_PUBLIC_SUPABASE_URL",
    "CLERK_SECRET_KEY",
  ]);
  assert.ok(result.missing.includes("DATABASE_URL"));
  assert.ok(!JSON.stringify(result).includes("segredo-real"));
});

test("ambiente vazio não bloqueia implementação nem fabrica configuração", () => {
  const result = diagnosticarAmbienteFinal({});

  assert.deepEqual(result.configured, []);
  assert.equal(result.missing.length, VARIAVEIS_INTEGRACAO_FINAL.length);
});

test("service role ou secret em NEXT_PUBLIC é recusado", () => {
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE",
    "NEXT_PUBLIC_CLERK_SECRET_KEY",
    "NEXT_PUBLIC_PRIVATE_TOKEN",
  ]) {
    assert.throws(
      () => diagnosticarAmbienteFinal({ [key]: "valor" }),
      /expõe uma credencial privada/
    );
  }
});

test("cliente Supabase injeta token da sessão Clerk por accessToken nativo", async () => {
  const client = criarClienteSupabaseClerk(
    configuration,
    session,
    (url, key, options) => ({ url, key, options })
  );

  assert.equal(client.url, configuration.url);
  assert.equal(client.key, configuration.publishableKey);
  assert.equal(await client.options.accessToken(), "clerk-session-token");
  assert.ok(!("jwtTemplate" in client.options));
});

test("cliente suporta sessão Clerk encerrada sem inventar token", async () => {
  const client = criarClienteSupabaseClerk(
    configuration,
    { ...session, getToken: async () => null },
    (_url, _key, options) => options
  );

  assert.equal(await client.accessToken(), null);
});

test("cliente recusa projeto Supabase existente sem autorização nominal", () => {
  for (const projectOrigin of ["existente", "existente_autorizado"]) {
    assert.throws(
      () =>
        criarClienteSupabaseClerk(
          { ...configuration, projectOrigin },
          session,
          () => ({})
        ),
      /projeto novo/
    );
  }
});

test("cliente aceita somente o projeto legado nominalmente autorizado", async () => {
  const url = `https://${REFERENCIA_SUPABASE_LEGADO_AUTORIZADO}.supabase.co`;
  const client = criarClienteSupabaseClerk(
    {
      ...configuration,
      projectOrigin: "existente_autorizado",
      projectReference: REFERENCIA_SUPABASE_LEGADO_AUTORIZADO,
      url,
    },
    session,
    (projectUrl, key, options) => ({ projectUrl, key, options })
  );

  assert.equal(client.projectUrl, url);
  assert.equal(await client.options.accessToken(), "clerk-session-token");
});

test("cliente recusa referência de projeto inválida", () => {
  assert.throws(
    () =>
      criarClienteSupabaseClerk(
        { ...configuration, projectReference: "../outro" },
        session,
        () => ({})
      ),
    /projeto novo/
  );
});

test("cliente recusa URL inválida, HTTP, credenciais e projeto divergente", () => {
  for (const url of [
    "não-é-url",
    "http://executar12345678.supabase.co",
    "https://outroprojeto.supabase.co",
    "https://usuario:senha@executar12345678.supabase.co",
    "https://executar12345678.supabase.co/outro",
    "https://executar12345678.supabase.co/?token=segredo",
    "https://executar12345678.supabase.co/#segredo",
  ]) {
    assert.throws(
      () =>
        criarClienteSupabaseClerk(
          { ...configuration, url },
          session,
          () => ({})
        ),
      /URL/
    );
  }
});

test("cliente aceita somente chave publicável, nunca secret ou service role", () => {
  for (const publishableKey of [
    "sb_secret_verdadeiro",
    "service_role_token",
    "eyJ_legacy_anon",
  ]) {
    assert.throws(
      () =>
        criarClienteSupabaseClerk(
          { ...configuration, publishableKey },
          session,
          () => ({})
        ),
      /chave publicável/
    );
  }
});

test("cliente exige identidade Clerk válida", () => {
  assert.throws(
    () =>
      criarClienteSupabaseClerk(
        configuration,
        { ...session, userId: "visitante" },
        () => ({})
      ),
    /usuário Clerk/
  );
});

test("caminho de evidência é separado por organização, projeto e entrega", () => {
  assert.equal(
    caminhoEvidenciaOrganizacao(state(), actor, "A", "nota final.pdf"),
    "org_executar/sprint-principal/A/nota-final.pdf"
  );
});

test("evidência de outro tenant ou usuário inválido é bloqueada", () => {
  assert.throws(
    () =>
      caminhoEvidenciaOrganizacao(
        state(),
        { ...actor, organizationId: "org_externa" },
        "A",
        "nota.pdf"
      ),
    /outra organização/
  );
  assert.throws(
    () =>
      caminhoEvidenciaOrganizacao(
        state(),
        { ...actor, userId: "visitante" },
        "A",
        "nota.pdf"
      ),
    /usuário Clerk/
  );
});

test("evidência rejeita entrega externa e path traversal", () => {
  assert.throws(
    () => caminhoEvidenciaOrganizacao(state(), actor, "EXTERNA", "nota.pdf"),
    /projeto ativo/
  );

  for (const fileName of ["", ".", "..", "../segredo.txt", "a..txt"]) {
    assert.throws(
      () => caminhoEvidenciaOrganizacao(state(), actor, "A", fileName),
      /nome do arquivo/
    );
  }
});

test("lote remoto deriva projetos e entregas diretamente do estado canônico", () => {
  const batch = prepararLotePersistencia(state(), actor);

  assert.equal(batch.authority, "Clerk");
  assert.equal(batch.organizationId, actor.organizationId);
  assert.equal(batch.projects.length, 1);
  assert.equal(batch.deliveries.length, 2);
  assert.equal(batch.deliveries[1].definition_of_done, "Publicação validada");
  assert.equal(batch.deliveries[0].definition_of_done, null);
});

test("dependências exportadas preservam tenant e projeto compostos", () => {
  const batch = prepararLotePersistencia(state(), actor);

  assert.deepEqual(batch.dependencies, [
    {
      organization_id: "org_executar",
      project_id: "sprint-principal",
      delivery_id: "B",
      predecessor_id: "A",
    },
  ]);
});

test("lote inclui múltiplos projetos sem duplicar estado paralelo", () => {
  const multiple = criarProjeto(state(), "Projeto adicional");
  const batch = prepararLotePersistencia(multiple, actor);

  assert.equal(batch.projects.length, 2);
  assert.equal(batch.deliveries.length, 2);
  assert.ok(!("members" in batch));
});

test("sincronização usa eventos reais, revisão e identificadores idempotentes", () => {
  const focused = assumirFoco(tasks, state(), "A");
  const evidenced = registrarEvidencia(
    tasks,
    focused,
    "A",
    "Resultado verificado",
    "",
    true
  );
  const batch = prepararLotePersistencia(evidenced, actor, 1);

  assert.equal(batch.sync.baseRevision, 1);
  assert.equal(batch.sync.revision, evidenced.revision);
  assert.ok(batch.sync.events.every((event) => event.revision > 1));
  assert.ok(
    batch.sync.operationIds.every((id) => id.startsWith("org_executar:"))
  );
});

test("lote remoto não aceita ator de organização diferente", () => {
  assert.throws(
    () =>
      prepararLotePersistencia(state(), {
        ...actor,
        organizationId: "org_externa",
      }),
    /outra organização/
  );
});

test("lote recusa revisão sincronizada incompatível", () => {
  assert.throws(
    () => prepararLotePersistencia(state(), actor, 99),
    /Revisão sincronizada inválida/
  );
});

test("template declara explicitamente que não é migration aplicada", async () => {
  const sql = await template();

  assert.match(sql, /NÃO uma migration aplicada/);
  assert.match(sql, /supabase migration new executar_multi_tenant/);
  assert.match(sql, /projeto Supabase NOVO/);
});

test("migrations oficiais correspondem às execuções reais no Supabase", async () => {
  const [foundation, hardening] = await Promise.all([
    readFile(
      new URL(
        "../../supabase/migrations/20260822153100_executar_multi_tenant.sql",
        import.meta.url
      ),
      "utf8"
    ),
    readFile(
      new URL(
        "../../supabase/migrations/20260822153334_executar_clerk_identity_hardening.sql",
        import.meta.url
      ),
      "utf8"
    ),
  ]);

  assert.match(foundation, /create table public\.executar_organizations/);
  assert.doesNotMatch(foundation, /NÃO uma migration aplicada/);
  assert.match(hardening, /alter policy %I on public\.%I/);
  assert.match(hardening, /is_anonymous/);
  assert.match(hardening, /alter policy executar_storage_select_organization/);
});

test("template cria nove recursos multi-tenant sem membership paralelo", async () => {
  const sql = await template();
  const names = [
    "organizations",
    "projects",
    "deliveries",
    "dependencies",
    "evidence",
    "events",
    "approvals",
    "comments",
    "notification_reads",
  ];

  for (const name of names) {
    assert.match(sql, new RegExp(`create table public\\.executar_${name} \\(`));
  }

  assert.equal((sql.match(/create table public\.executar_/g) ?? []).length, 9);
  assert.doesNotMatch(
    sql,
    /create table\s+(?:public\.)?(?:members|memberships|users)\b/i
  );
});

test("chaves compostas impedem referências cruzadas entre tenants", async () => {
  const sql = await template();

  assert.match(sql, /primary key \(organization_id, project_id, delivery_id\)/);
  assert.match(
    sql,
    /foreign key \(organization_id, project_id, predecessor_id\)\s+references public\.executar_deliveries \(organization_id, project_id, delivery_id\)/
  );
  assert.match(sql, /check \(delivery_id <> predecessor_id\)/);
});

test("RLS usa organização Clerk moderna e legada, nunca user metadata", async () => {
  const sql = await template();

  assert.match(sql, /auth\.jwt\(\) -> ''o'' ->> ''id''/);
  assert.match(sql, /auth\.jwt\(\) ->> ''org_id''/);
  assert.doesNotMatch(sql, /user_metadata|raw_user_meta_data|auth\.role\(\)/i);
  assert.doesNotMatch(sql, /security definer/i);
});

test("RLS e Storage rejeitam acesso anônimo e sujeitos externos ao Clerk", async () => {
  const sql = await template();

  assert.match(sql, /auth\.jwt\(\) ->> ''is_anonymous''/);
  assert.match(sql, /auth\.jwt\(\) ->> ''sub''\) ~ ''\^user_/);
  assert.equal(
    (sql.match(/auth\.jwt\(\) ->> 'is_anonymous'/g) ?? []).length,
    5
  );
  assert.equal(
    (sql.match(/auth\.jwt\(\) ->> 'sub'\) ~ '\^user_/g) ?? []).length,
    5
  );
});

test("cada recurso recebe RLS obrigatória e permissões mínimas", async () => {
  const sql = await template();

  assert.match(sql, /enable row level security/);
  assert.match(sql, /force row level security/);
  assert.match(sql, /revoke all on public\.%I from anon/);
  assert.match(
    sql,
    /grant select, insert, update, delete on public\.%I to authenticated/
  );
  assert.doesNotMatch(sql, /grant all\b/i);
});

test("RLS cobre SELECT, INSERT, UPDATE e DELETE com WITH CHECK no update", async () => {
  const sql = await template();

  assert.match(sql, /for select to authenticated using \(%s\)/);
  assert.match(sql, /for insert to authenticated with check \(%s\)/);
  assert.match(
    sql,
    /for update to authenticated using \(%s\) with check \(%s\)/
  );
  assert.match(sql, /for delete to authenticated using \(%s\)/);
});

test("autoria, aprovação e leitura privada usam o usuário Clerk do JWT", async () => {
  const sql = await template();

  assert.match(sql, /user_id = \(select auth\.jwt\(\) ->> ''sub''\)/);
  assert.match(sql, /author_user_id = \(select auth\.jwt\(\) ->> ''sub''\)/);
  assert.match(sql, /actor_user_id = \(select auth\.jwt\(\) ->> ''sub''\)/);
  assert.match(
    sql,
    /requested_by_user_id = \(select auth\.jwt\(\) ->> ''sub''\)/
  );
  assert.match(
    sql,
    /approved_by_user_id = \(select auth\.jwt\(\) ->> ''sub''\)/
  );
});

test("eventos auditáveis não podem ser alterados ou excluídos por authenticated", async () => {
  const sql = await template();

  assert.match(
    sql,
    /relation_name = 'executar_events'[\s\S]*?revoke update, delete on public\.%I from authenticated/
  );
});

test("bucket de evidência é privado e limitado a 2,5 MB", async () => {
  const sql = await template();

  assert.match(
    sql,
    /'executar-evidencias', 'executar-evidencias', false, 2621440/
  );
  assert.match(sql, /split_part\(storage_path, '\/', 1\) = organization_id/);
});

test("Storage limita todas as operações ao prefixo da organização", async () => {
  const sql = await template();

  for (const operation of ["select", "insert", "update", "delete"]) {
    assert.match(
      sql,
      new RegExp(`create policy executar_storage_${operation}_organization`)
    );
  }

  assert.equal(
    (sql.match(/\(storage\.foldername\(name\)\)\[1\]/g) ?? []).length,
    5
  );
  assert.match(
    sql,
    /executar_storage_update_organization[\s\S]*?\nusing \([\s\S]*?\nwith check \(/
  );
});

test("schema indexa filtros de tenant e chaves estrangeiras", async () => {
  const sql = await template();

  for (const index of [
    "executar_projects_organization_idx",
    "executar_deliveries_project_status_idx",
    "executar_dependencies_predecessor_idx",
    "executar_evidence_delivery_idx",
    "executar_events_revision_idx",
    "executar_approvals_project_status_idx",
    "executar_comments_delivery_idx",
    "executar_notification_reads_user_idx",
  ]) {
    assert.match(sql, new RegExp(`create index ${index}`));
  }
});

test("eventos e aprovações preservam auditoria humana por organização", async () => {
  const sql = await template();

  assert.match(sql, /unique \(organization_id, project_id, revision\)/);
  assert.match(sql, /actor_type in \('humano', 'copiloto'\)/);
  assert.match(sql, /human_approved boolean not null default false/);
  assert.match(
    sql,
    /check \(status <> 'approved' or approved_by_user_id is not null\)/
  );
});

test("Realtime inclui somente eventos e comentários operacionais", async () => {
  const sql = await template();

  assert.match(sql, /add table public\.executar_events/);
  assert.match(sql, /add table public\.executar_comments/);
  assert.equal(
    (sql.match(/alter publication supabase_realtime add table/g) ?? []).length,
    2
  );
});

test("runner registra onda 5 como fechamento sem substituir o plano de quatro ondas", async () => {
  const [readme, plan, status] = await Promise.all([
    readFile(new URL("../../docs/runner/README.md", import.meta.url), "utf8"),
    readFile(
      new URL("../../docs/runner/PLANO_SAAS_4_ONDAS.md", import.meta.url),
      "utf8"
    ),
    readFile(
      new URL("../../docs/runner/ONDA_5_FECHAMENTO.md", import.meta.url),
      "utf8"
    ),
  ]);

  assert.match(readme, /ONDA_5_FECHAMENTO\.md/);
  assert.match(plan, /Plano SaaS · 4 Ondas/);
  assert.match(status, /etapa adicional de fechamento/);
  assert.match(status, /Gate de integração.*NÃO PASSOU/);
});

test("checklist final exige autorização antes de provisionar projeto novo", async () => {
  const checklist = await readFile(
    new URL("../../docs/runner/INTEGRACAO_FINAL.md", import.meta.url),
    "utf8"
  );

  assert.match(
    checklist,
    /autorização explícita para iniciar a\s+integração final/
  );
  assert.match(checklist, /supabase migration new executar_multi_tenant/);
  assert.match(checklist, /EXECUTAR_SUPABASE_TEMPLATE\.sql/);
});
