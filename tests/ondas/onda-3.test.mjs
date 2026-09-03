import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  configuracaoAiSdkPreparada,
  criarAdaptadorAgente,
  descreverFerramentasAgente,
  manifestoMcpPreparado,
} from "../../apps/app/lib/executar/agent-contract.ts";
import {
  assumirFoco,
  criarProjeto,
  editarEntrega,
  entregasAtivas,
  executarAcaoCopiloto,
  executarCopiloto,
  executarFerramenta,
  FERRAMENTAS_OPERACIONAIS,
  LIMITES_COPILOTO,
  novoEstado,
  registrarEvidencia,
  replanejarSubgrafo,
  resolverAprovacaoCopiloto,
  selecionarProjeto,
} from "../../apps/app/lib/executar/domain.ts";

const tasks = [
  {
    id: "A",
    title: "Preparar base",
    front: "Operações",
    date: "24/08",
    mins: 30,
    deps: [],
    stage: 1,
    dod: "Base entregue e testada",
  },
  {
    id: "B",
    title: "Publicar produto",
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
    title: "Distribuir resultado",
    front: "Operações",
    date: "26/08",
    mins: 30,
    deps: ["B"],
    stage: 3,
  },
];

const task = (id, deps = []) => ({
  id,
  title: `Entrega ${id}`,
  front: "Operações",
  date: "27/08",
  mins: 30,
  deps,
  stage: 2,
  dod: `Entrega ${id} validada`,
});

function initial() {
  return novoEstado("org_a", tasks);
}

function proof() {
  const focused = assumirFoco(tasks, initial(), "A");

  return registrarEvidencia(tasks, focused, "A", "Teste aprovado", "", true);
}

function memoryPort(initialState = initial()) {
  let current = initialState;

  return {
    organizationId: initialState.organizationId,
    read: () => current,
    commit: (next) => {
      current = next;
    },
  };
}

function adapter(port, limit = 8) {
  return criarAdaptadorAgente(
    port,
    FERRAMENTAS_OPERACIONAIS,
    executarFerramenta,
    resolverAprovacaoCopiloto,
    limit
  );
}

test("Copiloto cria e seleciona projeto por comando explícito", () => {
  const result = executarAcaoCopiloto(
    initial(),
    "/projeto criar Campanha Digital"
  );

  assert.equal(result.state.activeProjectId, "campanha-digital");
  assert.equal(result.state.projects.length, 2);
  assert.equal(result.approval, null);
  assert.equal(result.state.events.length, 2);
  assert.ok(result.state.events.every((event) => event.actor === "copiloto"));
});

test("Copiloto compreende linguagem natural para criar plano", () => {
  const result = executarAcaoCopiloto(
    initial(),
    "criar plano Lançamento Nordeste"
  );

  assert.equal(result.state.activeProjectId, "lancamento-nordeste");
});

test("Copiloto renomeia o projeto canônico sem criar estado paralelo", () => {
  const result = executarAcaoCopiloto(
    initial(),
    "/plano renomear Sprint Revisto"
  );

  assert.equal(result.state.projects[0].name, "Sprint Revisto");
  assert.equal(result.state.events.at(-1)?.tool, "renomear_projeto");
});

test("Copiloto seleciona apenas projeto pertencente à organização", () => {
  const created = criarProjeto(initial(), "Segundo");
  const result = executarAcaoCopiloto(created, "/projeto selecionar segundo");

  assert.equal(result.state.activeProjectId, "segundo");
  assert.throws(
    () => executarAcaoCopiloto(created, "/projeto selecionar externo"),
    /organização ativa/
  );
});

test("Copiloto cria entrega a partir de JSON tipado", () => {
  const result = executarAcaoCopiloto(
    initial(),
    `/entrega criar ${JSON.stringify(task("NOVA", ["A"]))}`
  );

  assert.equal(entregasAtivas(result.state).length, 5);
  assert.equal(result.state.events.at(-1)?.tool, "criar_entrega");
  assert.deepEqual(result.affectedTaskIds, ["NOVA"]);
});

