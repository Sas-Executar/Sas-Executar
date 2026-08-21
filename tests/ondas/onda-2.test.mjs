import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  adicionarEntrega,
  assumirFoco,
  atualizarCapacidadeProjeto,
  calendarioProjeto,
  caminhoCritico,
  ciclosProjeto,
  concluirEntrega,
  criarProjeto,
  editarEntrega,
  entregasAtivas,
  eventosPendentes,
  exportarPlano,
  filaBloqueada,
  filaPronta,
  importarPlano,
  novoEstado,
  prepararSincronizacao,
  projetoAtivo,
  reconciliarEstado,
  registrarEvidencia,
  registrarPasso,
  removerEntrega,
  renomearProjeto,
  restaurarEstado,
  selecionarProjeto,
  validarGrafo,
} from "../../apps/app/lib/executar/domain.ts";
import { ENTREGAS_SPRINT } from "../../apps/app/lib/executar/seed.ts";

const tarefas = [
  { id: "A", title: "Base", front: "Operações", date: "24/08", mins: 180, deps: [], stage: 1 },
  { id: "B", title: "Produto", front: "Desenvolvimento", date: "25/08", mins: 60, deps: ["A"], stage: 2 },
  { id: "C", title: "Contexto", front: "Criativo", date: "24/08", mins: 210, deps: [], stage: 1 },
];

const item = (id, deps = []) => ({
  id,
  title: `Entrega ${id}`,
  front: "Operações",
  date: "26/08",
  mins: 30,
  deps,
  stage: 2,
});

function estadoInicial() {
  return novoEstado("org_a", tarefas);
}

function concluirA(state = estadoInicial()) {
  const focused = assumirFoco(tarefas, state, "A");
  const evidenced = registrarEvidencia(tarefas, focused, "A", "Validado", "", true);

  return concluirEntrega(tarefas, evidenced, "A");
}

test("inicializa o sprint principal com as mesmas entregas canônicas", () => {
  const state = novoEstado("org_a", ENTREGAS_SPRINT);

  assert.equal(projetoAtivo(state).id, "sprint-principal");
  assert.deepEqual(entregasAtivas(state), ENTREGAS_SPRINT);
  assert.equal(projetoAtivo(state).dailyCapacityMinutes, 360);
});

test("migra snapshot legado sem perder progresso nem seed original", () => {
  const legacy = {
    organizationId: "org_a",
    done: ["APP-01"],
    focus: "APP-02",
    evidence: [],
    started: { "APP-02": 2 },
    events: [],
    revision: 3,
  };
  const migrated = restaurarEstado(JSON.stringify(legacy), "org_a", ENTREGAS_SPRINT);

  assert.equal(migrated.projects.length, 1);
  assert.equal(migrated.activeProjectId, "sprint-principal");
  assert.equal(entregasAtivas(migrated).length, 33);
  assert.deepEqual(migrated.done, ["APP-01"]);
  assert.equal(migrated.started["APP-02"], 2);
});

test("cria projeto vazio com identificador estável e auditado", () => {
  const created = criarProjeto(estadoInicial(), "Lançamento São Paulo");

  assert.equal(created.projects[1].id, "lancamento-sao-paulo");
  assert.equal(created.projects[1].tasks.length, 0);
  assert.equal(created.events.at(-1)?.action, "projeto.criado");
});

test("evita colisão entre projetos de mesmo nome", () => {
  const first = criarProjeto(estadoInicial(), "Campanha");
  const second = criarProjeto(first, "Campanha");

  assert.equal(second.projects[1].id, "campanha");
  assert.equal(second.projects[2].id, "campanha-2");
});

test("rejeita projeto sem nome", () => {
  assert.throws(() => criarProjeto(estadoInicial(), "  "), /nome para o projeto/);
});

test("troca de projeto preserva progresso, evidências e foco separadamente", () => {
  const original = concluirA();
  const created = criarProjeto(original, "Novo projeto", [item("NOVA")]);
  const selected = selecionarProjeto(created, "novo-projeto");

  assert.equal(selected.activeProjectId, "novo-projeto");
  assert.deepEqual(selected.done, []);
  assert.equal(entregasAtivas(selected)[0].id, "NOVA");

  const focused = assumirFoco(entregasAtivas(selected), selected, "NOVA");
  const progressed = registrarPasso(entregasAtivas(focused), focused, "NOVA");
  const restored = selecionarProjeto(progressed, "sprint-principal");

  assert.deepEqual(restored.done, ["A"]);
  assert.equal(restored.evidence.length, 1);
  assert.equal(restored.focus, "B");

  const back = selecionarProjeto(restored, "novo-projeto");
  assert.equal(back.started.NOVA, 1);
  assert.deepEqual(back.done, []);
});

