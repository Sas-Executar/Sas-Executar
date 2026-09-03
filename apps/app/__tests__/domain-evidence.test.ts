import { describe, expect, it } from "vitest";
import type { ArquivoEvidencia, Entrega } from "@/lib/executar/domain";
import { novoEstado, registrarEvidencia } from "@/lib/executar/domain";

const ORG_ID = "org-evidencia";

function tarefa(): Entrega {
  return {
    id: "t1",
    date: "28/08",
    deps: [],
    front: "principal",
    mins: 30,
    stage: 1,
    title: "Revisar contrato",
  };
}

function arquivo(overrides: Partial<ArquivoEvidencia> = {}): ArquivoEvidencia {
  return {
    name: "foto.jpg",
    size: 1000,
    type: "image/jpeg",
    ...overrides,
  };
}

describe("registrarEvidencia — validação de arquivo", () => {
  it("aceita um arquivo só com storagePath (após upload remoto, sem data inline)", () => {
    const task = tarefa();
    const state = novoEstado(ORG_ID, [task]);

    const result = registrarEvidencia(
      [task],
      state,
      task.id,
      "",
      "",
      false,
      arquivo({ storagePath: "evidencias/org/foto.jpg" })
    );

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.file?.data).toBeUndefined();
    expect(result.evidence[0]?.file?.storagePath).toBe(
      "evidencias/org/foto.jpg"
    );
  });

  it("aceita um arquivo só com data inline (sem persistência remota) — comportamento original", () => {
    const task = tarefa();
    const state = novoEstado(ORG_ID, [task]);

    const result = registrarEvidencia(
      [task],
      state,
      task.id,
      "",
      "",
      false,
      arquivo({ data: "data:image/jpeg;base64,AAAA" })
    );

    expect(result.evidence[0]?.file?.data).toBe("data:image/jpeg;base64,AAAA");
  });

  it("rejeita um arquivo sem data E sem storagePath", () => {
    const task = tarefa();
    const state = novoEstado(ORG_ID, [task]);

    expect(() =>
      registrarEvidencia([task], state, task.id, "", "", false, arquivo())
    ).toThrow("O arquivo da evidência precisa ser válido.");
  });

  it("continua rejeitando arquivo acima de 2,5 MB mesmo com storagePath", () => {
    const task = tarefa();
    const state = novoEstado(ORG_ID, [task]);

    expect(() =>
      registrarEvidencia(
        [task],
        state,
        task.id,
        "",
        "",
        false,
        arquivo({ size: 3_000_000, storagePath: "evidencias/org/foto.jpg" })
      )
    ).toThrow("O arquivo da evidência deve ter no máximo 2,5 MB.");
  });
});