test("Copiloto cria entrega por campos operacionais separados", () => {
  const result = executarAcaoCopiloto(
    initial(),
    "/entrega criar NOVA | Entrega nova | Operações | 27/08 | 30 | A | 2 | Validada"
  );

  assert.equal(entregasAtivas(result.state).at(-1)?.dod, "Validada");
});

test("Copiloto não cria entrega com dependência inexistente", () => {
  assert.throws(
    () =>
      executarAcaoCopiloto(
        initial(),
        `/entrega criar ${JSON.stringify(task("NOVA", ["NAO_EXISTE"]))}`
      ),
    /inexistente/
  );
});

test("Copiloto atualiza entrega por JSON sem alterar outros objetos", () => {
  const result = executarAcaoCopiloto(
    initial(),
    '/entrega atualizar A {"titulo":"Base reforçada","minutos":60}'
  );

  assert.equal(entregasAtivas(result.state)[0].title, "Base reforçada");
  assert.equal(entregasAtivas(result.state)[0].mins, 60);
  assert.equal(entregasAtivas(result.state)[2], tasks[2]);
});

test("Copiloto atualiza entrega por campos nomeados", () => {
  const result = executarAcaoCopiloto(
    initial(),
    "/entrega atualizar A data=27/08 | minutos=45 | criterio=Teste aprovado"
  );

  assert.equal(entregasAtivas(result.state)[0].date, "27/08");
  assert.equal(entregasAtivas(result.state)[0].dod, "Teste aprovado");
});

test("Copiloto rejeita campo de alteração desconhecido", () => {
  assert.throws(
    () => executarAcaoCopiloto(initial(), "/entrega atualizar A tenant=org_b"),
    /desconhecido/
  );
});

test("Copiloto importa plano sem inventar projeto ou tenant", () => {
  const result = executarAcaoCopiloto(
    initial(),
    `/plano importar ${JSON.stringify([task("NOVA", ["A"])])}`
  );

  assert.equal(result.state.activeProjectId, "sprint-principal");
  assert.equal(entregasAtivas(result.state).length, 5);
});

test("Copiloto impede que um plano ultrapasse o limite operacional", () => {
  const limit = Array.from(
    { length: LIMITES_COPILOTO.maxPlanTasks },
    (_, index) => task(`L-${index}`)
  );
  const state = novoEstado("org_a", limit);

  assert.throws(
    () =>
      executarFerramenta(limit, state, {
        organizationId: "org_a",
        name: "criar_entrega",
        task: task("EXCESSO"),
      }),
    /limite de 500 entregas/
  );
  assert.equal(entregasAtivas(state).length, LIMITES_COPILOTO.maxPlanTasks);
});

test("substituição de plano pelo Copiloto exige proposta de aprovação", () => {
  const result = executarAcaoCopiloto(
    initial(),
    `/plano substituir ${JSON.stringify([task("NOVO")])}`
  );

  assert.equal(result.state.revision, 0);
  assert.equal(result.approval?.tool, "substituir_plano");
  assert.equal(entregasAtivas(result.state).length, 4);
});

test("aprovação humana efetiva a substituição do plano", () => {
  const pending = executarAcaoCopiloto(
    initial(),
    `/plano substituir ${JSON.stringify([task("NOVO")])}`
  );
  const result = resolverAprovacaoCopiloto(
    pending.state,
    pending.approval,
    true
  );

  assert.deepEqual(
    entregasAtivas(result.state).map((item) => item.id),
    ["NOVO"]
  );
  assert.equal(result.state.events.at(-1)?.humanApproved, true);
});

test("remoção de entrega exige aprovação e não ignora sucessores", () => {
  const pending = executarAcaoCopiloto(initial(), "/entrega remover C");

  assert.equal(pending.approval?.tool, "remover_entrega");
  assert.equal(entregasAtivas(pending.state).length, 4);
  assert.throws(
    () => executarAcaoCopiloto(initial(), "/entrega remover A"),
    /dependências/
  );
});

test("Copiloto assume apenas foco realmente liberado", () => {
  const result = executarAcaoCopiloto(initial(), "/foco C");

  assert.equal(result.state.focus, "C");
  assert.throws(
    () => executarAcaoCopiloto(initial(), "/foco B"),
    /entrega liberada/
  );
});

