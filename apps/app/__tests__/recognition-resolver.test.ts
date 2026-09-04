import { describe, expect, it } from "vitest";
import {
  calcularSimilaridade,
  construirRecognitionResult,
  resolverVocabularioFechado,
} from "@/lib/executar/scanner-engine/recognition-resolver";
import { normalizarTextoScanner } from "@/lib/executar/scanner-ocr";

describe("calcularSimilaridade", () => {
  it("é 1 para strings idênticas", () => {
    expect(calcularSimilaridade("ENTRADA", "ENTRADA")).toBe(1);
  });

  it("é 1 para duas strings vazias", () => {
    expect(calcularSimilaridade("", "")).toBe(1);
  });

  it("cai proporcionalmente à distância de edição", () => {
    // 1 substituição em 7 caracteres.
    expect(calcularSimilaridade("ENTR4DA", "ENTRADA")).toBeCloseTo(1 - 1 / 7);
  });
});

describe("resolverVocabularioFechado — casos já cobertos pelo matching exato", () => {
  it.each([
    ["ENTRADA", "entrada"],
    ["COPILOTO", "copiloto"],
    ["SELETOR", "seletor"],
    ["FEITO", "feito"],
    ["SAIDA", "saida"],
  ] as const)("reconhece %s com similaridade 1 (substring exata)", (texto, esperado) => {
    const resultado = resolverVocabularioFechado(normalizarTextoScanner(texto));
    expect(resultado).toEqual({ actionId: esperado, similaridade: 1 });
  });

  it("continua tolerando ruído ao redor da palavra (substring)", () => {
    expect(
      resolverVocabularioFechado(normalizarTextoScanner("xx-ENTRADA-xx"))
    ).toEqual({ actionId: "entrada", similaridade: 1 });
  });
});

describe("resolverVocabularioFechado — fallback fuzzy (ruído do OCR)", () => {
  it.each([
    ["ENTR4DA", "entrada"],
    ["FE1TO", "feito"],
    ["SA1DA", "saida"],
  ] as const)("resolve %s por similaridade quando não há substring exata", (textoRuidoso, esperado) => {
    const resultado = resolverVocabularioFechado(
      normalizarTextoScanner(textoRuidoso)
    );
    expect(resultado?.actionId).toBe(esperado);
    expect(resultado?.similaridade).toBeLessThan(1);
    expect(resultado?.similaridade).toBeGreaterThanOrEqual(0.7);
  });

  it("rejeita texto longe demais de qualquer palavra do vocabulário", () => {
    expect(
      resolverVocabularioFechado(normalizarTextoScanner("XYZQWERTY"))
    ).toBeNull();
  });

  it("rejeita string vazia", () => {
    expect(resolverVocabularioFechado("")).toBeNull();
  });

  it("respeita um limiar de similaridade customizado", () => {
    // 2 substituições em 7 caracteres — similaridade ~0.71, passa no padrão (0.7) mas não num limiar mais estrito.
    const textoComDoisErros = "ENTR44A";
    expect(resolverVocabularioFechado(textoComDoisErros, 0.7)).not.toBeNull();
    expect(resolverVocabularioFechado(textoComDoisErros, 0.9)).toBeNull();
  });
});

describe("construirRecognitionResult", () => {
  it("monta o RecognitionResult completo a partir da saída do worker OCR", () => {
    const resultado = construirRecognitionResult(
      {
        confidence: 91,
        recognitionEndedAt: 200,
        recognitionLatencyMs: 200,
        recognitionStartedAt: 0,
        text: "  S A Í D A\n",
      },
      1000
    );

    expect(resultado).toEqual({
      actionId: "saida",
      capturedAt: 1000,
      confidence: 91,
      normalizedText: "SAIDA",
      rawText: "  S A Í D A\n",
      recognitionEndedAt: 200,
      recognitionLatencyMs: 200,
      recognitionStartedAt: 0,
    });
  });

  it("retorna null quando o texto não corresponde a nenhuma ação", () => {
    const resultado = construirRecognitionResult(
      {
        confidence: 80,
        recognitionEndedAt: 50,
        recognitionLatencyMs: 50,
        recognitionStartedAt: 0,
        text: "DOCUMENTOS",
      },
      500
    );

    expect(resultado).toBeNull();
  });
});
