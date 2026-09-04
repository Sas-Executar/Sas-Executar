import { describe, expect, it } from "vitest";
import {
  avaliarQualidadeFrame,
  calcularContraste,
  calcularLuminanciaMedia,
  framesSaoSemelhantes,
  possuiForegroundMinimo,
} from "@/lib/executar/scanner-engine/frame-quality";

function frameDe(luminancias: readonly number[]): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(luminancias.length * 4);

  luminancias.forEach((valor, indice) => {
    const base = indice * 4;
    pixels[base] = valor;
    pixels[base + 1] = valor;
    pixels[base + 2] = valor;
    pixels[base + 3] = 255;
  });

  return pixels;
}

const FRAME_UNIFORME_BRANCO = frameDe(new Array(16).fill(255));
const FRAME_UNIFORME_CINZA = frameDe(new Array(16).fill(130));
const FRAME_CARTAO_COM_TEXTO = frameDe([
  ...new Array(12).fill(220), // fundo claro do cartão
  ...new Array(4).fill(10), // tinta escura do texto
]);
/** Contraste alto, exposição adequada, mas nenhum pixel escuro o bastante para ser tinta — ex.: parede com sombra. */
const FRAME_SEM_TEXTO_MAS_COM_CONTRASTE = frameDe([
  ...new Array(4).fill(150),
  ...new Array(4).fill(220),
]);

describe("calcularLuminanciaMedia", () => {
  it("é 255 para um frame totalmente branco e 0 para totalmente preto", () => {
    expect(calcularLuminanciaMedia(FRAME_UNIFORME_BRANCO)).toBe(255);
    expect(calcularLuminanciaMedia(frameDe(new Array(4).fill(0)))).toBe(0);
  });

  it("retorna 0 para um array vazio, sem lançar erro", () => {
    expect(calcularLuminanciaMedia(new Uint8ClampedArray(0))).toBe(0);
  });
});

describe("calcularContraste", () => {
  it("é 0 para um frame uniforme", () => {
    expect(calcularContraste(FRAME_UNIFORME_CINZA)).toBe(0);
  });

  it("é maior que 0 quando há mistura de claro e escuro", () => {
    expect(calcularContraste(FRAME_CARTAO_COM_TEXTO)).toBeGreaterThan(0);
  });
});

describe("possuiForegroundMinimo", () => {
  it("é falso para um cartão em branco (sem tinta escura)", () => {
    expect(possuiForegroundMinimo(FRAME_UNIFORME_BRANCO)).toBe(false);
  });

  it("é verdadeiro quando há uma fração mínima de pixels escuros (texto)", () => {
    expect(possuiForegroundMinimo(FRAME_CARTAO_COM_TEXTO)).toBe(true);
  });
});

describe("framesSaoSemelhantes", () => {
  it("é verdadeiro para frames idênticos", () => {
    expect(
      framesSaoSemelhantes(FRAME_CARTAO_COM_TEXTO, FRAME_CARTAO_COM_TEXTO)
    ).toBe(true);
  });

  it("é falso para frames bem diferentes", () => {
    expect(
      framesSaoSemelhantes(
        FRAME_UNIFORME_BRANCO,
        frameDe(new Array(16).fill(0))
      )
    ).toBe(false);
  });

  it("é falso quando os arrays têm tamanhos diferentes", () => {
    expect(
      framesSaoSemelhantes(
        FRAME_UNIFORME_BRANCO,
        frameDe(new Array(4).fill(255))
      )
    ).toBe(false);
  });
});

describe("avaliarQualidadeFrame", () => {
  it("aprova um frame com contraste, exposição e foreground adequados", () => {
    expect(avaliarQualidadeFrame(FRAME_CARTAO_COM_TEXTO, null)).toEqual({
      ok: true,
    });
  });

  it("rejeita frame estourado de exposição (branco demais)", () => {
    expect(avaliarQualidadeFrame(FRAME_UNIFORME_BRANCO, null)).toEqual({
      motivo: "exposicao_inadequada",
      ok: false,
    });
  });

  it("rejeita frame escuro demais", () => {
    expect(avaliarQualidadeFrame(frameDe(new Array(16).fill(2)), null)).toEqual(
      {
        motivo: "exposicao_inadequada",
        ok: false,
      }
    );
  });

  it("rejeita frame de baixo contraste (cinza uniforme dentro da faixa de exposição)", () => {
    expect(avaliarQualidadeFrame(FRAME_UNIFORME_CINZA, null)).toEqual({
      motivo: "baixo_contraste",
      ok: false,
    });
  });

  it("rejeita frame sem foreground mesmo com contraste e exposição adequados", () => {
    expect(
      avaliarQualidadeFrame(FRAME_SEM_TEXTO_MAS_COM_CONTRASTE, null)
    ).toEqual({ motivo: "sem_foreground", ok: false });
  });

  it("rejeita frame repetido em relação ao anterior", () => {
    expect(
      avaliarQualidadeFrame(FRAME_CARTAO_COM_TEXTO, FRAME_CARTAO_COM_TEXTO)
    ).toEqual({ motivo: "frame_repetido", ok: false });
  });

  it("ignora a checagem de frame repetido quando não há frame anterior", () => {
    expect(avaliarQualidadeFrame(FRAME_CARTAO_COM_TEXTO, null).ok).toBe(true);
  });
});