test("linguagem natural assume foco autorizado", () => {
  const result = executarAcaoCopiloto(initial(), "assumir foco C");

  assert.equal(result.state.focus, "C");
});

test("Copiloto registra progresso somente no foco real", () => {
  const result = executarAcaoCopiloto(initial(), "/progresso");

  assert.equal(result.state.started.A, 1);
  assert.equal(result.state.events.at(-1)?.actor, "copiloto");
  assert.equal(result.state.events.at(-1)?.tool, "registrar_progresso");
});

test("linguagem natural registra próximo passo sem abrir outra fila", () => {
  const result = executarAcaoCopiloto(initial(), "registrar progresso");

  assert.equal(result.state.started.A, 1);
});

test("Copiloto registra evidência sem transformá-la em verificação", () => {
  const result = executarAcaoCopiloto(
    initial(),
    "/evidencia registrar Documento preliminar"
  );

  assert.equal(result.state.evidence[0].verified, false);
  assert.deepEqual(result.state.done, []);
});

test("verificação explícita registra evidência sem concluir sozinha", () => {
  const result = executarAcaoCopiloto(
    initial(),
    "/evidencia verificar Teste passou"
  );

  assert.equal(result.state.evidence[0].verified, true);
  assert.deepEqual(result.state.done, []);
});

test("conclusão sem evidência verificada é recusada antes da aprovação", () => {
  assert.throws(
    () => executarAcaoCopiloto(initial(), "/concluir A"),
    /evidência e verificação/
  );
});

test("conclusão válida produz aprovação sem modificar o estado", () => {
  const state = proof();
  const result = executarAcaoCopiloto(state, "/concluir A");

  assert.equal(result.state, state);
  assert.equal(result.approval?.organizationId, "org_a");
  assert.equal(result.approval?.projectId, "sprint-principal");
  assert.equal(result.approval?.expectedRevision, state.revision);
  assert.deepEqual(result.state.done, []);
});

test("aprovação humana conclui e libera sucessor real", () => {
  const pending = executarAcaoCopiloto(proof(), "/concluir A");
  const result = resolverAprovacaoCopiloto(
    pending.state,
    pending.approval,
    true
  );

  assert.deepEqual(result.state.done, ["A"]);
  assert.equal(result.state.focus, "B");
  assert.equal(result.state.events.at(-1)?.tool, "concluir_entrega");
  assert.equal(result.state.events.at(-1)?.humanApproved, true);
});

test("recusa humana preserva entrega e registra decisão", () => {
  const pending = executarAcaoCopiloto(proof(), "/concluir A");
  const result = resolverAprovacaoCopiloto(
    pending.state,
    pending.approval,
    false
  );

  assert.deepEqual(result.state.done, []);
  assert.equal(
    result.state.events.at(-1)?.action,
    "copiloto.aprovacao_recusada"
  );
});

test("aprovação expira se a revisão canônica mudar", () => {
  const pending = executarAcaoCopiloto(proof(), "/concluir A");
  const changed = editarEntrega(pending.state, "C", {
    title: "Contexto atualizado",
  });

  assert.throws(
    () => resolverAprovacaoCopiloto(changed, pending.approval, true),
    /expirou/
  );
});

test("aprovação não atravessa organização nem projeto", () => {
  const pending = executarAcaoCopiloto(proof(), "/concluir A");
  const other = novoEstado("org_b", tasks);

  assert.throws(
    () => resolverAprovacaoCopiloto(other, pending.approval, true),
    /outra organização/
  );

  const withProject = criarProjeto(pending.state, "Outro");
  const selected = selecionarProjeto(withProject, "outro");

  assert.throws(
    () => resolverAprovacaoCopiloto(selected, pending.approval, true),
    /outro projeto/
  );
});