test("não mantém snapshot duplicado do projeto atualmente ativo", () => {
  const created = criarProjeto(estadoInicial(), "Segundo");
  const selected = selecionarProjeto(created, "segundo");

  assert.equal(projetoAtivo(selected).snapshot, undefined);
  assert.ok(selected.projects.find((project) => project.id === "sprint-principal")?.snapshot);
});

test("não seleciona projeto inexistente ou externo", () => {
  assert.throws(
    () => selecionarProjeto(estadoInicial(), "org_b-project"),
    /organização ativa/
  );
});

test("renomeia somente o projeto ativo", () => {
  const created = criarProjeto(estadoInicial(), "Segundo");
  const renamed = renomearProjeto(created, "Sprint Revisado");

  assert.equal(projetoAtivo(renamed).name, "Sprint Revisado");
  assert.equal(renamed.projects[1].name, "Segundo");
});

test("adiciona entrega válida e recalcula fila", () => {
  const state = adicionarEntrega(estadoInicial(), item("D", ["A"]));

  assert.equal(entregasAtivas(state).length, 4);
  assert.ok(filaBloqueada(entregasAtivas(state), state).some((task) => task.id === "D"));
});

test("rejeita IDs repetidos ao adicionar entrega", () => {
  assert.throws(
    () => adicionarEntrega(estadoInicial(), item("A")),
    /duplicado/
  );
});

test("rejeita dependência inexistente", () => {
  assert.throws(
    () => adicionarEntrega(estadoInicial(), item("D", ["FALTA"])),
    /inexistente/
  );
});

test("rejeita ciclo introduzido por edição de dependências", () => {
  assert.throws(
    () => editarEntrega(estadoInicial(), "A", { deps: ["B"] }),
    /ciclo/
  );
});

test("edita título, data e esforço sem alterar o identificador", () => {
  const edited = editarEntrega(estadoInicial(), "A", {
    title: "Base reforçada",
    date: "27/08",
    mins: 120,
  });

  assert.deepEqual(entregasAtivas(edited)[0], {
    ...tarefas[0],
    title: "Base reforçada",
    date: "27/08",
    mins: 120,
  });
});

test("recalcula foco quando nova dependência bloqueia a entrega atual", () => {
  const focused = assumirFoco(tarefas, estadoInicial(), "C");
  const edited = editarEntrega(focused, "C", { deps: ["A"] });

  assert.equal(edited.focus, "A");
  assert.ok(filaBloqueada(entregasAtivas(edited), edited).some((task) => task.id === "C"));
});

test("não altera dependências de entrega já concluída", () => {
  assert.throws(
    () => editarEntrega(concluirA(), "A", { deps: ["C"] }),
    /entrega concluída/
  );
});

test("remove entrega sem sucessores nem evidências", () => {
  const removed = removerEntrega(estadoInicial(), "C");

  assert.equal(entregasAtivas(removed).length, 2);
  assert.equal(removed.events.at(-1)?.action, "entrega.removida");
});

test("impede remoção de entrega com sucessor dependente", () => {
  assert.throws(() => removerEntrega(estadoInicial(), "A"), /dependências de B/);
});

test("impede remoção de entrega concluída", () => {
  assert.throws(() => removerEntrega(concluirA(), "A"), /concluída/);
});

test("importa JSON com nomenclatura operacional em português", () => {
  const content = JSON.stringify({
    entregas: [
      {
        codigo: "D",
        titulo: "Entrega importada",
        frente: "Criativo",
        data: "27/08",
        minutos: 45,
        dependencias: ["A"],
        etapa: 2,
      },
    ],
  });
  const imported = importarPlano(estadoInicial(), content);

  assert.equal(entregasAtivas(imported).at(-1)?.title, "Entrega importada");
  assert.deepEqual(entregasAtivas(imported).at(-1)?.deps, ["A"]);
});

test("importa CSV separado por ponto e vírgula", () => {
  const content = [
    "id;titulo;frente;data;minutos;dependencias;etapa",
    "D;Nova entrega;Operações;27/08;30;A;2",
  ].join("\n");
  const imported = importarPlano(estadoInicial(), content);

  assert.equal(entregasAtivas(imported).at(-1)?.id, "D");
});

test("importa CSV com campo entre aspas e vírgula", () => {
  const content = [
    "id,title,front,date,mins,deps,stage",
    'D,"Validar, publicar e medir",Operações,27/08,30,A,2',
  ].join("\n");
  const imported = importarPlano(estadoInicial(), content);

  assert.equal(entregasAtivas(imported).at(-1)?.title, "Validar, publicar e medir");
});

test("importa lista Markdown com campos operacionais", () => {
  const content = "- [D] Nova entrega | Operações | 27/08 | 30 | A | 2";
  const imported = importarPlano(estadoInicial(), content);

  assert.equal(entregasAtivas(imported).at(-1)?.id, "D");
  assert.deepEqual(entregasAtivas(imported).at(-1)?.deps, ["A"]);
});

