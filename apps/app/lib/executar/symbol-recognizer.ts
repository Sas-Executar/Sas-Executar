/**
 * Reconhecimento visual dos 5 símbolos do Scanner (Entrada, Copiloto,
 * Seletor, Feito, Saída) — SEM QR e sem OCR/Tesseract (decisão do usuário,
 * 28/08/2026: "qr nao e fallback deve sair completamente"; "nao teserract").
 *
 * Por quê forma (Hu moments), não uma rede treinada:
 * - Os 5 alvos são um vocabulário fechado e conhecido — os próprios ícones
 *   `lucide-react` já usados em `admin-face.tsx`. Não existe hoje nenhum
 *   dataset de fotos reais desses símbolos impressos (só os SVGs). Treinar
 *   uma rede a partir só de renders sintéticos corre risco real de não
 *   generalizar para uma câmera de verdade (gap sim-to-real) — e a exigência
 *   do usuário é justamente precisão + velocidade "tão instantânea quanto um
 *   QR code, <3s". Reconhecimento de forma por momentos de Hu não precisa de
 *   dataset nem de etapa de treino: a própria geometria do ícone impresso
 *   (a mesma que sai na tela em `admin-face.tsx`) já é a referência.
 * - Momentos de Hu são invariantes a translação, escala e rotação por
 *   construção — cobre "a folha girada na mão de quem escaneia" sem busca
 *   de ângulo. O 7º momento preserva sinal e distingue pares espelhados
 *   (Entrada/Saída são o mesmo ícone invertido).
 * - O cálculo inteiro é soma de pixels sobre um recorte pequeno (uma ROI de
 *   ~64×64) — ordens de grandeza mais barato que decodificar um QR ou rodar
 *   qualquer rede neural, e sem dependência externa (sem WASM de visão
 *   computacional, sem peso de modelo para baixar).
 * - É auditável por um dev iniciante: um número de distância e um limiar,
 *   não pesos de uma rede. Ajustar sensibilidade é mudar uma constante aqui.
 *
 * QR não desaparece do Mapa-OS: continua servindo os destinos sem forma
 * fixa própria (tarefa do day card, documentos, jump do header) — ver
 * `mapa-os-projection.ts` e `scanner.ts`. Só os 5 símbolos administrativos
 * deixam de carregar QR.
 */

import type { AcaoScannerId } from "./mapa-os-projection.ts";

/** Mesmo peso de traço usado ao desenhar os ícones em `admin-face.tsx` — as
 * duas pontas (referência e impressão) precisam usar o mesmo valor, ou a
 * forma de referência diverge da forma realmente impressa. */
export const ESPESSURA_TRACO_ICONE = 2.25;

/** Lado do viewBox original dos ícones lucide (`0 0 24 24`). */
const VIEWBOX = 24;
/** Lado do raster usado para gerar a referência e para amostrar a câmera. */
const RASTER_SIZE = 64;

type NoIcone =
  | { readonly type: "path"; readonly d: string }
  | {
      readonly type: "rect";
      readonly height: number;
      readonly rx: number;
      readonly width: number;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: "circle";
      readonly cx: number;
      readonly cy: number;
      readonly r: number;
    };

/**
 * Definições copiadas de `lucide-react` (mesmos ícones usados em
 * `admin-face.tsx`: LogIn, Bot, SlidersHorizontal, CheckCircle2/CircleCheck,
 * LogOut) — só os nós de desenho, sem depender de React/DOM do lucide para
 * poder rasterizar num `<canvas>` puro.
 */
