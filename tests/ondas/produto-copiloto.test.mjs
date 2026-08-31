import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assumirFoco,
  chaveOrganizacao,
  concluirEntrega,
  dependenciasPendentes,
  estadoEntrega,
  eventosPendentes,
  executarCopiloto,
  executarFerramenta,
  FERRAMENTAS_OPERACIONAIS,
  filaBloqueada,
  filaPronta,
  focoAtual,
  novoEstado,
  progresso,
  ROTULOS_ESTADO,
  registrarEvidencia,
  registrarPasso,
  restaurarEstado,
  subgrafoAfetado,
} from "../../apps/app/lib/executar/domain.ts";
import { ENTREGAS_SPRINT } from "../../apps/app/lib/executar/seed.ts";

const entregas = [
  {
    id: "A",
    title: "Preparar base",
    front: "Operações",
    date: "24/08",
    mins: 30,
    deps: [],
    stage: 1,
  },
  {
    id: "B",
    title: "Liberar produto",
    front: "Desenvolvimento",
    date: "25/08",
    mins: 45,
    deps: ["A"],
    stage: 2,
  },
  {
    id: "C",
    title: "Registrar contexto",
    front: "Criativo",
    date: "24/08",
    mins: 15,
    deps: [],
    stage: 1,
  },
  {
    id: "D",
    title: "Publicar resultado",
    front: "Operações",
    date: "26/08",
    mins: 60,
    deps: ["B"],
    stage: 3,
  },
];

function estadoComEvidencia(taskId = "A") {
  const focus = assumirFoco(entregas, novoEstado("org_a"), taskId);

  return registrarEvidencia(
    entregas,
    focus,
    taskId,
    "Entrega verificada",
    "",
    true
  );
}

test("preserva exatamente as 33 entregas originais como seed tipada", async () => {
  const legacy = await readFile(
    new URL(
      "../../apps/app/public/legado/sprint-operacional/data.js",
      import.meta.url
    ),
    "utf8"
  );
  const original = JSON.parse(
    legacy.replace(/^window\.__TASKS__\s*=\s*/, "").replace(/;\s*$/, "")
  );

  assert.equal(ENTREGAS_SPRINT.length, 33);
  assert.deepEqual(ENTREGAS_SPRINT, original);
});

test("rejeita organização vazia", () => {
  assert.throws(() => novoEstado("  "), /Organização ativa/);
});

test("usa namespaces de armazenamento distintos por organização", () => {
  assert.equal(chaveOrganizacao("org_a"), "executar:org_a:v2");
  assert.equal(chaveOrganizacao("org_b"), "executar:org_b:v2");
  assert.notEqual(chaveOrganizacao("org_a"), chaveOrganizacao("org_b"));
});

test("impede a restauração de dados de outra organização", () => {
  const stateA = estadoComEvidencia();
  const stateB = restaurarEstado(JSON.stringify(stateA), "org_b");

  assert.equal(stateB.organizationId, "org_b");
  assert.deepEqual(stateB.done, []);
  assert.deepEqual(stateB.evidence, []);
});

test("restaura apenas o estado da organização correta", () => {
  const state = estadoComEvidencia();

  assert.deepEqual(restaurarEstado(JSON.stringify(state), "org_a"), state);
});

test("dados locais corrompidos não quebram nem atravessam tenant", () => {
  assert.deepEqual(restaurarEstado("{invalid", "org_a"), novoEstado("org_a"));
  assert.deepEqual(
    restaurarEstado(
      JSON.stringify({ organizationId: "org_a", done: [] }),
      "org_a"
    ),
    novoEstado("org_a")
  );
});

test("fila pronta contém somente entregas sem dependências pendentes", () => {
  assert.deepEqual(
    filaPronta(entregas, novoEstado("org_a")).map((task) => task.id),
    ["A", "C"]
  );
});

test("fila bloqueada identifica as dependências reais", () => {
  const state = novoEstado("org_a");

  assert.deepEqual(
    filaBloqueada(entregas, state).map((task) => task.id),
    ["B", "D"]
  );
  assert.deepEqual(dependenciasPendentes(entregas[1], state), ["A"]);
});

test("foco inicial escolhe a primeira entrega realmente pronta", () => {
  assert.equal(focoAtual(entregas, novoEstado("org_a"))?.id, "A");
});

