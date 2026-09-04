/**
 * Gate de qualidade de frame — PR-04 do plano "Scanner OCR-first V2"
 * (handoff técnico do usuário, §"frame-quality.ts"). Roda ANTES de chamar
 * o worker OCR, sobre os pixels já capturados pelo `frame-source`/
 * `roi-preprocessor` — nunca reconhece continuamente a 10 FPS sem
 * critério (handoff, "NÃO FAZER").
 *
 * Funções puras sobre `Uint8ClampedArray` (mesmo formato de
 * `ImageData.data`, RGBA por pixel) — testáveis com fixtures sintéticas,
 * sem precisar de câmera nem canvas real.
 *
 * Escopo desta PR: luminância, contraste, presença mínima de foreground e
 * detecção de frame repetido. Detecção de blur (variância do Laplaciano)
 * fica documentada como próximo passo — um heurístico de blur mal
 * calibrado rejeitaria frames bons com mais frequência do que ajudaria;
 * calibrar isso pertence ao corpus de fixtures (PR-08), não a um palpite
 * sem medição.
 */

/** Peso ITU-R BT.601 para luminância a partir de RGB. */
function luminanciaDoPixel(
  pixels: Uint8ClampedArray,
  indiceBase: number
): number {
  return (
    0.299 * pixels[indiceBase] +
    0.587 * pixels[indiceBase + 1] +
    0.114 * pixels[indiceBase + 2]
  );
}

function luminancias(pixels: Uint8ClampedArray): number[] {
  const valores: number[] = [];

  for (let i = 0; i < pixels.length; i += 4) {
    valores.push(luminanciaDoPixel(pixels, i));
  }

  return valores;
}

export function calcularLuminanciaMedia(pixels: Uint8ClampedArray): number {
  const valores = luminancias(pixels);

  if (!valores.length) {
    return 0;
  }

  return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
}

/** Desvio padrão populacional da luminância — proxy simples de contraste. */
export function calcularContraste(pixels: Uint8ClampedArray): number {
  const valores = luminancias(pixels);

  if (!valores.length) {
    return 0;
  }

  const media =
    valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
  const variancia =
    valores.reduce((soma, valor) => soma + (valor - media) ** 2, 0) /
    valores.length;

  return Math.sqrt(variancia);
}

const LIMIAR_ESCURO_PADRAO = 90;
const FRACAO_FOREGROUND_MINIMA_PADRAO = 0.03;

/**
 * Verdadeiro quando há uma fração mínima de pixels "escuros o bastante"
 * para serem tinta/texto sobre um card claro — não garante que há texto
 * legível, só descarta frames obviamente vazios (parede lisa, teto, mão
 * cobrindo a lente).
 */
export function possuiForegroundMinimo(
  pixels: Uint8ClampedArray,
  limiarEscuro = LIMIAR_ESCURO_PADRAO,
  fracaoMinima = FRACAO_FOREGROUND_MINIMA_PADRAO
): boolean {
  const valores = luminancias(pixels);

  if (!valores.length) {
    return false;
  }

  const escuros = valores.filter((valor) => valor < limiarEscuro).length;
  return escuros / valores.length >= fracaoMinima;
}

const TOLERANCIA_FRAME_SEMELHANTE_PADRAO = 2;

/**
 * Verdadeiro quando dois frames são "praticamente iguais" (diferença
 * média de luminância abaixo da tolerância) — evita gastar OCR
 * reconhecendo o mesmo quadro parado repetidas vezes.
 */
export function framesSaoSemelhantes(
  a: Uint8ClampedArray,
  b: Uint8ClampedArray,
  tolerancia = TOLERANCIA_FRAME_SEMELHANTE_PADRAO
): boolean {
  if (a.length !== b.length || a.length === 0) {
    return false;
  }

  const luminanciasA = luminancias(a);
  const luminanciasB = luminancias(b);
  const diferencaMedia =
    luminanciasA.reduce(
      (soma, valor, indice) => soma + Math.abs(valor - luminanciasB[indice]),
      0
    ) / luminanciasA.length;

  return diferencaMedia <= tolerancia;
}

export type MotivoQualidadeInsuficiente =
  | "baixo_contraste"
  | "exposicao_inadequada"
  | "frame_repetido"
  | "sem_foreground";

export interface AvaliacaoQualidadeFrame {
  readonly motivo?: MotivoQualidadeInsuficiente;
  readonly ok: boolean;
}

export interface LimitesQualidadeFrame {
  readonly contrasteMinimo: number;
  readonly foregroundFracaoMinima: number;
  readonly foregroundLimiarEscuro: number;
  readonly luminanciaMaxima: number;
  readonly luminanciaMinima: number;
  readonly toleranciaFrameSemelhante: number;
}

export const LIMITES_QUALIDADE_PADRAO: LimitesQualidadeFrame = {
  contrasteMinimo: 20,
  foregroundFracaoMinima: FRACAO_FOREGROUND_MINIMA_PADRAO,
  foregroundLimiarEscuro: LIMIAR_ESCURO_PADRAO,
  luminanciaMaxima: 245,
  luminanciaMinima: 15,
  toleranciaFrameSemelhante: TOLERANCIA_FRAME_SEMELHANTE_PADRAO,
};

/**
 * Avalia se um frame vale a pena ser enviado ao worker OCR. `frameAnterior`
 * é opcional — quando ausente, a checagem de frame repetido é ignorada
 * (primeiro frame da sessão).
 */
export function avaliarQualidadeFrame(
  pixels: Uint8ClampedArray,
  frameAnterior: Uint8ClampedArray | null,
  limites: LimitesQualidadeFrame = LIMITES_QUALIDADE_PADRAO
): AvaliacaoQualidadeFrame {
  const luminancia = calcularLuminanciaMedia(pixels);

  if (
    luminancia < limites.luminanciaMinima ||
    luminancia > limites.luminanciaMaxima
  ) {
    return { motivo: "exposicao_inadequada", ok: false };
  }

  if (calcularContraste(pixels) < limites.contrasteMinimo) {
    return { motivo: "baixo_contraste", ok: false };
  }

  if (
    !possuiForegroundMinimo(
      pixels,
      limites.foregroundLimiarEscuro,
      limites.foregroundFracaoMinima
    )
  ) {
    return { motivo: "sem_foreground", ok: false };
  }

  if (
    frameAnterior &&
    framesSaoSemelhantes(
      pixels,
      frameAnterior,
      limites.toleranciaFrameSemelhante
    )
  ) {
    return { motivo: "frame_repetido", ok: false };
  }

  return { ok: true };
}
