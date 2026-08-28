import { describe, expect, it } from "vitest";
import {
  assumirFoco,
  concluirPorGestoHumano,
  type Entrega,
  type EstadoOperacional,
  novoEstado,
  POLITICA_CONCLUSAO_PADRAO,
} from "@/lib/executar/domain";

/**
 * `concluirPorGestoHumano` é o atalho usado pelo botão "Concluir" do app e
 * pela ação "Feito" do Scanner (decisão do usuário, 28/08/2026: nenhum dos
 * dois deve pedir evidência/DoD/aprovação — o próprio clique/scan já é a
 * confirmação). Estes testes usam de propósito a política mais estrita
 * (`POLITICA_CONCLUSAO_PADRAO`, com `requireDod/Evidence/Verification`
 * todos `true`) para provar que o atalho realmente ignora a política —
 * não só que funciona quando ela já é frouxa.
 */

const ORG_ID = "org-conclusao-rapida";

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

/** Estado com a política mais estrita e sem nenhuma evidência registrada. */
function estadoEstrito(tasks: readonly Entrega[]): EstadoOperacional {
  const base = novoEstado(ORG_ID, tasks);
  return {
    ...base,
    projects: base.projects.map((project) => ({
      ...project,
      completionPolicy: POLITICA_CONCLUSAO_PADRAO,
    })),
  };
}

describe("concluirPorGestoHumano", () => {
  it("conclui mesmo sem DoD definido, sob a política mais estrita (requireDod: true)", () => {
    const tasks = [tarefa({ id: "t1", title: "Sem DoD" })]; // sem campo `dod`
    let state = estadoEstrito(tasks);
    state = assumirFoco(tasks, state, "t1");

    const resultado = concluirPorGestoHumano(
      tasks,
      state,
      "t1",
      "Concluído no app."
    );

    expect(resultado.done).toContain("t1");
  });

  it("conclui sem nenhuma evidência pré-existente, sob a política mais estrita", () => {
    const tasks = [tarefa({ id: "t1" })];
    let state = estadoEstrito(tasks);
    state = assumirFoco(tasks, state, "t1");

    expect(state.evidence).toHaveLength(0);

    const resultado = concluirPorGestoHumano(tasks, state, "t1", "Concluído.");

    expect(resultado.done).toContain("t1");
  });

  it("registra uma evidência verificada automática com a nota do chamador", () => {
    const tasks = [tarefa({ id: "t1" })];
    let state = estadoEstrito(tasks);
    state = assumirFoco(tasks, state, "t1");

    const resultado = concluirPorGestoHumano(
      tasks,
      state,
      "t1",
      "Concluído via Scanner (Feito)."
    );

    const evidencia = resultado.evidence.find((item) => item.taskId === "t1");
    expect(evidencia?.verified).toBe(true);
    expect(evidencia?.note).toBe("Concluído via Scanner (Feito).");
  });

  it("avança o foco para a próxima entrega liberada", () => {
    const tasks = [
      tarefa({ id: "t1", stage: 1 }),
      tarefa({ id: "t2", stage: 2, deps: ["t1"] }),
    ];
    let state = estadoEstrito(tasks);
    state = assumirFoco(tasks, state, "t1");

    const resultado = concluirPorGestoHumano(tasks, state, "t1", "Feito.");

    expect(resultado.focus).toBe("t2");
  });

  it("lança erro ao tentar concluir uma entrega que não está em foco", () => {
    // t1 fica em foco por padrão (primeira liberada); t2 depende de t1, então
    // nunca está liberada/em foco enquanto t1 não for concluída.
    const tasks = [
      tarefa({ id: "t1", stage: 1 }),
      tarefa({ id: "t2", stage: 2, deps: ["t1"] }),
    ];
    const state = estadoEstrito(tasks);

    expect(() =>
      concluirPorGestoHumano(tasks, state, "t2", "Feito.")
    ).toThrow();
  });
});
