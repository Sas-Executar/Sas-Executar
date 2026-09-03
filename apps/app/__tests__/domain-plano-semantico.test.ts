import { describe, expect, it } from "vitest";
import type { Entrega } from "@/lib/executar/domain";
import {
  entregasAtivas,
  importarPlano,
  novoEstado,
} from "@/lib/executar/domain";

const ORG_ID = "org-semantico";
const DATE_PATTERN = /^\d{2}\/\d{2}$/;
const RESOLVER_PENDENCIAS_PATTERN = /RESOLVER · \d+ PENDÊNCIAS/;

function tarefaBase(): Entrega {
  return {
    id: "base",
    date: "01/09",
    deps: [],
    front: "Operações",
    mins: 30,
    stage: 1,
    title: "Entrega base",
  };
}

describe("importarPlano — fallback semântico ACTION-UNIT", () => {
  it("importa prosa livre reconhecida como plano quando toda ação está pronta", () => {
    const state = novoEstado(ORG_ID, [tarefaBase()]);

    const next = importarPlano(
      state,
      "Coletar contratos e licenças da unidade. Aprovar orçamento.",
      "append"
    );

    const tasks = entregasAtivas(next);
    const novas = tasks.filter((task) => task.id.startsWith("plano-acao-"));

    expect(novas).toHaveLength(2);
    expect(novas[0].title).toBe("Coletar contratos e licenças da unidade.");
    expect(novas[0].front).toBe("Descoberta");
    expect(novas[1].title).toBe("Aprovar orçamento.");
    expect(novas[1].front).toBe("Decisão");
    expect(novas.every((task) => DATE_PATTERN.test(task.date))).toBe(true);
  });

  it("não completa silenciosamente quando há pendências — lança erro com o padrão ○/△/RESOLVER", () => {
    const state = novoEstado(ORG_ID, [tarefaBase()]);

    expect(() =>
      importarPlano(
        state,
        "Corrigir isso. Migrar autenticação, que depende de aprovação ainda não confirmada.",
        "append"
      )
    ).toThrow(RESOLVER_PENDENCIAS_PATTERN);
  });

  it("mantém o erro original para texto que não é plano nem prosa reconhecível", () => {
    const state = novoEstado(ORG_ID, [tarefaBase()]);

    expect(() => importarPlano(state, "###???***", "append")).toThrow(
      "Formato não reconhecido. Use JSON, CSV ou lista Markdown."
    );
  });
});
