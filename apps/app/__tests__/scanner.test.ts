import { describe, expect, it } from "vitest";
import type { Entrega, EstadoOperacional } from "@/lib/executar/domain";
import { novoEstado, POLITICA_CONCLUSAO_PADRAO } from "@/lib/executar/domain";
import {
  executarAcaoEntrada,
  executarAcaoFeito,
  executarAcaoSaida,
  idempotencyKeyScanner,
  resolverPayloadScanner,
  ScannerConfirmacaoNecessariaError,
} from "@/lib/executar/scanner";

const ORG_ID = "org-scanner";

function tarefa(overrides: Partial<Entrega> & { id: string }): Entrega {
  return {
    date: "28/08",
    deps: [],
    front: "principal",
    mins: 30,
    stage: 1,
    title: "Tarefa sem título definido",
    ...overrides,
  };
}

function estadoCom(tasks: readonly Entrega[]): EstadoOperacional {
  return novoEstado(ORG_ID, tasks);
}

/** Estado com a política de conclusão mais estrita (DoD + evidência +
 * verificação + aprovação todos exigidos) — usado para provar que o
 * Scanner ignora a política, não só que funciona quando ela já é frouxa. */
function estadoComPoliticaEstrita(
  tasks: readonly Entrega[]
): EstadoOperacional {
  const base = novoEstado(ORG_ID, tasks);
  return {
    ...base,
    projects: base.projects.map((project) => ({
      ...project,
      completionPolicy: POLITICA_CONCLUSAO_PADRAO,
    })),
  };
}

describe("resolverPayloadScanner", () => {
  it.each([
    ["executar://scan/entrada", { kind: "entrada" }],
    ["executar://scan/copiloto", { kind: "copiloto" }],
    ["executar://scan/seletor", { kind: "seletor" }],
    ["executar://scan/feito", { kind: "feito" }],
    ["executar://scan/saida", { kind: "saida" }],
    ["executar://roadmap", { kind: "destino", destino: "roadmap" }],
    ["executar://documents", { kind: "destino", destino: "documents" }],
    ["executar://qr-jump", { kind: "qr_jump" }],
    ["executar://task/abc-123", { kind: "tarefa", taskId: "abc-123" }],
  ] as const)("reconhece %s", (payload, esperado) => {
    expect(resolverPayloadScanner(payload)).toEqual(esperado);
  });

  it("retorna null para payload fora do esquema executar://", () => {
    expect(resolverPayloadScanner("https://example.com")).toBeNull();
    expect(resolverPayloadScanner("executar://scan/inexistente")).toBeNull();
    expect(resolverPayloadScanner("")).toBeNull();
  });
});

describe("idempotencyKeyScanner", () => {
  it("gera a mesma chave dentro do mesmo bucket de 10s", () => {
    const chaveA = idempotencyKeyScanner(ORG_ID, "feito", "t1", 1000);
    const chaveB = idempotencyKeyScanner(ORG_ID, "feito", "t1", 9000);
    expect(chaveA).toBe(chaveB);
  });

  it("gera chaves diferentes fora do bucket", () => {
    const chaveA = idempotencyKeyScanner(ORG_ID, "feito", "t1", 1000);
    const chaveB = idempotencyKeyScanner(ORG_ID, "feito", "t1", 11_000);
    expect(chaveA).not.toBe(chaveB);
  });
});

describe("executarAcaoEntrada", () => {
  it("assume foco na primeira tarefa liberada, via executarFerramenta real", () => {
    const tasks = [tarefa({ id: "t1", title: "Primeira" })];
    const state = estadoCom(tasks);
    const resultado = executarAcaoEntrada(tasks, state);

    expect(resultado.stateResultante.focus).toBe("t1");
    expect(resultado.stateAnterior.focus).toBeNull();
    expect(resultado.mensagem).toContain("Primeira");
  });

  it("lança erro sem tarefa liberada", () => {
    const tasks = [tarefa({ id: "t1", deps: ["inexistente"] })];
    const state = estadoCom(tasks);
    expect(() => executarAcaoEntrada(tasks, state)).toThrow();
  });
});

describe("executarAcaoFeito", () => {
  it("conclui a entrega em foco sem aprovação humana (approved:true automático)", () => {
    const tasks = [tarefa({ id: "t1", title: "Alvo" })];
    let state = estadoCom(tasks);
    state = executarAcaoEntrada(tasks, state).stateResultante;

    const resultado = executarAcaoFeito(tasks, state);

    expect(resultado.stateResultante.done).toContain("t1");
    expect(resultado.mensagem).toContain("Alvo");
  });

  it("exige confirmação quando não há check-in ativo (foco nulo)", () => {
    const tasks = [tarefa({ id: "t1", deps: ["inexistente"] })];
    const state = estadoCom(tasks);

    expect(() => executarAcaoFeito(tasks, state)).toThrow(
      ScannerConfirmacaoNecessariaError
    );
  });

  it("conclui sem pedir DoD/evidência mesmo sob a política mais estrita do projeto", () => {
    const tasks = [tarefa({ id: "t1", title: "Sem DoD nem evidência" })];
    let state = estadoComPoliticaEstrita(tasks);
    state = executarAcaoEntrada(tasks, state).stateResultante;

    const resultado = executarAcaoFeito(tasks, state);

    expect(resultado.stateResultante.done).toContain("t1");
  });
});

describe("executarAcaoSaida", () => {
  it("produz relatório do dia e resumo do dia seguinte a partir de dados reais", () => {
    const tasks = [
      tarefa({ id: "hoje", date: "27/08", title: "Tarefa de hoje" }),
      tarefa({
        id: "amanha",
        date: "28/08",
        title: "Tarefa de amanhã",
        mins: 45,
      }),
    ];
    let state = estadoCom(tasks);
    state = executarAcaoEntrada(tasks, state).stateResultante;

    const referencia = new Date(2026, 7, 27, 18);
    const resultado = executarAcaoSaida(tasks, state, referencia);

    expect(resultado.relatorioDoDia.length).toBeGreaterThan(0);
    expect(resultado.resumoAmanha).toContain("28/08");
  });

  it("informa quando não há entrega planejada para os próximos dias", () => {
    const tasks = [tarefa({ id: "t1", date: "27/08" })];
    const state = estadoCom(tasks);
    const referencia = new Date(2026, 7, 27, 18);

    const resultado = executarAcaoSaida(tasks, state, referencia);
    expect(resultado.resumoAmanha).toContain("Nenhuma entrega planejada");
  });
});
