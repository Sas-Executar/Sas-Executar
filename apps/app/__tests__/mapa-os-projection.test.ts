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
      expect(card.tasks).toHaveLength(0);
      expect(card.tasksOverflow).toBe(0);
      expect(card.percentage).toBe(0);
    }
  });

  it("um dia com 1 tarefa aparece no checklist do epic-card, não concluída", () => {
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
    expect(card?.tasks).toEqual([
      { id: "t1", title: "Revisar contrato", done: false },
    ]);
    expect(card?.tasksOverflow).toBe(0);
    expect(card?.totalCount).toBe(1);
    expect(card?.completedCount).toBe(0);
  });

  it("um dia com 5 tarefas mostra 3 no checklist e dobra as outras 2 num overflow", () => {
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
    expect(card?.tasks).toHaveLength(3);
    expect(card?.tasks[0]?.title).toBe("Tarefa 1");
    expect(card?.tasks[2]?.title).toBe("Tarefa 3");
    expect(card?.tasksOverflow).toBe(2);
    expect(card?.totalCount).toBe(5);
  });

  it("marca as tarefas concluídas no checklist e calcula o percentual do dia", () => {
    const tasks = [
      tarefa({ id: "t1", date: "28/08", mins: 30, title: "Tarefa 1" }),
      tarefa({ id: "t2", date: "28/08", mins: 30, title: "Tarefa 2" }),
    ];
    const projecao = projetarMapaOS(
      estadoCom(tasks, { done: ["t1"] }),
      REFERENCIA.toISOString(),
      REFERENCIA
    );
    const card = projecao.ciclo.dayCards.find((item) => item.date === "28/08");

    expect(card?.tasks.find((task) => task.id === "t1")?.done).toBe(true);
    expect(card?.tasks.find((task) => task.id === "t2")?.done).toBe(false);
    expect(card?.completedCount).toBe(1);
    expect(card?.percentage).toBe(50);
  });

  it("usa o título completo da tarefa principal como entregável, sem truncar", () => {
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

    expect(card?.deliverable).toBe("Consolidar licenças e contratos");
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
