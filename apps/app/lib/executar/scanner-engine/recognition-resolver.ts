import type { RecognitionResult } from "@repo/executar-contracts/scanner";
import { normalizarTextoScanner, VOCABULARIO_OCR } from "../scanner-ocr";
import type { OcrRecognitionOutcome } from "./ocr-worker";

/**
 * Resolver de vocabulário fechado com tolerância a ruído — PR-05 do plano
 * "Scanner OCR-first V2" (handoff §6, "Closed Vocabulary Resolver"):
 *
 *   Tesseract text → normalize → closed vocabulary → similarity →
 *   confidence → action
 *
 * `resolverTextoScanner` (scanner-ocr.ts, já em produção) só reconhece
 * substring exata após normalizar — não resolve ruído comum do OCR como
 * "ENTR4DA" ou "FE1TO" (dígito no lugar de letra). Este módulo acrescenta
 * um segundo estágio: quando não há substring exata, compara a distância
 * de edição do texto inteiro contra cada palavra do vocabulário e aceita
 * o candidato mais próximo acima do limiar de similaridade — só como
 * fallback, nunca no lugar do match exato (que continua mais barato e
 * mais confiável quando já funciona).
 */

/** Distância de Levenshtein clássica (programação dinâmica O(n·m)). */
function distanciaLevenshtein(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (!a.length) {
    return b.length;
  }

  if (!b.length) {
    return a.length;
  }

  const linhaAnterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  const linhaAtual = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    linhaAtual[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const custoSubstituicao = a[i - 1] === b[j - 1] ? 0 : 1;
      linhaAtual[j] = Math.min(
        linhaAnterior[j] + 1, // remoção
        linhaAtual[j - 1] + 1, // inserção
        linhaAnterior[j - 1] + custoSubstituicao // substituição
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      linhaAnterior[j] = linhaAtual[j];
    }
  }

  return linhaAnterior[b.length];
}

/** 1 para strings idênticas, decrescendo linearmente com a distância de edição relativa ao maior comprimento. */
export function calcularSimilaridade(a: string, b: string): number {
  const maiorComprimento = Math.max(a.length, b.length);

  if (maiorComprimento === 0) {
    return 1;
  }

  return 1 - distanciaLevenshtein(a, b) / maiorComprimento;
}

export const LIMIAR_SIMILARIDADE_PADRAO = 0.7;

export interface CorrespondenciaVocabulario {
  readonly actionId: RecognitionResult["actionId"];
  readonly similaridade: number;
}

/**
 * Resolve texto OCR já normalizado contra o vocabulário fechado, em duas
 * etapas: substring exata primeiro (idêntico a `resolverTextoScanner`),
 * distância de edição como fallback tolerante a ruído.
 */
export function resolverVocabularioFechado(
  textoNormalizado: string,
  limiarSimilaridade: number = LIMIAR_SIMILARIDADE_PADRAO
): CorrespondenciaVocabulario | null {
  if (!textoNormalizado) {
    return null;
  }

  for (const item of VOCABULARIO_OCR) {
    if (item.aliases.some((alias) => textoNormalizado.includes(alias))) {
      return { actionId: item.id, similaridade: 1 };
    }
  }

  let melhor: CorrespondenciaVocabulario | null = null;

  for (const item of VOCABULARIO_OCR) {
    for (const alias of item.aliases) {
      const similaridade = calcularSimilaridade(textoNormalizado, alias);

      if (
        similaridade >= limiarSimilaridade &&
        (!melhor || similaridade > melhor.similaridade)
      ) {
        melhor = { actionId: item.id, similaridade };
      }
    }
  }

  return melhor;
}

/**
 * Constrói o `RecognitionResult` completo a partir da saída instrumentada
 * do worker OCR (PR-03) — `null` quando nenhum candidato do vocabulário
 * fechado atinge o limiar de similaridade.
 */
export function construirRecognitionResult(
  ocrOutcome: OcrRecognitionOutcome,
  capturedAt: number,
  limiarSimilaridade: number = LIMIAR_SIMILARIDADE_PADRAO
): RecognitionResult | null {
  const normalizedText = normalizarTextoScanner(ocrOutcome.text);
  const correspondencia = resolverVocabularioFechado(
    normalizedText,
    limiarSimilaridade
  );

  if (!correspondencia) {
    return null;
  }

  return {
    actionId: correspondencia.actionId,
    capturedAt,
    confidence: ocrOutcome.confidence,
    normalizedText,
    rawText: ocrOutcome.text,
    recognitionEndedAt: ocrOutcome.recognitionEndedAt,
    recognitionLatencyMs: ocrOutcome.recognitionLatencyMs,
    recognitionStartedAt: ocrOutcome.recognitionStartedAt,
  };
}
