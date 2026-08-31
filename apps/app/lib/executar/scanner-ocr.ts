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
 * Mapa-OS. O OCR lê o rótulo impresso junto ao símbolo; a forma do ícone é
 * reconhecida em paralelo por `symbol-recognizer.ts`.
 */
export function resolverTextoScanner(texto: string): AcaoScannerId | null {
  const normalizado = normalizarTextoScanner(texto);

  if (!normalizado) {
    return null;
  }

  for (const item of VOCABULARIO_OCR) {
    if (item.aliases.some((alias) => normalizado.includes(alias))) {
      return item.id;
    }
  }

  return null;
}

export const CARACTERES_OCR_SCANNER = "ABCDEFGHIJKLMNOPQRSTUVWXYZÁÀÂÃÉÊÍÓÔÕÚÇ";