test("importação é atômica e rejeita dependência inválida", () => {
  const state = estadoInicial();
  const content = JSON.stringify([item("D", ["INEXISTENTE"])]);

  assert.throws(() => importarPlano(state, content), /inexistente/);
  assert.equal(entregasAtivas(state).length, 3);
});

test("importação rejeita exportação originada de outra organização", () => {
  const other = novoEstado("org_b", tarefas);

  assert.throws(
    () => importarPlano(estadoInicial(), exportarPlano(other)),
    /outra organização/
  );
});

test("substitui plano apenas quando ainda não há comprovações", () => {
  const replaced = importarPlano(
    estadoInicial(),
    JSON.stringify([item("NOVO")]),
    "replace"
  );

  assert.deepEqual(entregasAtivas(replaced).map((task) => task.id), ["NOVO"]);
  assert.throws(
    () => importarPlano(concluirA(), JSON.stringify([item("NOVO")]), "replace"),
    /conclusões ou evidências/
  );
});

test("rejeita plano vazio ou formato não reconhecido", () => {
  assert.throws(() => importarPlano(estadoInicial(), "  "), /não pode estar vazio/);
  assert.throws(
    () => importarPlano(estadoInicial(), "texto sem estrutura"),
    /Formato não reconhecido/
  );
});

test("exportação preserva tenant, projeto, entregas e evidências", () => {
  const state = concluirA();
  const exported = JSON.parse(exportarPlano(state));

  assert.equal(exported.schema, "executar.plano.v1");
  assert.equal(exported.organizationId, "org_a");
  assert.equal(exported.projectId, "sprint-principal");
  assert.equal(exported.tasks.length, 3);
  assert.deepEqual(exported.execution.done, ["A"]);
  assert.equal(exported.execution.evidence.length, 1);
});

test("exportação pode ser importada em projeto vazio da mesma organização", () => {
  const exported = exportarPlano(estadoInicial());
  const created = criarProjeto(estadoInicial(), "Importado");
  const selected = selecionarProjeto(created, "importado");
  const imported = importarPlano(selected, exported);

  assert.equal(entregasAtivas(imported).length, 3);
});

test("calendário calcula capacidade real e identifica sobrecarga diária", () => {
  const days = calendarioProjeto(estadoInicial());

  assert.equal(days[0].date, "24/08");
  assert.equal(days[0].plannedMinutes, 390);
  assert.equal(days[0].capacityMinutes, 360);
  assert.equal(days[0].overloaded, true);
  assert.equal(days[1].overloaded, false);
});

test("capacidade configurável recalcula sobrecarga e registra auditoria", () => {
  const adjusted = atualizarCapacidadeProjeto(estadoInicial(), 420);

  assert.equal(calendarioProjeto(adjusted)[0].overloaded, false);
  assert.equal(adjusted.events.at(-1)?.action, "projeto.capacidade_atualizada");
  assert.throws(
    () => atualizarCapacidadeProjeto(adjusted, 1500),
    /entre 15 e 1440/
  );
});

test("calendário reflete entregas efetivamente concluídas", () => {
  const days = calendarioProjeto(concluirA());

  assert.equal(days[0].completedCount, 1);
});

test("ciclos agrupam blocos de três dias operacionais", () => {
  let state = estadoInicial();
  state = adicionarEntrega(state, item("D"));
  state = adicionarEntrega(state, { ...item("E"), date: "27/08" });
  const cycles = ciclosProjeto(state);

  assert.equal(cycles.length, 2);
  assert.deepEqual(cycles[0].dates, ["24/08", "25/08", "26/08"]);
  assert.deepEqual(cycles[1].dates, ["27/08"]);
});

test("caminho crítico identifica a sequência de maior esforço dependente", () => {
  const result = caminhoCritico(tarefas);

  assert.deepEqual(result.taskIds, ["A", "B"]);
  assert.equal(result.minutes, 240);
});

test("caminho crítico vazio não inventa trabalho", () => {
  assert.deepEqual(caminhoCritico([]), { taskIds: [], minutes: 0 });
});

test("validação rejeita esforço, data e etapa inválidos", () => {
  assert.throws(() => validarGrafo([{ ...item("X"), mins: 0 }]), /esforço/);
  assert.throws(() => validarGrafo([{ ...item("X"), date: "99/99" }]), /dia válido/);
  assert.throws(() => validarGrafo([{ ...item("X"), stage: 5 }]), /etapa/);
  assert.throws(() => validarGrafo([{ ...item("X"), deps: ["X", "X"] }]), /repetir/);
});