const ICONES: Record<AcaoScannerId, readonly NoIcone[]> = {
  entrada: [
    { type: "path", d: "m10 17 5-5-5-5" },
    { type: "path", d: "M15 12H3" },
    { type: "path", d: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" },
  ],
  copiloto: [
    { type: "path", d: "M12 8V4H8" },
    { type: "rect", x: 4, y: 8, width: 16, height: 12, rx: 2 },
    { type: "path", d: "M2 14h2" },
    { type: "path", d: "M20 14h2" },
    { type: "path", d: "M15 13v2" },
    { type: "path", d: "M9 13v2" },
  ],
  seletor: [
    { type: "path", d: "M10 5H3" },
    { type: "path", d: "M12 19H3" },
    { type: "path", d: "M14 3v4" },
    { type: "path", d: "M16 17v4" },
    { type: "path", d: "M21 12h-9" },
    { type: "path", d: "M21 19h-5" },
    { type: "path", d: "M21 5h-7" },
    { type: "path", d: "M8 10v4" },
    { type: "path", d: "M8 12H3" },
  ],
  feito: [
    { type: "circle", cx: 12, cy: 12, r: 10 },
    { type: "path", d: "m9 12 2 2 4-4" },
  ],
  saida: [
    { type: "path", d: "m16 17 5-5-5-5" },
    { type: "path", d: "M21 12H9" },
    { type: "path", d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" },
  ],
};

/** As 7 invariantes de Hu, já em escala log assinada (ver `vetorHu`). */
export type VetorHu = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface SimboloReferencia {
  readonly hu: VetorHu;
  readonly id: AcaoScannerId;
}

function criarContexto(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = RASTER_SIZE;
  canvas.height = RASTER_SIZE;
  return canvas.getContext("2d", { willReadFrequently: true });
}

function desenharIcone(ctx: CanvasRenderingContext2D, nos: readonly NoIcone[]) {
  const escala = RASTER_SIZE / VIEWBOX;

  ctx.clearRect(0, 0, RASTER_SIZE, RASTER_SIZE);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = ESPESSURA_TRACO_ICONE * escala;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setTransform(escala, 0, 0, escala, 0, 0);

  for (const no of nos) {
    ctx.beginPath();
    if (no.type === "path") {
      ctx.stroke(new Path2D(no.d));
      continue;
    }
    if (no.type === "rect") {
      ctx.roundRect(no.x, no.y, no.width, no.height, no.rx);
    } else {
      ctx.arc(no.cx, no.cy, no.r, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * Momentos de imagem sobre uma máscara binária (1 = tinta, 0 = fundo),
 * seguindo até 3ª ordem — o suficiente para as 7 invariantes de Hu.
 */
function momentos(mascara: Uint8Array, largura: number, altura: number) {
  let m00 = 0;
  let m10 = 0;
  let m01 = 0;

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const v = mascara[y * largura + x];
      if (!v) {
        continue;
      }
      m00 += 1;
      m10 += x;
      m01 += y;
    }
  }

  if (m00 === 0) {
    return null;
  }

  const xBarra = m10 / m00;
  const yBarra = m01 / m00;

  let mu20 = 0;
  let mu02 = 0;
  let mu11 = 0;
  let mu30 = 0;
  let mu03 = 0;
  let mu21 = 0;
  let mu12 = 0;

  for (let y = 0; y < altura; y++) {
    const dy = y - yBarra;
    for (let x = 0; x < largura; x++) {
      if (!mascara[y * largura + x]) {
        continue;
      }
      const dx = x - xBarra;
      mu20 += dx * dx;
      mu02 += dy * dy;
      mu11 += dx * dy;
      mu30 += dx * dx * dx;
      mu03 += dy * dy * dy;
      mu21 += dx * dx * dy;
      mu12 += dx * dy * dy;
    }
  }

  const normalizar = (mu: number, ordem: number) => mu / m00 ** (ordem / 2 + 1);

  return {
    m00,
    eta20: normalizar(mu20, 2),
    eta02: normalizar(mu02, 2),
    eta11: normalizar(mu11, 2),
    eta30: normalizar(mu30, 3),
    eta03: normalizar(mu03, 3),
    eta21: normalizar(mu21, 3),
    eta12: normalizar(mu12, 3),
  };
}

/**
 * As 7 invariantes clássicas de Hu (1962) — valores BRUTOS (sem log ainda).
 * O passo de comparação (`distanciaHu`) é quem decide como tratar magnitude
 * e proximidade de zero; manter os valores brutos aqui evita perder
 * informação que a comparação precisa (ver comentário em `distanciaHu`).
 */
export function vetorHu(
  mascara: Uint8Array,
  largura: number,
  altura: number
): VetorHu | null {
  const mo = momentos(mascara, largura, altura);
  if (!mo) {
    return null;
  }

  const { eta20, eta02, eta11, eta30, eta03, eta21, eta12 } = mo;

  const i1 = eta20 + eta02;
  const i2 = (eta20 - eta02) ** 2 + 4 * eta11 ** 2;
  const i3 = (eta30 - 3 * eta12) ** 2 + (3 * eta21 - eta03) ** 2;
  const i4 = (eta30 + eta12) ** 2 + (eta21 + eta03) ** 2;
  const i5 =
    (eta30 - 3 * eta12) *
      (eta30 + eta12) *
      ((eta30 + eta12) ** 2 - 3 * (eta21 + eta03) ** 2) +
    (3 * eta21 - eta03) *
      (eta21 + eta03) *
      (3 * (eta30 + eta12) ** 2 - (eta21 + eta03) ** 2);
  const i6 =
    (eta20 - eta02) * ((eta30 + eta12) ** 2 - (eta21 + eta03) ** 2) +
    4 * eta11 * (eta30 + eta12) * (eta21 + eta03);
  const i7 =
    (3 * eta21 - eta03) *
      (eta30 + eta12) *
      ((eta30 + eta12) ** 2 - 3 * (eta21 + eta03) ** 2) -
    (eta30 - 3 * eta12) *
      (eta21 + eta03) *
      (3 * (eta30 + eta12) ** 2 - (eta21 + eta03) ** 2);

  return [i1, i2, i3, i4, i5, i6, i7] as unknown as VetorHu;
}

/** Abaixo disto, uma invariante bruta é tratada como "estruturalmente zero"
 * (ex.: ícones com alguma simetria de eixo) — evita que ruído de câmera
 * nesse componente vire uma distância enorme só por causa do log. */
const HU_EPSILON = 1e-7;

/** sign(v) * -log10(max(|v|, epsilon)) — igual ao método I1 do OpenCV
 * `matchShapes`, com um piso que impede o log de estourar perto de zero. */
function logAssinado(valor: number): number {
  const absoluto = Math.max(Math.abs(valor), HU_EPSILON);
  const sinal = valor < 0 ? -1 : 1;
  return sinal * -Math.log10(absoluto);
}

/**
 * Distância entre dois vetores de Hu brutos. Cada componente vira log
 * assinado antes de comparar (mesma ideia do método I2 do OpenCV
 * `matchShapes`) — MAS quando as duas invariantes num componente já são
 * praticamente zero (comum em ícones com alguma simetria), o componente é
 * ignorado em vez de amplificado: log de valores perto de zero explode e não
 * carrega sinal de forma nenhum, só ruído de discretização.
 */
export function distanciaHu(a: VetorHu, b: VetorHu): number {
  let soma = 0;
  for (let i = 0; i < a.length; i++) {
    const ambosDesprezaveis =
      Math.abs(a[i]) < HU_EPSILON && Math.abs(b[i]) < HU_EPSILON;
    if (ambosDesprezaveis) {
      continue;
    }
    soma += Math.abs(logAssinado(a[i]) - logAssinado(b[i]));
  }
  return soma;
}

function gerarReferencias(ctx: CanvasRenderingContext2D): SimboloReferencia[] {
  const lista: SimboloReferencia[] = [];
  for (const id of Object.keys(ICONES) as AcaoScannerId[]) {
    desenharIcone(ctx, ICONES[id]);
    const imagem = ctx.getImageData(0, 0, RASTER_SIZE, RASTER_SIZE);
    const mascara = mascaraDeAlfa(imagem);
    const hu = vetorHu(mascara, RASTER_SIZE, RASTER_SIZE);
    if (hu) {
      lista.push({ id, hu });
    }
  }
  return lista;
}

let referencias: readonly SimboloReferencia[] | null = null;

/**
 * Gera (uma vez, lazy — nunca em SSR) o vetor de Hu de referência de cada um
 * dos 5 símbolos, rasterizando o mesmo desenho usado em `admin-face.tsx`.
 * Chamar só a partir de código de cliente (ex.: um `useEffect`).
 */
export function referenciasSimbolos(): readonly SimboloReferencia[] {
  if (referencias) {
    return referencias;
  }

  const ctx = criarContexto();
  if (!ctx) {
    return [];
  }

  // `Path2D` a partir de uma string SVG é suportado por todo navegador atual
  // com câmera (o que este recurso já exige), mas alguns ambientes de DOM
  // "de mentira" (jsdom em teste, engines antigas) expõem um contexto 2D sem
  // isso — falha fechada para lista vazia (Scanner cai de volta para "não
  // reconheceu") em vez de derrubar a página com uma exceção não tratada.
  let lista: SimboloReferencia[] = [];
  try {
    lista = gerarReferencias(ctx);
  } catch {
    return [];
  }

  referencias = lista;
  return referencias;
}

/** Extrai a máscara binária pelo canal alfa (traço opaco sobre fundo transparente) — usado ao gerar a referência. */
function mascaraDeAlfa(imagem: ImageData): Uint8Array {
  const mascara = new Uint8Array(imagem.width * imagem.height);
  for (let i = 0; i < mascara.length; i++) {
    mascara[i] = imagem.data[i * 4 + 3] > 0 ? 1 : 0;
  }
  return mascara;
}

/** Limiar de Otsu sobre um histograma de luminância 0–255 — separa tinta escura de papel claro sem depender de uma iluminação fixa. */
function limiarOtsu(histograma: Uint32Array, total: number): number {
  let somaTotal = 0;
  for (let i = 0; i < 256; i++) {
    somaTotal += i * histograma[i];
  }

  let somaFundo = 0;
  let pesoFundo = 0;
  let melhorVariancia = 0;
  let melhorLimiar = 128;

  for (let limiar = 0; limiar < 256; limiar++) {
    pesoFundo += histograma[limiar];
    if (pesoFundo === 0) {
      continue;
    }
    const pesoFrente = total - pesoFundo;
    if (pesoFrente === 0) {
      break;
    }

    somaFundo += limiar * histograma[limiar];
    const mediaFundo = somaFundo / pesoFundo;
    const mediaFrente = (somaTotal - somaFundo) / pesoFrente;
    const variancia = pesoFundo * pesoFrente * (mediaFundo - mediaFrente) ** 2;

    if (variancia > melhorVariancia) {
      melhorVariancia = variancia;
      melhorLimiar = limiar;
    }
  }

  return melhorLimiar;
}

/** Converte a ROI capturada da câmera (RGBA) numa máscara binária de tinta escura sobre papel claro, via Otsu. */
function mascaraDeLuminancia(imagem: ImageData): Uint8Array {
  const { width, height, data } = imagem;
  const luminancias = new Uint8ClampedArray(width * height);
  const histograma = new Uint32Array(256);

  for (let i = 0; i < luminancias.length; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const luminancia = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    luminancias[i] = luminancia;
    histograma[luminancia]++;
  }

  const limiar = limiarOtsu(histograma, luminancias.length);
  const mascara = new Uint8Array(luminancias.length);
  for (let i = 0; i < luminancias.length; i++) {
    mascara[i] = luminancias[i] <= limiar ? 1 : 0;
  }
  return mascara;
}

/**
 * Fração mínima/máxima de pixels de "tinta" na ROI para valer a pena
 * comparar contra os símbolos — descarta folha em branco, mão, ou a folha
 * inteira enquadrada, antes do cálculo de Hu.
 *
 * Os 5 ícones reais (traço 2.25, 24×24, rasterizados em 64×64) preenchem
 * entre ~65% e ~81% da própria caixa quando enquadrados rente — bem mais
 * "cheios" do que uma suposição ingênua de "ícone = traço fino e esparso"
 * sugeriria. O teto por isso fica em 0.92 (folga para borrão/compressão da
 * câmera), não perto de 0.5 — um teto apertado rejeitaria justamente as
 * capturas bem enquadradas, o pior tipo de bug aqui (nunca dispara mesmo
 * quando o usuário mira certo). Calibrado com
 * `verify-real-icons` (script de verificação, não versionado) sobre os
 * ícones reais — não é um chute.
 */
const FRACAO_TINTA_MIN = 0.05;
const FRACAO_TINTA_MAX = 0.92;
/**
 * Distância máxima aceitável entre a ROI e o melhor símbolo de referência, e
 * margem mínima até o segundo melhor. Calibrados contra a separação real
 * entre os 5 ícones (a menor separação par-a-par observada foi ~1.37, entre
 * Copiloto e Seletor) e o "ruído" esperado de uma mesma forma levemente
 * girada/reescalada (~0.6–1.0 em testes sintéticos de perturbação) — ambos
 * ficam deliberadamente conservadores: preferir "não reconheceu, tente de
 * novo" a executar a ação errada. Ajuste fino ainda depende de teste com
 * câmera real (papel impresso de verdade).
 */
const DISTANCIA_MAXIMA = 1.3;
const MARGEM_MINIMA = 0.25;

export interface ReconhecimentoSimbolo {
  readonly distancia: number;
  readonly id: AcaoScannerId;
}

/**
 * Núcleo puro do matching — sem canvas/DOM, só aritmética sobre uma máscara
 * binária já pronta e uma tabela de referências já calculada. Separado de
 * `reconhecerSimbolo` para poder ser testado com máscaras/referências
 * sintéticas (jsdom não tem `canvas`, então `referenciasSimbolos()` não
 * consegue rasterizar em ambiente de teste).
 */
export function melhorCorrespondencia(
  mascara: Uint8Array,
  largura: number,
  altura: number,
  refs: readonly SimboloReferencia[]
): ReconhecimentoSimbolo | null {
  if (refs.length === 0) {
    return null;
  }

  const fracaoTinta =
    mascara.reduce((total, valor) => total + valor, 0) / mascara.length;

  if (fracaoTinta < FRACAO_TINTA_MIN || fracaoTinta > FRACAO_TINTA_MAX) {
    return null;
  }

  const hu = vetorHu(mascara, largura, altura);
  if (!hu) {
    return null;
  }

  const distancias = refs
    .map((ref) => ({ id: ref.id, distancia: distanciaHu(hu, ref.hu) }))
    .sort((a, b) => a.distancia - b.distancia);

  const [melhor, segundo] = distancias;

  if (!melhor || melhor.distancia > DISTANCIA_MAXIMA) {
    return null;
  }

  if (segundo && segundo.distancia - melhor.distancia < MARGEM_MINIMA) {
    return null;
  }

  return melhor;
}

/**
 * Reconhece qual dos 5 símbolos (se algum) está na ROI capturada da câmera.
 * Retorna `null` quando não há tinta suficiente, tinta demais (provavelmente
 * não é um símbolo isolado), ou quando o melhor e o segundo melhor candidato
 * ficam ambíguos demais — nesses casos é melhor não responder do que
 * responder errado.
 */
export function reconhecerSimbolo(
  imagem: ImageData
): ReconhecimentoSimbolo | null {
  const mascara = mascaraDeLuminancia(imagem);
  return melhorCorrespondencia(
    mascara,
    imagem.width,
    imagem.height,
    referenciasSimbolos()
  );
}

export const RASTER_SIZE_RECONHECIMENTO = RASTER_SIZE;
