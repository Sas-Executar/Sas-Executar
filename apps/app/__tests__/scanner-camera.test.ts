import { describe, expect, it } from "vitest";
import { diagnosticarFalhaCamera } from "@/lib/executar/scanner-camera";

function erroDeCamera(name: string, message = "falha") {
  const error = new Error(message);
  error.name = name;
  return error;
}

describe("diagnosticarFalhaCamera", () => {
  it("prioriza contexto inseguro ou ausência de getUserMedia", () => {
    expect(
      diagnosticarFalhaCamera(erroDeCamera("NotAllowedError"), false, true)
        .codigo
    ).toBe("contexto");
    expect(
      diagnosticarFalhaCamera(erroDeCamera("NotAllowedError"), true, false)
        .codigo
    ).toBe("contexto");
  });

  it.each([
    ["NotAllowedError", "permissao"],
    ["SecurityError", "permissao"],
    ["NotFoundError", "dispositivo"],
    ["NotReadableError", "ocupada"],
    ["OverconstrainedError", "restricao"],
    ["AbortError", "abortada"],
    ["UnknownError", "desconhecida"],
  ] as const)("classifica %s como %s", (name, codigo) => {
    expect(diagnosticarFalhaCamera(erroDeCamera(name), true, true).codigo).toBe(
      codigo
    );
  });

  it("preserva nome e mensagem para diagnóstico no aparelho", () => {
    expect(
      diagnosticarFalhaCamera(
        erroDeCamera("NotReadableError", "camera busy"),
        true,
        true
      ).detalheTecnico
    ).toBe("NotReadableError: camera busy");
  });
});