test("aprovação adulterada não pode trocar ferramenta, entrega ou confirmação", () => {
  const pending = executarAcaoCopiloto(proof(), "/concluir A");

  for (const changes of [
    { input: { ...pending.approval.input, taskId: "C" } },
    { input: { ...pending.approval.input, name: "remover_entrega" } },
    { input: { ...pending.approval.input, approved: true } },
    { id: `${pending.approval.id}:adulterada` },
  ]) {
    assert.throws(
      () =>
        resolverAprovacaoCopiloto(
          pending.state,
          { ...pending.approval, ...changes },
          true
        ),
      /aprovação foram alterados/
    );
  }
});

test("fechamento com evidência verificada solicita aprovação acionável", () => {
  const result = executarAcaoCopiloto(proof(), "/fechardia");

  assert.equal(result.approval?.tool, "concluir_entrega");
  assert.equal(result.approval?.taskId, "A");
  assert.deepEqual(result.state.done, []);
});

test("fechamento sem evidência mantém entrega em andamento", () => {
  const result = executarAcaoCopiloto(initial(), "/fechardia");

  assert.equal(result.approval, null);
  assert.match(result.reply, /Sem evidência verificada/);
});

test("replanejamento altera somente a raiz e identifica descendentes", () => {
  const state = initial();
  const result = replanejarSubgrafo(state, "A", { date: "27/08" });

  assert.deepEqual(result.affectedTaskIds, ["A", "B", "D"]);
  assert.equal(entregasAtivas(result.state)[2], tasks[2]);
  assert.equal(entregasAtivas(result.state)[1], tasks[1]);
  assert.equal(result.state.events.at(-1)?.action, "plano.replanejado");
});

test("Copiloto executa replanejamento localizado por comando", () => {
  const result = executarAcaoCopiloto(
    initial(),
    "/replanejamento A data=27/08 | minutos=45"
  );

  assert.deepEqual(result.affectedTaskIds, ["A", "B", "D"]);
  assert.equal(entregasAtivas(result.state)[0].date, "27/08");
  assert.equal(entregasAtivas(result.state)[2], tasks[2]);
  assert.equal(result.state.events.at(-1)?.tool, "replanejar_subgrafo");
});

test("replanejamento não cria ciclos nem altera concluídas", () => {
  assert.throws(
    () => replanejarSubgrafo(initial(), "A", { deps: ["B"] }),
    /ciclo/
  );
  const pending = executarAcaoCopiloto(proof(), "/concluir A");
  const completed = resolverAprovacaoCopiloto(
    pending.state,
    pending.approval,
    true
  ).state;

  assert.throws(
    () => replanejarSubgrafo(completed, "A", { date: "29/08" }),
    /concluída/
  );
});

test("Copiloto ajusta capacidade sem ultrapassar limites", () => {
  const result = executarAcaoCopiloto(initial(), "/capacidade 420");

  assert.equal(result.state.projects[0].dailyCapacityMinutes, 420);
  assert.throws(
    () => executarAcaoCopiloto(initial(), "/capacidade 1500"),
    /entre 15 e 1440/
  );
});

test("comando agora inclui DoD, evidência, tempo e próxima ação", () => {
  const result = executarCopiloto(tasks, initial(), "/agora");

  for (const field of [
    "AGORA:",
    "TEMPO:",
    "CONCLUI QUANDO:",
    "EVIDÊNCIA:",
    "PRÓXIMA:",
  ]) {
    assert.match(result.reply, new RegExp(field));
  }

  assert.match(result.reply, /Base entregue e testada/);
});

test("limite de entrada bloqueia payload excessivo", () => {
  assert.throws(
    () =>
      executarAcaoCopiloto(
        initial(),
        "x".repeat(LIMITES_COPILOTO.maxInputCharacters + 1)
      ),
    /limite de segurança/
  );
});

test("ferramenta rejeita projeto ou revisão divergente", () => {
  assert.throws(
    () =>
      executarFerramenta(tasks, initial(), {
        organizationId: "org_a",
        projectId: "outro",
        name: "consultar_estado",
      }),
    /outro projeto/
  );
  assert.throws(
    () =>
      executarFerramenta(tasks, initial(), {
        organizationId: "org_a",
        expectedRevision: 99,
        name: "consultar_estado",
      }),
    /estado mudou/
  );
});

