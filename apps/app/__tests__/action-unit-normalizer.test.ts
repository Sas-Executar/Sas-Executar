import { describe, expect, it } from "vitest";
import {
  formatarPendencias,
  normalizarPlano,
  renderizarFraseAcao,
} from "@/lib/executar/action-unit-normalizer";

const NO_ACTION_IDENTIFIED_PATTERN = /^NO_ACTION_IDENTIFIED/;
const RESOLVER_PENDENCIAS_PATTERN = /\[ RESOLVER · 1 PENDÊNCIAS \]/;

describe("normalizarPlano — caminho bom", () => {
  it("não infla uma ação mínima já válida", () => {
    const resultado = normalizarPlano("Aprovar orçamento.");

    expect(resultado.normalization_status).toBe("READY");
    expect(resultado.issues).toHaveLength(0);
    expect(resultado.actions).toHaveLength(1);

    const [acao] = resultado.actions;
    expect(acao.intent).toBe("APPROVE");
    expect(acao.operator).toBe("Aprovar");
    expect(acao.target).toBe("orçamento");
    expect(acao.qualifiers).toEqual({});
    expect(acao.status).toBe("READY");
    expect(renderizarFraseAcao(acao)).toBe("Aprovar orçamento.");
  });

  it("decompõe um texto com várias orações em várias ações, na ordem do texto", () => {
    const texto =
      "Coletar contratos e licenças da unidade. " +
      "Mapear a jornada de atendimento no âmbito da unidade nova. " +
      "Avaliar capacidade usando simulações de demanda. " +
      "Aprovar orçamento.";

    const resultado = normalizarPlano(texto);

    expect(resultado.normalization_status).toBe("READY");
    expect(resultado.actions.map((acao) => acao.intent)).toEqual([
      "ACQUIRE",
      "MAP",
      "EVALUATE",
      "APPROVE",
    ]);
    expect(resultado.actions[1].qualifiers.scope).toBe("unidade nova");
    expect(resultado.actions[2].qualifiers.method).toBe(
      "simulações de demanda"
    );
  });

  it("captura critério de sucesso e resultado esperado sem duplicar o alvo", () => {
    const resultado = normalizarPlano(
      "Validar autenticação quando todos os usuários migrarem para garantir que nenhum acesso seja perdido."
    );

    const [acao] = resultado.actions;
    expect(acao.status).toBe("READY");
    expect(acao.qualifiers.criteria).toEqual(["todos os usuários migrarem"]);
    expect(acao.expected_result).toBe("nenhum acesso seja perdido");
  });

  it("é determinístico — mesma entrada produz sempre a mesma saída", () => {
    const texto =
      "Migrar autenticação para Supabase usando o adaptador oficial.";

    expect(normalizarPlano(texto)).toEqual(normalizarPlano(texto));
  });

  it("produz quantas ações o texto expressar, sem limite fixo (contagem ≠ capacidade de exibição)", () => {
    const texto = Array.from(
      { length: 11 },
      (_, index) => `Documentar item ${index + 1} do catálogo.`
    ).join(" ");

    const resultado = normalizarPlano(texto);
    expect(resultado.actions).toHaveLength(11);
  });
});

describe("normalizarPlano — caminho ruim", () => {
  it("sinaliza AMBIGUOUS_TARGET quando o alvo é um pronome sem referência", () => {
    const resultado = normalizarPlano("Corrigir isso.");

    expect(resultado.normalization_status).toBe("NEEDS_RESOLUTION");
    expect(resultado.actions[0].status).toBe("PARTIAL");
    expect(
      resultado.issues.some((issue) => issue.startsWith("AMBIGUOUS_TARGET"))
    ).toBe(true);
  });

  it("sinaliza DEPENDENCY_MISSING e marca a ação como BLOCKED", () => {
    const resultado = normalizarPlano(
      "Migrar autenticação, que depende de aprovação orçamentária ainda não confirmada."
    );

    expect(resultado.normalization_status).toBe("NEEDS_RESOLUTION");
    expect(resultado.actions[0].status).toBe("BLOCKED");
    expect(
      resultado.issues.some((issue) => issue.startsWith("DEPENDENCY_MISSING"))
    ).toBe(true);
  });

  it("sinaliza OPTIONALITY_UNRESOLVED quando uma decisão é marcada como não definida", () => {
    const resultado = normalizarPlano(
      "Selecionar fornecedor, critério de seleção ainda não decidido."
    );

    expect(resultado.normalization_status).toBe("NEEDS_RESOLUTION");
    expect(
      resultado.issues.some((issue) =>
        issue.startsWith("OPTIONALITY_UNRESOLVED")
      )
    ).toBe(true);
  });

  it("sinaliza AMBIGUOUS_OPERATOR quando dois verbos concorrem na mesma oração", () => {
    const resultado = normalizarPlano(
      "Corrigir ou otimizar o módulo de pagamentos."
    );

    expect(resultado.normalization_status).toBe("NEEDS_RESOLUTION");
    expect(
      resultado.issues.some((issue) => issue.startsWith("AMBIGUOUS_OPERATOR"))
    ).toBe(true);
  });

  it("retorna NEEDS_RESOLUTION com NO_ACTION_IDENTIFIED quando nenhum verbo é reconhecido", () => {
    const resultado = normalizarPlano("O céu estava bonito hoje pela manhã.");

    expect(resultado.normalization_status).toBe("NEEDS_RESOLUTION");
    expect(resultado.actions).toHaveLength(0);
    expect(resultado.issues[0]).toMatch(NO_ACTION_IDENTIFIED_PATTERN);
  });

  it("formatarPendencias usa o padrão ○/△ e o rodapé RESOLVER · N PENDÊNCIAS", () => {
    const resultado = normalizarPlano("Corrigir isso. Aprovar orçamento.");
    const texto = formatarPendencias(resultado);

    expect(texto).toContain("○ 2. Aprovar orçamento.");
    expect(texto).toContain("△ 1.");
    expect(texto).toMatch(RESOLVER_PENDENCIAS_PATTERN);
  });
});
