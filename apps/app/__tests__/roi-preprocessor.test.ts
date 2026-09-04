import { describe, expect, it, vi } from "vitest";
import {
  type ContextoDesenho2DLike,
  calcularRetanguloRoi,
  desenharRoiEmContexto,
  FRACAO_ROI_PADRAO,
  LADO_CANVAS_OCR,
} from "@/lib/executar/scanner-engine/roi-preprocessor";

describe("calcularRetanguloRoi", () => {
  it("recorta um quadrado central de fracao*menorLado, mesmo em vídeo widescreen", () => {
    const roi = calcularRetanguloRoi(1920, 1080, 0.82);

    expect(roi.lado).toBeCloseTo(1080 * 0.82);
    expect(roi.sx).toBeCloseTo((1920 - roi.lado) / 2);
    expect(roi.sy).toBeCloseTo((1080 - roi.lado) / 2);
  });

  it("usa FRACAO_ROI_PADRAO quando a fração não é informada", () => {
    const comPadrao = calcularRetanguloRoi(800, 600);
    const explicito = calcularRetanguloRoi(800, 600, FRACAO_ROI_PADRAO);
    expect(comPadrao).toEqual(explicito);
  });

  it("centraliza corretamente em vídeo quadrado", () => {
    const roi = calcularRetanguloRoi(500, 500, 0.5);
    expect(roi).toEqual({ lado: 250, sx: 125, sy: 125 });
  });
});

describe("desenharRoiEmContexto", () => {
  function contextoFalso(): ContextoDesenho2DLike {
    return { drawImage: vi.fn(), filter: "" };
  }

  it("desenha a ROI grayscale+contraste com o retângulo calculado", () => {
    const video = { readyState: 4, videoHeight: 720, videoWidth: 1280 };
    const contexto = contextoFalso();

    const desenhou = desenharRoiEmContexto(video, contexto);

    expect(desenhou).toBe(true);
    expect(contexto.filter).toBe("grayscale(1) contrast(1.65)");
    const roi = calcularRetanguloRoi(1280, 720, FRACAO_ROI_PADRAO);
    expect(contexto.drawImage).toHaveBeenCalledWith(
      video,
      roi.sx,
      roi.sy,
      roi.lado,
      roi.lado,
      0,
      0,
      LADO_CANVAS_OCR,
      LADO_CANVAS_OCR
    );
  });

  it("não desenha e retorna false quando o vídeo ainda não tem frame utilizável", () => {
    const contexto = contextoFalso();

    expect(
      desenharRoiEmContexto(
        { readyState: 0, videoHeight: 0, videoWidth: 0 },
        contexto
      )
    ).toBe(false);
    expect(contexto.drawImage).not.toHaveBeenCalled();
  });

  it("não desenha quando videoWidth é zero mesmo com readyState alto", () => {
    const contexto = contextoFalso();

    expect(
      desenharRoiEmContexto(
        { readyState: 4, videoHeight: 480, videoWidth: 0 },
        contexto
      )
    ).toBe(false);
    expect(contexto.drawImage).not.toHaveBeenCalled();
  });
});
