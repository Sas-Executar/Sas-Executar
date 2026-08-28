import { describe, expect, it } from "vitest";
import {
  distanciaHu,
  melhorCorrespondencia,
  referenciasSimbolos,
  type SimboloReferencia,
  vetorHu,
} from "@/lib/executar/symbol-recognizer";

/**
 * Testa o núcleo matemático (Hu moments + gating) com máscaras sintéticas,
 * sem depender de canvas — jsdom não implementa `Path2D` a partir de string
 * SVG (`referenciasSimbolos()` degrada para `[]` nesse caso, testado
 * abaixo); a geração real das 5 referências a partir dos ícones só roda no
 * navegador.
 *
 * As formas sintéticas são setas/ganchos assimétricos rasterizados num
 * canvas de teste 96×96 (não os 64×64 de produção — mais resolução aqui
 * reduz o ruído de quantização do rasterizador manual abaixo, que não tem
 * anti-aliasing como o `<canvas>` real usado em produção). Uma cruz/
 * retângulo perfeitamente simétrico e centrado num grid inteiro zeraria
 * exatamente as invariantes I2–I7 (só sobrevive a I1) — o que não acontece
 * com nenhum dos 5 ícones reais (todos têm traço diagonal/curvo
 * assimétrico), então os fixtures aqui evitam essa forma degenerada de
 * propósito.
 */

const LADO = 96;

function mascaraVazia(): Uint8Array {
  return new Uint8Array(LADO * LADO);
}

function pintarQuadrado(
  mascara: Uint8Array,
  cx: number,
  cy: number,
  lado: number
) {
  const meio = lado / 2;
  for (let dy = -meio; dy < meio; dy++) {
    for (let dx = -meio; dx < meio; dx++) {
      const px = Math.round(cx + dx);
      const py = Math.round(cy + dy);
      if (px >= 0 && px < LADO && py >= 0 && py < LADO) {
        mascara[py * LADO + px] = 1;
      }
    }
  }
}

/** Traça um segmento espesso entre dois pontos — aproxima um traço de ícone. */
function tracarLinha(
  mascara: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  espessura: number
) {
  const passos = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3) || 1;
  for (let i = 0; i <= passos; i++) {
    const t = i / passos;
    pintarQuadrado(mascara, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, espessura);
  }
}

/**
 * Seta/chevron assimétrico (2 diagonais + 1 haste) — mesmo espírito das
 * setas de Entrada/Saída (`m10 17 5-5-5-5` + barra), não um "+" simétrico.
 * O vértice do chevron fica deliberadamente FORA da linha horizontal cy
 * (em `cy - tamanho/6`, não em `cy`): com o vértice exatamente em `cy`, a
 * forma tem uma simetria de espelho horizontal acidental, e espelhá-la no
 * eixo vertical vira uma simples rotação de 180° — que os momentos de Hu
 * corretamente ignoram (são invariantes a rotação), mascarando a própria
 * propriedade de quiralidade que o teste de I7 quer exercitar.
 */
function mascaraSeta(
  cx: number,
  cy: number,
  tamanho = 32,
  espessura = 6,
  espelhada = false
): Uint8Array {
  const mascara = mascaraVazia();
  const sinal = espelhada ? -1 : 1;
  const verticeY = cy - tamanho / 6;
  tracarLinha(
    mascara,
    cx,
    cy - tamanho / 2,
    cx + (sinal * tamanho) / 2,
    verticeY,
    espessura
  );
  tracarLinha(
    mascara,
    cx + (sinal * tamanho) / 2,
    verticeY,
    cx,
    cy + tamanho / 2,
    espessura
  );
  tracarLinha(mascara, cx - sinal * tamanho, verticeY, cx, verticeY, espessura);
  return mascara;
}

/** Gancho em L — assimétrico por construção (dois braços perpendiculares que só se encontram num canto). */
function mascaraGancho(
  x: number,
  y: number,
  tamanho = 32,
  espessura = 8
): Uint8Array {
  const mascara = mascaraVazia();
  tracarLinha(mascara, x, y, x, y + tamanho, espessura);
  tracarLinha(mascara, x, y + tamanho, x + tamanho, y + tamanho, espessura);
  return mascara;
}

/** Círculo + marca interna (como Feito = círculo + check) — um disco puro é
 * circularmente simétrico e zera I2–I7 por definição; a marca quebra isso,
 * igual ao ícone real. */
function mascaraAneisComMarca(
  cx: number,
  cy: number,
  raio: number
): Uint8Array {
  const mascara = mascaraVazia();
  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      if (dist <= raio && dist >= raio - 6) {
        mascara[y * LADO + x] = 1;
      }
    }
  }
  tracarLinha(mascara, cx - raio / 3, cy, cx - raio / 8, cy + raio / 3, 4);
  tracarLinha(
    mascara,
    cx - raio / 8,
    cy + raio / 3,
    cx + raio / 2,
    cy - raio / 3,
    4
  );
  return mascara;
}