test("nunca escolhe entrega bloqueada como fallback", () => {
  const blockedOnly = [
    {
      id: "X",
      title: "Bloqueada",
      front: "Operações",
      date: "24/08",
      mins: 15,
      deps: ["MISSING"],
      stage: 1,
    },
  ];

  assert.equal(focoAtual(blockedOnly, novoEstado("org_a")), null);
});

test("rejeita foco em entrega bloqueada", () => {
  assert.throws(
    () => assumirFoco(entregas, novoEstado("org_a"), "B"),
    /entrega liberada/
  );
});

test("mantém no máximo uma entrega em foco", () => {
  const first = assumirFoco(entregas, novoEstado("org_a"), "A");
  const changed = assumirFoco(entregas, first, "C");

  assert.equal(changed.focus, "C");
  assert.equal(estadoEntrega(entregas[0], changed), "READY");
  assert.equal(estadoEntrega(entregas[2], changed), "DOING");
});

test("não cria evento duplicado ao reassumir o mesmo foco", () => {
  const state = assumirFoco(entregas, novoEstado("org_a"), "A");

  assert.equal(assumirFoco(entregas, state, "A"), state);
});

test("registra passos somente no foco e limita ao esforço previsto", () => {
  let state = assumirFoco(entregas, novoEstado("org_a"), "A");
  state = registrarPasso(entregas, state, "A");
  state = registrarPasso(entregas, state, "A");
  state = registrarPasso(entregas, state, "A");

  assert.equal(state.started.A, 2);
  assert.throws(
    () => registrarPasso(entregas, state, "C"),
    /somente na entrega em foco/
  );
});

test("evidência exige conteúdo concreto", () => {
  const state = assumirFoco(entregas, novoEstado("org_a"), "A");

  assert.throws(
    () => registrarEvidencia(entregas, state, "A", "  "),
    /Informe uma evidência/
  );
});

test("evidência rejeita protocolos perigosos", () => {
  const state = assumirFoco(entregas, novoEstado("org_a"), "A");

  assert.throws(
    () => registrarEvidencia(entregas, state, "A", "", "javascript:alert(1)"),
    /HTTP ou HTTPS/
  );
});

test("evidência aceita URL HTTPS sem observação textual", () => {
  const state = assumirFoco(entregas, novoEstado("org_a"), "A");
  const evidenced = registrarEvidencia(
    entregas,
    state,
    "A",
    "",
    "https://executar.example/evidencia",
    true
  );

  assert.equal(evidenced.evidence[0].url, "https://executar.example/evidencia");
});

test("evidência move a entrega ativa para verificação", () => {
  assert.equal(estadoEntrega(entregas[0], estadoComEvidencia()), "VERIFY");
});

test("proíbe conclusão sem evidência", () => {
  const state = assumirFoco(entregas, novoEstado("org_a"), "A");

  assert.throws(
    () => concluirEntrega(entregas, state, "A"),
    /evidência e verificação/
  );
});

test("proíbe conclusão com evidência não verificada", () => {
  const focused = assumirFoco(entregas, novoEstado("org_a"), "A");
  const unverified = registrarEvidencia(
    entregas,
    focused,
    "A",
    "Rascunho",
    "",
    false
  );

  assert.throws(
    () => concluirEntrega(entregas, unverified, "A"),
    /evidência e verificação/
  );
});

test("conclusão verificada libera sucessor e mantém foco único", () => {
  const completed = concluirEntrega(entregas, estadoComEvidencia(), "A");

  assert.deepEqual(completed.done, ["A"]);
  assert.equal(completed.focus, "B");
  assert.deepEqual(
    filaPronta(entregas, completed).map((task) => task.id),
    ["B", "C"]
  );
  assert.equal(estadoEntrega(entregas[0], completed), "DONE");
});

test("não permite concluir entrega que ainda está bloqueada", () => {
  assert.throws(
    () => concluirEntrega(entregas, estadoComEvidencia(), "B"),
    /não está liberada/
  );
});

test("calcula progresso pelo esforço real, não apenas pelo número de itens", () => {
  const state = concluirEntrega(entregas, estadoComEvidencia(), "A");

  assert.deepEqual(progresso(entregas, state), {
    completed: 30,
    total: 150,
    percentage: 20,
  });
});

