import { describe, expect, it } from "vitest";
import type { Entrega } from "@/lib/executar/domain";
import {
  adicionarEntrega,
  eventosPendentes,
  novoEstado,
} from "@/lib/executar/domain";

const ORG_ID = "org-retencao";
const MAX_EVENTOS_RETIDOS = 200;

function tarefa(id: string): Entrega {
  return {
    id,
    date: "28/08",
    deps: [],
    front: "principal",
    mins: 15,
    stage: 1,
    title: `Tarefa ${id}`,
  };
}

describe("registrar — retenção do log de eventos local-first", () => {
  it("nunca deixa events[] passar de 200 entradas, mesmo depois de muitas mutações", () => {
    let state = novoEstado(ORG_ID, []);

    for (let index = 0; index < 205; index += 1) {
      state = adicionarEntrega(state, tarefa(`t${index}`));
    }

    expect(state.events.length).toBe(MAX_EVENTOS_RETIDOS);
    expect(state.revision).toBe(205);
  });

  it("mantém sempre os eventos mais recentes, nunca os mais antigos", () => {
    let state = novoEstado(ORG_ID, []);

    for (let index = 0; index < 205; index += 1) {
      state = adicionarEntrega(state, tarefa(`t${index}`));
    }

    const revisoes = state.events.map((event) => event.revision);

    expect(Math.min(...revisoes)).toBe(205 - MAX_EVENTOS_RETIDOS + 1);
    expect(Math.max(...revisoes)).toBe(205);
  });

  it("não quebra a sincronização incremental para uma janela pequena e realista", () => {
    let state = novoEstado(ORG_ID, []);

    for (let index = 0; index < 205; index += 1) {
      state = adicionarEntrega(state, tarefa(`t${index}`));
    }

    // Cenário real: o servidor já confirmou até a penúltima revisão: só o
    // evento mais recente deveria faltar sincronizar — a truncação não
    // pode ter comido isso.
    const pendentes = eventosPendentes(state, ORG_ID, state.revision - 1);

    expect(pendentes).toHaveLength(1);
    expect(pendentes[0]?.revision).toBe(state.revision);
  });
});