function huDe(mascara: Uint8Array) {
  const hu = vetorHu(mascara, LADO, LADO);
  if (!hu) {
    throw new Error("máscara sintética vazia — ajuste o teste");
  }
  return hu;
}

describe("vetorHu — invariância", () => {
  it("é ~invariante a translação (mesma forma, posições diferentes)", () => {
    const a = huDe(mascaraSeta(40, 40));
    const b = huDe(mascaraSeta(52, 44));

    expect(distanciaHu(a, b)).toBeLessThan(0.4);
  });

  it("é ~invariante a escala (mesma forma, tamanhos diferentes)", () => {
    // Mesma proporção tamanho:espessura (6:1) nos dois — só a escala muda.
    const pequena = huDe(mascaraSeta(48, 48, 24, 4));
    const grande = huDe(mascaraSeta(48, 48, 36, 6));

    expect(distanciaHu(pequena, grande)).toBeLessThan(0.4);
  });

  it("o 7º momento distingue um par espelhado (mesma forma, quiralidade oposta)", () => {
    const direita = huDe(mascaraSeta(48, 48, 32, 6, false));
    const esquerda = huDe(mascaraSeta(48, 48, 32, 6, true));

    // Espelhar troca o sinal de I7 sem mudar I1–I6 de forma relevante — o
    // vetor completo (com I7) tem que enxergar essa diferença.
    expect(distanciaHu(direita, esquerda)).toBeGreaterThan(0.05);
  });

  it("distingue formas claramente diferentes por uma margem folgada frente ao ruído de mesma forma", () => {
    const seta = huDe(mascaraSeta(48, 48));
    const gancho = huDe(mascaraGancho(28, 28));
    const anel = huDe(mascaraAneisComMarca(48, 48, 24));

    const ruidoMesmaForma = distanciaHu(seta, huDe(mascaraSeta(52, 44)));
    const distSetaVsGancho = distanciaHu(seta, gancho);
    const distSetaVsAnel = distanciaHu(seta, anel);
    const distGanchoVsAnel = distanciaHu(gancho, anel);

    expect(ruidoMesmaForma).toBeLessThan(distSetaVsGancho);
    expect(ruidoMesmaForma).toBeLessThan(distSetaVsAnel);
    expect(ruidoMesmaForma).toBeLessThan(distGanchoVsAnel);
  });
});

describe("melhorCorrespondencia — gating", () => {
  const refs: readonly SimboloReferencia[] = [
    { id: "entrada", hu: huDe(mascaraSeta(48, 48)) },
    { id: "saida", hu: huDe(mascaraGancho(28, 28)) },
    { id: "feito", hu: huDe(mascaraAneisComMarca(48, 48, 24)) },
  ];

  it("reconhece a forma mais próxima quando ela bate com uma referência", () => {
    const resultado = melhorCorrespondencia(
      mascaraSeta(46, 50),
      LADO,
      LADO,
      refs
    );

    expect(resultado?.id).toBe("entrada");
  });

  it("rejeita quando há tinta de menos (folha em branco / nada no quadro)", () => {
    const resultado = melhorCorrespondencia(mascaraVazia(), LADO, LADO, refs);
    expect(resultado).toBeNull();
  });

  it("rejeita quando há tinta demais (mão, folha inteira enquadrada)", () => {
    const cheia = mascaraVazia();
    cheia.fill(1);
    const resultado = melhorCorrespondencia(cheia, LADO, LADO, refs);
    expect(resultado).toBeNull();
  });

  it("rejeita quando não há nenhuma referência carregada", () => {
    const resultado = melhorCorrespondencia(
      mascaraSeta(48, 48),
      LADO,
      LADO,
      []
    );
    expect(resultado).toBeNull();
  });

  it("rejeita quando a melhor e a segunda melhor referência ficam ambíguas", () => {
    const ambiguas: readonly SimboloReferencia[] = [
      { id: "entrada", hu: huDe(mascaraSeta(48, 48)) },
      { id: "saida", hu: huDe(mascaraSeta(48, 48)) }, // deliberadamente idêntica
    ];

    const resultado = melhorCorrespondencia(
      mascaraSeta(48, 48),
      LADO,
      LADO,
      ambiguas
    );

    expect(resultado).toBeNull();
  });
});

describe("referenciasSimbolos — ambiente sem canvas", () => {
  it("degrada para lista vazia em vez de lançar quando não há <canvas> real (jsdom)", () => {
    expect(referenciasSimbolos()).toEqual([]);
  });
});
