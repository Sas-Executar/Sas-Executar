import type { AcaoScannerId } from "./mapa-os-projection.ts";

const VOCABULARIO_OCR: ReadonlyArray<{
  readonly aliases: readonly string[];
  readonly id: AcaoScannerId;
}> = [
  { id: "entrada", aliases: ["ENTRADA", "ENTRAR"] },
  { id: "copiloto", aliases: ["COPILOTO", "BOT"] },
  { id: "seletor", aliases: ["SELETOR", "SELECAO"] },
  { id: "feito", aliases: ["FEITO", "CONCLUIR"] },
  { id: "saida", aliases: ["SAIDA", "SAIR"] },
];

const NAO_ALFANUMERICO_PATTERN = /[^A-Z0-9]/g;

export function normalizarTextoScanner(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("pt-BR")
    .replace(NAO_ALFANUMERICO_PATTERN, "");
}

/**
 * Converte a saída ruidosa do Tesseract para o vocabulário fechado do
 * Mapa-OS. Se o recorte contiver mais de uma ação impressa, falha fechado em
 * vez de escolher arbitrariamente a primeira — o operador deve isolar um alvo.
 */
export function resolverTextoScanner(texto: string): AcaoScannerId | null {
  const normalizado = normalizarTextoScanner(texto);

  if (!normalizado) {
    return null;
  }

  const correspondencias = VOCABULARIO_OCR.filter((item) =>
    item.aliases.some((alias) => normalizado.includes(alias))
  );

  return correspondencias.length === 1 ? (correspondencias[0]?.id ?? null) : null;
}

export const CARACTERES_OCR_SCANNER = "ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÂÃÉÊÍÓÔÕÚÇ";
