import { describe, expect, it } from "vitest";
import {
  normalizarTextoScanner,
  resolverTextoScanner,
} from "@/lib/executar/scanner-ocr";

describe("resolverTextoScanner", () => {
  it.each([
    ["ENTRADA", "entrada"],
    ["Copiloto", "copiloto"],
    ["SELETOR", "seletor"],
    ["FEITO", "feito"],
    ["SAÍDA", "saida"],
  ] as const)("reconhece o rótulo %s", (texto, esperado) => {
    expect(resolverTextoScanner(texto)).toBe(esperado);
  });

  it("tolera espaços, acentos e ruído comum do OCR", () => {
    expect(resolverTextoScanner("  S A Í D A\n")).toBe("saida");
    expect(resolverTextoScanner("xx-ENTRADA-xx")).toBe("entrada");
  });

  it("tolera metadados impressos ao redor do rótulo", () => {
    expect(resolverTextoScanner("A1 ADMIN 01 ENTRADA")).toBe("entrada");
    expect(resolverTextoScanner("COPILOTO 02")).toBe("copiloto");
  });

  it("rejeita duas ações no mesmo recorte físico", () => {
    expect(resolverTextoScanner("ENTRADA COPILOTO")).toBeNull();
  });

  it("rejeita texto fora do vocabulário fechado", () => {
    expect(resolverTextoScanner("DOCUMENTOS")).toBeNull();
    expect(resolverTextoScanner("")).toBeNull();
  });
});

describe("normalizarTextoScanner", () => {
  it("remove diacríticos e caracteres que não ajudam o matching", () => {
    expect(normalizarTextoScanner("Saída! 123")).toBe("SAIDA123");
  });
});
