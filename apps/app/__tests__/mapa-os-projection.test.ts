import { describe, expect, it } from "vitest";
import type { Entrega, EstadoOperacional } from "@/lib/executar/domain";
import { novoEstado } from "@/lib/executar/domain";
import { projetarMapaOS } from "@/lib/executar/mapa-os-projection";

const ORG_ID = "org-mapa-os";
const REFERENCIA = new Date(2026, 7, 27, 12); // 27/08/2026, quinta-feira

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

function estadoCom(
  tasks: readonly Entrega[],
  changes: Partial<EstadoOperacional> = {}
): EstadoOperacional {
  return { ...novoEstado(ORG_ID, tasks), ...changes };
}

describe("projetarMapaOS", () => {
  it("preenche os 6 day cards com placeholder quando não há tarefas", () => {
    const projecao = projetarMapaOS(
      estadoCom([]),
      REFERENCIA.toISOString(),
      REFERENCIA
    );

    expect(projecao.ciclo.dayCards).toHaveLength(6);
    for (const card of projecao.ciclo.dayCards) {
      expect(card.placeholder).toBe(true);
      expect(card.deliverable).toBeNull();
      for (const workflow of card.workflows) {
        expect(workflow.placeholder).toBe(true);
      }
    }
  });

  it("um dia com 1 tarefa gera 1 workflow real e 2 placeholders", () => {
    const task = tarefa({
      id: "t1",
      date: "28/08",
      mins: 30,
      title: "Revisar contrato",
    });
    const projecao = projetarMapaOS(
      estadoCom([task]),
      REFERENCIA.toISOString(),
      REFERENCIA
    );

    const card = projecao.ciclo.dayCards.find((item) => item.date === "28/08");
    expect(card).toBeDefined();
    expect(card?.placeholder).toBe(false);
    expect(card?.workflows[0]).toMatchObject({
      label: "Revisar contrato",
      steps: 2,
      placeholder: false,
    });
    expect(card?.workflows[1]?.placeholder).toBe(true);
    expect(card?.workflows[2]?.placeholder).toBe(true);
  });

  it("um dia com 5 tarefas rola as extras para o 3º slot sem estourar a grade", () => {
    const tasks = Array.from({ length: 5 }, (_, index) =>
      tarefa({
        id: `t${index}`,
        date: "28/08",
        stage: index + 1,
        mins: 15,
        title: `Tarefa ${index + 1}`,
      })
    );
    const projecao = projetarMapaOS(
      estadoCom(tasks),
      REFERENCIA.toISOString(),
      REFERENCIA
    );

    const card = projecao.ciclo.dayCards.find((item) => item.date === "28/08");
    expect(card?.workflows).toHaveLength(3);
    expect(card?.workflows[0]?.label).toBe("Tarefa 1");
    expect(card?.workflows[1]?.label).toBe("Tarefa 2");
    expect(card?.workflows[2]).toMatchObject({ label: "+3 tarefas", steps: 3 });
  });

  it("trunca o entregável em no máximo 2 palavras", () => {
    const task = tarefa({
      id: "t1",
      date: "28/08",
      title: "Consolidar licenças e contratos",
    });
    const projecao = projetarMapaOS(
      estadoCom([task]),
      REFERENCIA.toISOString(),
      REFERENCIA
    );
    const card = projecao.ciclo.dayCards.find((item) => item.date === "28/08");

    expect(card?.deliverable).toBe("Consolidar licenças…");
  });

  it("sem tarefa liberada, a rotina não tem nó 'current'", () => {
    const bloqueada = tarefa({
      id: "bloqueada",
      deps: ["dependencia-inexistente"],
    });
    const projecao = projetarMapaOS(
      estadoCom([bloqueada]),
      REFERENCIA.toISOString(),
      REFERENCIA
    );

    expect(projecao.ciclo.routine.some((no) => no.state === "current")).toBe(
      false
    );
  });

  it("a rotina nunca ultrapassa 6 nós mesmo com mais tarefas prontas disponíveis", () => {
    const tasks = Array.from({ length: 10 }, (_, index) =>
      tarefa({
        id: `pronta-${index}`,
        date: "28/08",
        title: `Entrega ${index}`,
      })
    );
    const projecao = projetarMapaOS(
      estadoCom(tasks),
      REFERENCIA.toISOString(),
      REFERENCIA
    );

    expect(projecao.ciclo.routine.length).toBeLessThanOrEqual(6);
  });

  it("marca o dia de hoje como 'current' na semana do admin", () => {
    const projecao = projetarMapaOS(
      estadoCom([]),
      REFERENCIA.toISOString(),
      REFERENCIA
    );

    expect(projecao.admin.week).toHaveLength(7);
    expect(
      projecao.admin.week.filter((dia) => dia.state === "current")
    ).toHaveLength(1);
  });

  it("expõe as 5 ações administrativas do Scanner, sem QR (reconhecimento por símbolo)", () => {
    const projecao = projetarMapaOS(
      estadoCom([]),
      REFERENCIA.toISOString(),
      REFERENCIA
    );

    expect(projecao.admin.actions.map((acao) => acao.id)).toEqual([
      "entrada",
      "copiloto",
      "seletor",
      "feito",
      "saida",
    ]);
    for (const acao of projecao.admin.actions) {
      expect(acao).not.toHaveProperty("qrPayload");
      expect(typeof acao.label).toBe("string");
    }
  });

  it("as 3 lanes de notas não carregam conteúdo digital, só rótulo", () => {
    const projecao = projetarMapaOS(
      estadoCom([]),
      REFERENCIA.toISOString(),
      REFERENCIA
    );

    expect(projecao.notas.lanes).toEqual([
      { id: "agora", label: "AGORA" },
      { id: "proximo", label: "PRÓXIMO" },
      { id: "depois", label: "DEPOIS" },
    ]);
  });
});
