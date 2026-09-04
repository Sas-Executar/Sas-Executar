/**
 * Recorte/preparo determinístico da ROI (região de interesse) do OCR — PR-04
 * do plano "Scanner OCR-first V2" (handoff §"roi-preprocessor.ts"):
 *
 *   camera frame → crop → grayscale → contrast → threshold(*) → resize →
 *   OCR input
 *
 * (*) Threshold binário ainda não está aplicado — o filtro CSS
 * `grayscale(1) contrast(1.65)` já em produção (`use-tesseract-symbol-
 * scanner.ts`) é preservado tal qual nesta PR; um threshold determinístico
 * por pixel é um candidato de otimização futura a comparar empiricamente
 * no corpus de fixtures (PR-08), não decidido às cegas aqui.
 *
 * A fração de ROI (82% do menor lado do vídeo) também é mantida idêntica
 * à de produção nesta PR — o handoff pede para calibrar isso
 * empiricamente para os 5 comandos padronizados, o que só faz sentido
 * depois de haver um corpus de fixtures para medir contra (PR-08).
 * Reduzir a ROI às cegas, sem medição, arriscaria piorar a precisão.
 */

/** Fração do menor lado do vídeo usada como ROI — idêntica à de produção. */
export const FRACAO_ROI_PADRAO = 0.82;
/** Lado do canvas de destino (px) — idêntico à de produção. */
export const LADO_CANVAS_OCR = 320;
/** `HTMLMediaElement.HAVE_CURRENT_DATA` — valor estável da spec HTML. */
const VIDEO_HAVE_CURRENT_DATA = 2;

export interface RetanguloRoi {
  readonly lado: number;
  readonly sx: number;
  readonly sy: number;
}

/** Geometria pura do recorte central quadrado — sem tocar em canvas/vídeo real. */
export function calcularRetanguloRoi(
  videoWidth: number,
  videoHeight: number,
  fracao: number = FRACAO_ROI_PADRAO
): RetanguloRoi {
  const lado = Math.min(videoWidth, videoHeight) * fracao;

  return {
    lado,
    sx: (videoWidth - lado) / 2,
    sy: (videoHeight - lado) / 2,
  };
}

export interface VideoFrameLike {
  readonly readyState: number;
  readonly videoHeight: number;
  readonly videoWidth: number;
}

/**
 * Recorte mínimo de `CanvasRenderingContext2D` que este módulo usa —
 * permite testar a chamada de desenho com um contexto falso, sem precisar
 * de um `<canvas>` real (jsdom não implementa canvas 2D nativamente).
 */
export interface ContextoDesenho2DLike {
  drawImage(
    imagem: unknown,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number
  ): void;
  filter: string;
}

/**
 * Desenha a ROI grayscale+contraste do frame de vídeo atual no contexto de
 * destino. Retorna `false` sem desenhar quando o vídeo ainda não tem um
 * frame utilizável (mesma checagem já usada em produção).
 */
export function desenharRoiEmContexto(
  video: VideoFrameLike,
  contexto: ContextoDesenho2DLike,
  ladoDestino: number = LADO_CANVAS_OCR,
  fracao: number = FRACAO_ROI_PADRAO
): boolean {
  if (video.readyState < VIDEO_HAVE_CURRENT_DATA || !video.videoWidth) {
    return false;
  }

  const { lado, sx, sy } = calcularRetanguloRoi(
    video.videoWidth,
    video.videoHeight,
    fracao
  );

  contexto.filter = "grayscale(1) contrast(1.65)";
  contexto.drawImage(video, sx, sy, lado, lado, 0, 0, ladoDestino, ladoDestino);
  return true;
}