test("escritas do Copiloto ficam auditadas com ferramenta e origem", () => {
  const result = executarAcaoCopiloto(initial(), "/foco C");
  const event = result.state.events.at(-1);

  assert.equal(event.actor, "copiloto");
  assert.equal(event.tool, "assumir_foco");
  assert.equal(event.organizationId, "org_a");
  assert.equal(event.projectId, "sprint-principal");
});

test("descritores de ferramentas usam inputSchema compatível com AI SDK/MCP", () => {
  const descriptors = descreverFerramentasAgente(FERRAMENTAS_OPERACIONAIS);

  assert.equal(descriptors.length, FERRAMENTAS_OPERACIONAIS.length);
  assert.ok(
    descriptors.every((descriptor) => descriptor.inputSchema.type === "object")
  );
  assert.ok(
    descriptors.every(
      (descriptor) => descriptor.inputSchema.additionalProperties === false
    )
  );
});

test("esquemas não deixam modelo escolher tenant, projeto ou aprovação", () => {
  const descriptors = descreverFerramentasAgente(FERRAMENTAS_OPERACIONAIS);

  for (const descriptor of descriptors) {
    assert.ok(!("organizationId" in descriptor.inputSchema.properties));
    assert.ok(!("projectId" in descriptor.inputSchema.properties));
    assert.ok(!("approved" in descriptor.inputSchema.properties));
  }
});

test("descritores distinguem leitura e operação relevante", () => {
  const descriptors = descreverFerramentasAgente(FERRAMENTAS_OPERACIONAIS);
  const read = descriptors.find(
    (descriptor) => descriptor.name === "consultar_estado"
  );
  const finish = descriptors.find(
    (descriptor) => descriptor.name === "concluir_entrega"
  );

  assert.equal(read.annotations.readOnlyHint, true);
  assert.equal(finish.annotations.destructiveHint, true);
});

test("adaptador executa ferramenta reversível sobre o estado canônico", () => {
  const port = memoryPort();
  const bridge = adapter(port);
  const result = bridge.invoke("assumir_foco", { taskId: "C" });

  assert.equal(result.status, "executado");
  assert.equal(port.read().focus, "C");
  assert.equal(port.read().events.at(-1)?.actor, "copiloto");
});

test("adaptador rejeita argumentos ausentes, extras ou de tipo incorreto", () => {
  const bridge = adapter(memoryPort());

  assert.throws(() => bridge.invoke("assumir_foco", {}), /obrigatório/);
  assert.throws(
    () =>
      bridge.invoke("assumir_foco", { taskId: "C", organizationId: "org_b" }),
    /não autorizado/
  );
  assert.throws(
    () => bridge.invoke("assumir_foco", { taskId: 1 }),
    /tipo string/
  );
  assert.throws(
    () => bridge.invoke("criar_entrega", { task: [] }),
    /tipo object/
  );
  assert.throws(
    () => bridge.invoke("criar_entrega", { task: null }),
    /tipo object/
  );
});

test("adaptador impede modelo de forjar aprovação humana", () => {
  const bridge = adapter(memoryPort(proof()));

  assert.throws(
    () => bridge.invoke("concluir_entrega", { taskId: "A", approved: true }),
    /não autorizado/
  );
});

test("adaptador devolve proposta sem executar ação relevante", () => {
  const port = memoryPort(proof());
  const bridge = adapter(port);
  const result = bridge.invoke("concluir_entrega", { taskId: "A" });

  assert.equal(result.status, "aprovação necessária");
  assert.ok(result.approval);
  assert.deepEqual(port.read().done, []);
});

test("aprovação explícita do adaptador persiste conclusão auditada", () => {
  const port = memoryPort(proof());
  const bridge = adapter(port);
  const pending = bridge.invoke("concluir_entrega", { taskId: "A" });
  const completed = bridge.approve(pending.approval, true);

  assert.deepEqual(completed.state.done, ["A"]);
  assert.deepEqual(port.read().done, ["A"]);
  assert.equal(port.read().events.at(-1)?.humanApproved, true);
});