test("eventos incluem projeto, tenant e revisão para sincronização idempotente", () => {
  const state = adicionarEntrega(estadoInicial(), item("D"));
  const event = eventosPendentes(state, "org_a")[0];
  const envelope = prepararSincronizacao(state, "org_a");

  assert.equal(event.projectId, "sprint-principal");
  assert.equal(event.revision, 1);
  assert.deepEqual(envelope.operationIds, ["org_a:sprint-principal:1"]);
});

test("snapshot legado normaliza eventos antigos e remove eventos de outro tenant", () => {
  const legacy = {
    organizationId: "org_a",
    done: [],
    focus: null,
    evidence: [],
    started: {},
    events: [
      {
        organizationId: "org_a",
        action: "foco.assumido",
        taskId: "A",
        at: "2026-08-21T10:00:00.000Z",
      },
      {
        organizationId: "org_b",
        action: "entrega.editada",
        taskId: "X",
        at: "2026-08-21T10:00:00.000Z",
      },
    ],
    revision: 1,
  };
  const restored = restaurarEstado(JSON.stringify(legacy), "org_a", tarefas);

  assert.equal(restored.events.length, 1);
  assert.equal(restored.events[0].projectId, "sprint-principal");
  assert.equal(restored.events[0].revision, 1);
});

test("evidência aceita arquivo local verificado sem exigir texto adicional", () => {
  const focused = assumirFoco(tarefas, estadoInicial(), "A");
  const evidenced = registrarEvidencia(
    tarefas,
    focused,
    "A",
    "",
    "",
    true,
    {
      name: "prova.txt",
      type: "text/plain",
      size: 5,
      data: "data:text/plain;base64,cHJvdmE=",
    }
  );

  assert.equal(evidenced.evidence[0].file?.name, "prova.txt");
  assert.deepEqual(concluirEntrega(tarefas, evidenced, "A").done, ["A"]);
});

test("evidência rejeita arquivo maior que o limite preservado da PWA", () => {
  const focused = assumirFoco(tarefas, estadoInicial(), "A");

  assert.throws(
    () =>
      registrarEvidencia(tarefas, focused, "A", "", "", true, {
        name: "grande.bin",
        type: "application/octet-stream",
        size: 2_500_001,
        data: "data:application/octet-stream;base64,AA==",
      }),
    /2,5 MB/
  );
});

test("envelope de sincronização rejeita organização divergente", () => {
  assert.throws(
    () => prepararSincronizacao(estadoInicial(), "org_b"),
    /organização divergente/
  );
});

test("reconciliação aceita remoto quando não há mudança local", () => {
  const local = estadoInicial();
  const remote = adicionarEntrega(local, item("D"));
  const result = reconciliarEstado(local, remote, 0);

  assert.equal(result.status, "remoto");
  assert.equal(entregasAtivas(result.state).length, 4);
});

test("reconciliação preserva local quando remoto não avançou", () => {
  const remote = estadoInicial();
  const local = adicionarEntrega(remote, item("D"));
  const result = reconciliarEstado(local, remote, 0);

  assert.equal(result.status, "local");
  assert.equal(result.state, local);
});

test("mudanças concorrentes viram conflito sem perda silenciosa", () => {
  const base = estadoInicial();
  const local = adicionarEntrega(base, item("LOCAL"));
  const remote = adicionarEntrega(base, item("REMOTO"));
  const result = reconciliarEstado(local, remote, 0);

  assert.equal(result.status, "conflito");
  assert.equal(result.state, local);
});

test("reconciliação bloqueia cruzamento entre organizações", () => {
  assert.throws(
    () => reconciliarEstado(estadoInicial(), novoEstado("org_b", tarefas), 0),
    /organizações diferentes/
  );
});

test("fila recalculada após edição continua respeitando todas as dependências", () => {
  const changed = editarEntrega(estadoInicial(), "B", { deps: ["A", "C"] });
  const afterA = concluirA(changed);

  assert.ok(filaBloqueada(entregasAtivas(afterA), afterA).some((task) => task.id === "B"));
  assert.ok(filaPronta(entregasAtivas(afterA), afterA).some((task) => task.id === "C"));
});

test("interface conecta CRUD, importação e evidências ao projeto ativo", async () => {
  const component = await readFile(
    new URL(
      "../../apps/app/app/(authenticated)/components/executar-operacional.tsx",
      import.meta.url
    ),
    "utf8"
  );

  for (const expected of [
    "criarProjeto(state, newProjectName)",
    "selecionarProjeto(state, event.target.value)",
    "adicionarEntrega(state, task)",
    "editarEntrega(state, editingId",
    "importarPlano(state, importContent, importMode)",
    "exportarPlano(state)",
    "lerArquivoEvidencia(evidenceFile)",
    "calendarioProjeto(state)",
    "caminhoCritico(tasks)",
  ]) {
    assert.ok(component.includes(expected), `Fluxo não conectado: ${expected}`);
  }
});