test("rastreia ações mutantes com organização e revisão", () => {
  const state = concluirEntrega(entregas, estadoComEvidencia(), "A");

  assert.equal(state.revision, 3);
  assert.deepEqual(
    state.events.map((event) => event.action),
    ["foco.assumido", "evidencia.registrada", "entrega.concluida"]
  );
  assert.ok(state.events.every((event) => event.organizationId === "org_a"));
});

test("replanejamento recalcula apenas o subgrafo afetado", () => {
  assert.deepEqual(
    subgrafoAfetado(entregas, "A").map((task) => task.id),
    ["A", "B", "D"]
  );
  assert.deepEqual(
    subgrafoAfetado(entregas, "C").map((task) => task.id),
    ["C"]
  );
});

test("Copiloto responde o próximo item a partir do estado real", () => {
  const answer = executarCopiloto(
    entregas,
    novoEstado("org_a"),
    "o que faço agora?"
  );

  assert.equal(answer.command, "/agora");
  assert.match(answer.reply, /Preparar base/);
  assert.doesNotMatch(answer.reply, /Liberar produto/);
});

test("Copiloto acompanha o sucessor liberado após conclusão", () => {
  const state = concluirEntrega(entregas, estadoComEvidencia(), "A");
  const answer = executarCopiloto(entregas, state, "/agora");

  assert.match(answer.reply, /Liberar produto/);
  assert.equal(answer.state, state);
});

test("Copiloto informa estado e bloqueios canônicos", () => {
  const state = novoEstado("org_a");

  assert.match(executarCopiloto(entregas, state, "/estado").reply, /0\/4/);
  assert.match(
    executarCopiloto(entregas, state, "/bloqueio").reply,
    /aguarda A/
  );
  assert.match(
    executarCopiloto(entregas, state, "/mapa").reply,
    /2 entrega\(s\)/
  );
});

test("fechamento parcial preserva progresso e não inventa conclusão", () => {
  const focused = assumirFoco(entregas, novoEstado("org_a"), "A");
  const progressed = registrarPasso(entregas, focused, "A");
  const answer = executarCopiloto(entregas, progressed, "/fechardia");

  assert.match(answer.reply, /parcialmente/);
  assert.match(answer.reply, /1 passo/);
  assert.deepEqual(answer.state.done, []);
  assert.equal(answer.state, progressed);
});

test("Copiloto exige aprovação humana mesmo com evidência verificada", () => {
  const evidenced = estadoComEvidencia();
  const answer = executarCopiloto(entregas, evidenced, "/fechardia");

  assert.equal(answer.requiresApproval, true);
  assert.deepEqual(answer.state.done, []);
  assert.equal(answer.state, evidenced);
});

test("Copiloto replaneja somente o subgrafo solicitado", () => {
  const answer = executarCopiloto(
    entregas,
    novoEstado("org_a"),
    "/replanejamento A"
  );

  assert.match(answer.reply, /3 entrega\(s\)/);
  assert.match(answer.reply, /restante do plano permanece intacto/);
});

test("contratos classificam escrita relevante e exigem aprovação", () => {
  const complete = FERRAMENTAS_OPERACIONAIS.find(
    (tool) => tool.name === "concluir_entrega"
  );

  assert.equal(complete?.effect, "relevant-write");
  assert.equal(complete?.requiresApproval, true);
});

test("ferramenta rejeita leitura ou escrita em tenant divergente", () => {
  const state = novoEstado("org_a");

  assert.throws(
    () =>
      executarFerramenta(entregas, state, {
        organizationId: "org_b",
        name: "consultar_estado",
      }),
    /outra organização/
  );
  assert.throws(
    () =>
      executarFerramenta(entregas, state, {
        organizationId: "org_b",
        name: "assumir_foco",
        taskId: "A",
      }),
    /outra organização/
  );
});

test("ferramenta de conclusão exige confirmação humana explícita", () => {
  const state = estadoComEvidencia();

  assert.throws(
    () =>
      executarFerramenta(entregas, state, {
        organizationId: "org_a",
        name: "concluir_entrega",
        taskId: "A",
      }),
    /aprovação humana/
  );

  const completed = executarFerramenta(entregas, state, {
    organizationId: "org_a",
    name: "concluir_entrega",
    taskId: "A",
    approved: true,
  });

  assert.deepEqual(completed.done, ["A"]);
});

test("sincronização futura deriva eventos do estado único, sem fila paralela", () => {
  const state = estadoComEvidencia();

  assert.equal(eventosPendentes(state, "org_a").length, 2);
  assert.equal(eventosPendentes(state, "org_a", 1).length, 1);
  assert.equal(eventosPendentes(state, "org_a", state.revision).length, 0);
});