test("adaptador bloqueia autoridade divergente e limita chamadas", () => {
  const port = memoryPort();
  const bridge = adapter(port, 1);

  bridge.invoke("consultar_estado", {});
  assert.throws(
    () => bridge.invoke("consultar_estado", {}),
    /Limite de ferramentas/
  );

  const compromised = {
    organizationId: "org_b",
    read: () => initial(),
    commit: () => undefined,
  };

  assert.throws(
    () => adapter(compromised).invoke("consultar_estado", {}),
    /organização divergente/
  );
});

test("configuração futura do AI SDK evita APIs obsoletas e modelos inventados", () => {
  const config = configuracaoAiSdkPreparada();

  assert.equal(config.pattern, "ToolLoopAgent");
  assert.equal(config.schemaKey, "inputSchema");
  assert.equal(config.transport, "DefaultChatTransport");
  assert.equal(config.response, "toUIMessageStreamResponse");
  assert.equal(config.model, null);
  assert.equal(config.provider, null);
});

test("manifesto MCP deriva exatamente as ferramentas canônicas", () => {
  const manifest = manifestoMcpPreparado(FERRAMENTAS_OPERACIONAIS);

  assert.equal(manifest.authority, "clerk-organization");
  assert.equal(manifest.tools.length, FERRAMENTAS_OPERACIONAIS.length);
  assert.ok(manifest.tools.some((tool) => tool.name === "replanejar_subgrafo"));
});

test("Copiloto executa fluxo completo de criação, foco, evidência e aprovação", () => {
  let state = executarAcaoCopiloto(initial(), "criar projeto Lançamento").state;
  state = executarAcaoCopiloto(
    state,
    `/entrega criar ${JSON.stringify(task("L-01"))}`
  ).state;
  state = executarAcaoCopiloto(
    state,
    `/entrega criar ${JSON.stringify(task("L-02", ["L-01"]))}`
  ).state;
  state = executarAcaoCopiloto(state, "/foco L-01").state;
  state = executarAcaoCopiloto(state, "/progresso").state;
  state = executarAcaoCopiloto(
    state,
    "/evidencia verificar Publicação validada"
  ).state;
  const pending = executarAcaoCopiloto(state, "/concluir L-01");

  assert.deepEqual(pending.state.done, []);

  state = resolverAprovacaoCopiloto(
    pending.state,
    pending.approval,
    true
  ).state;

  assert.deepEqual(state.done, ["L-01"]);
  assert.equal(state.focus, "L-02");
  assert.equal(state.activeProjectId, "lancamento");
  assert.ok(
    state.events
      .filter((event) => event.projectId === "lancamento")
      .every((event) => event.actor === "copiloto")
  );
});

test("módulo do agente não instala dependências nem fixa provedor", async () => {
  const source = await readFile(
    new URL("../../apps/app/lib/executar/agent-contract.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /import type/);
  assert.match(source, /ToolLoopAgent/);
  assert.match(source, /inputSchema/);
  assert.doesNotMatch(source, /from ["']ai["']/);
  assert.doesNotMatch(source, /OPENAI_API_KEY|ANTHROPIC_API_KEY/);
});

test("chat executa no estado canônico e exibe aprovação humana explícita", async () => {
  // Achado da correção estrutural de 02/09/2026: o painel do Copiloto (a
  // UI de "Aprovar ação"/"Recusar") foi extraído pra
  // executar-copilot-panel.tsx; a lógica de execução/aprovação continua
  // em executar-operacional.tsx.
  const [source, copilotPanel] = await Promise.all([
    readFile(
      new URL(
        "../../apps/app/app/(authenticated)/components/executar-operacional.tsx",
        import.meta.url
      ),
      "utf8"
    ),
    readFile(
      new URL(
        "../../apps/app/app/(authenticated)/components/executar-copilot-panel.tsx",
        import.meta.url
      ),
      "utf8"
    ),
  ]);

  assert.match(source, /executarAcaoCopiloto\(state, question\)/);
  assert.match(source, /setState\(answer\.state\)/);
  assert.match(source, /resolverAprovacaoCopiloto\(/);
  assert.match(source, /pendingApproval/);
  assert.match(copilotPanel, /Aprovar ação/);
  assert.match(copilotPanel, /Recusar/);
});
