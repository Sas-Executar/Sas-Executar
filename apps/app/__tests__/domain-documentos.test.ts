import { describe, expect, it } from "vitest";
import type { Entrega } from "@/lib/executar/domain";
import {
  criarDocumento,
  documentosDoProjeto,
  editarDocumento,
  novoEstado,
  removerDocumento,
} from "@/lib/executar/domain";

const ORG_ID = "org-documentos";

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

describe("documentos Markdown local-first", () => {
  it("cria um documento vinculado ao projeto ativo", () => {
    const state = novoEstado(ORG_ID, [tarefaBase()]);

    const next = criarDocumento(state, "  Nota de kickoff  ", "# Olá");
    const [document] = next.documents;

    expect(next.documents).toHaveLength(1);
    expect(document.title).toBe("Nota de kickoff");
    expect(document.content).toBe("# Olá");
    expect(document.projectId).toBe(state.activeProjectId);
    expect(document.createdAt).toBe(document.updatedAt);
  });

  it("rejeita título vazio", () => {
    const state = novoEstado(ORG_ID, [tarefaBase()]);

    expect(() => criarDocumento(state, "   ")).toThrow(
      "O documento precisa de um título."
    );
  });

  it("documentosDoProjeto filtra só os documentos do projeto informado", () => {
    const state = novoEstado(ORG_ID, [tarefaBase()]);
    const withDoc = criarDocumento(state, "Nota A");

    expect(documentosDoProjeto(withDoc, state.activeProjectId)).toHaveLength(1);
    expect(documentosDoProjeto(withDoc, "outro-projeto")).toHaveLength(0);
  });

  it("edita título e conteúdo, atualizando updatedAt", () => {
    const state = novoEstado(ORG_ID, [tarefaBase()]);
    const created = criarDocumento(state, "Rascunho");
    const [document] = created.documents;

    const edited = editarDocumento(created, document.id, {
      content: "Conteúdo revisado",
    });

    expect(edited.documents[0].title).toBe("Rascunho");
    expect(edited.documents[0].content).toBe("Conteúdo revisado");
    expect(edited.documents[0].createdAt).toBe(document.createdAt);
  });

  it("rejeita edição para título vazio", () => {
    const state = novoEstado(ORG_ID, [tarefaBase()]);
    const created = criarDocumento(state, "Rascunho");
    const [document] = created.documents;

    expect(() =>
      editarDocumento(created, document.id, { title: "   " })
    ).toThrow("O documento precisa de um título.");
  });

  it("rejeita edição de documento inexistente", () => {
    const state = novoEstado(ORG_ID, [tarefaBase()]);

    expect(() =>
      editarDocumento(state, "documento-inexistente", { title: "x" })
    ).toThrow("Documento não encontrado.");
  });

  it("remove um documento existente", () => {
    const state = novoEstado(ORG_ID, [tarefaBase()]);
    const created = criarDocumento(state, "Descartável");
    const [document] = created.documents;

    const removed = removerDocumento(created, document.id);

    expect(removed.documents).toHaveLength(0);
  });

  it("rejeita remoção de documento inexistente", () => {
    const state = novoEstado(ORG_ID, [tarefaBase()]);

    expect(() => removerDocumento(state, "documento-inexistente")).toThrow(
      "Documento não encontrado."
    );
  });

  it("gera ids únicos para documentos sucessivos", () => {
    const state = novoEstado(ORG_ID, [tarefaBase()]);
    const first = criarDocumento(state, "Um");
    const second = criarDocumento(first, "Dois");

    const ids = second.documents.map((document) => document.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