test("sincronização futura não publica eventos de outra organização", () => {
  const state = estadoComEvidencia();

  assert.throws(
    () => eventosPendentes(state, "org_b"),
    /organização divergente/
  );
  assert.throws(() => eventosPendentes(state, "org_a", 99), /Revisão/);
});

test("rotula todos os estados operacionais em português", () => {
  assert.deepEqual(Object.values(ROTULOS_ESTADO), [
    "VALIDADO",
    "PRONTO",
    "EM EXECUÇÃO",
    "VERIFICAR",
    "CONCLUÍDO",
    "BLOQUEADO",
  ]);
});

test("a página principal usa Clerk e não bloqueia esperando banco", async () => {
  const page = await readFile(
    new URL("../../apps/app/app/(authenticated)/page.tsx", import.meta.url),
    "utf8"
  );

  assert.match(page, /await auth\(\)/);
  assert.match(page, /organizationId=\{orgId\}/);
  assert.doesNotMatch(page, /database\.page\.findMany/);
});

test("produto mantém estado único com lista, drawer e Copiloto", async () => {
  const component = await readFile(
    new URL(
      "../../apps/app/app/(authenticated)/components/executar-operacional.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const workspace = await readFile(
    new URL(
      "../../apps/app/app/(authenticated)/components/executar-workspace.tsx",
      import.meta.url
    ),
    "utf8"
  );

  for (const label of [
    "Tarefas",
    "Projetos",
    "Documentos",
    "Calendário",
    "Caminho",
    "Copiloto",
    "Automático",
    "Operacional local",
  ]) {
    assert.ok(
      component.includes(label) || workspace.includes(label),
      `Ausente: ${label}`
    );
  }

  assert.match(component, /executarAcaoCopiloto\(state, question\)/);
  assert.match(component, /entregasAtivas\(state\)/);
  assert.match(component, /chaveOrganizacao\(organizationId\)/);
  assert.match(component, /function MobileDrawer/);
  assert.match(component, /function CopilotModelSelector/);
  assert.match(component, /useState<View>\("workspace"\)/);
  assert.doesNotMatch(component, /<OperationalNavigation/);
  assert.match(workspace, /function WorkspaceSurface/);
  assert.match(workspace, /function WorkspaceActions/);
  assert.match(workspace, /Scanner/);
  assert.match(workspace, />IA</);
  assert.match(component, /<AiMessage/);
});

test("handoff simplificado remove Home e mantém três ações persistentes", async () => {
  const component = await readFile(
    new URL(
      "../../apps/app/app/(authenticated)/components/executar-operacional.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const workspace = await readFile(
    new URL(
      "../../apps/app/app/(authenticated)/components/executar-workspace.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const styles = await readFile(
    new URL(
      "../../apps/app/app/(authenticated)/web-surface.css",
      import.meta.url
    ),
    "utf8"
  );

  assert.doesNotMatch(component, /selectProductView\("home"\)/);
  assert.doesNotMatch(component, /<HomeSurface/);
  assert.doesNotMatch(component, /<TimelineSurface/);
  assert.match(component, /<WorkspaceHeader/);
  assert.match(component, /<WorkspaceActions/);
  assert.match(component, /<WorkspaceSurface/);

  for (const className of [
    ".executarWorkspaceHeader",
    ".executarWorkspaceSurface",
    ".executarWorkspaceTask",
    ".executarWorkspaceActions",
    ".executarWorkspaceTaskSheet",
  ]) {
    assert.ok(styles.includes(className), `Ausente: ${className}`);
  }

  assert.match(styles, /repeat\(3, minmax\(0, 1fr\)\)/);
});

test("provisionamento exige AWS privada e gates separados", async () => {
  const checklist = await readFile(
    new URL("../../docs/runner/INTEGRACAO_FINAL.md", import.meta.url),
    "utf8"
  );

  assert.match(checklist, /Aurora PostgreSQL privado/);
  assert.match(checklist, /RDS Data API/);
  assert.match(checklist, /250892133959/);
  assert.match(checklist, /sa-east-1/);
  assert.match(checklist, /Gate de código/);
  assert.match(checklist, /Gate de integração/);
  assert.match(checklist, /Gate de produção/);
});
