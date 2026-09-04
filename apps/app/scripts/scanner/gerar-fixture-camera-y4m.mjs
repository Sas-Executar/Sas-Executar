#!/usr/bin/env node
/**
 * Gerador do fixture de vídeo (câmera falsa) — PR-09 do plano "Scanner
 * OCR-first V2" (handoff §"Playwright Fake Camera", nível L2). Sintetiza
 * uma sessão de captura contínua ciclando pelos 5 tokens administrativos
 * (ENTRADA/COPILOTO/SELETOR/FEITO/SAIDA), cada um sustentado por alguns
 * segundos e separado por um intervalo "em branco" (token fora do
 * quadro) — para `--use-file-for-fake-video-capture` do Chromium, que só
 * aceita `.y4m` ou `.mjpeg`.
 *
 * Sem dependência de ffmpeg: o `ffmpeg` empacotado neste ambiente
 * (`/opt/pw-browsers/ffmpeg-*`) é uma build mínima específica do
 * Playwright (só grava `.webm` via VP8, para o recurso de vídeo de teste)
 * — não tem o muxer `yuv4mpegpipe`. Em vez disso, este script desenha
 * cada quadro num `<canvas>` real via Playwright (mesma técnica já usada
 * em `gerar-fixtures-ocr.mjs`), extrai os pixels RGBA crus com
 * `getImageData` e escreve o container Y4M (cabeçalho + `FRAME` +
 * planos Y/U/V em I420) manualmente — formato simples o bastante para não
 * precisar de biblioteca nenhuma.
 *
 * Uso: `node apps/app/scripts/scanner/gerar-fixture-camera-y4m.mjs`
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

// Resolução deliberadamente pequena (bem abaixo de uma webcam real) — é
// um fixture binário versionado no repositório, e o objetivo é provar a
// fiação ponta-a-ponta, não realismo de captura (isso pertence a fotos
// reais, fora do escopo do que este sandbox consegue produzir).
const LARGURA = 320;
const ALTURA = 240;
const FPS = 1;
const QUADROS_TOKEN = 3; // 3s a 1fps — tempo de sobra pro consenso confirmar.
const QUADROS_BRANCO = 3; // 3s — margem confortável pro observador de lock-clear (3 quadros ausentes) destravar antes do próximo token aparecer.
// Branco inicial bem mais longo que os demais — absorve o aquecimento do
// worker OCR + setup do getUserMedia no teste (handoff §4: câmera só deve
// "importar" depois do worker pronto), pra "entrada" ser confiavelmente
// o primeiro reconhecimento amostrado, não uma corrida contra o relógio.
const QUADROS_BRANCO_INICIAL = 8;

const PALAVRAS = ["ENTRADA", "COPILOTO", "SELETOR", "FEITO", "SAIDA"];

const DIR_SAIDA = fileURLToPath(
  new URL("../../../../tests/fixtures/scanner-camera/", import.meta.url)
);
const ARQUIVO_SAIDA = join(DIR_SAIDA, "sessao-cinco-acoes.y4m");

/**
 * Desenha um quadro (fundo branco + rótulo opcional, centralizado, numa
 * fração realista do quadro — não preenchendo tudo, como um cartão físico
 * visto a alguma distância) e devolve os pixels RGBA crus.
 */
async function capturarQuadro(page, label) {
  const base64 = await page.evaluate(
    ({ altura, labelTexto, largura }) => {
      const canvas = document.querySelector("canvas");
      const contexto = canvas.getContext("2d");
      // Cinza médio, não branco — depois do filtro grayscale+contrast(1.65)
      // real do OCR (roi-preprocessor.ts), um fundo próximo do branco puro
      // estoura o teto de luminância de `avaliarQualidadeFrame`
      // (exposicao_inadequada) mesmo sem nenhum texto no quadro. #969696
      // (150,150,150) sobrevive ao boost de contraste dentro da faixa
      // aceita nos dois casos (com e sem token no quadro).
      contexto.fillStyle = "#969696";
      contexto.fillRect(0, 0, largura, altura);

      if (labelTexto) {
        contexto.save();
        contexto.fillStyle = "#000";
        // 36px — abaixo disso (medido empiricamente) a cobertura de tinta
        // do texto fica abaixo dos 3% mínimos de `possuiForegroundMinimo`
        // (frame-quality.ts) mesmo com o texto perfeitamente legível a
        // olho nu; o gate de presença assume um token ocupando uma fração
        // maior do quadro do que "legível" por si só garante.
        contexto.font = "700 36px Arial, sans-serif";
        contexto.textAlign = "center";
        contexto.textBaseline = "middle";
        contexto.fillText(labelTexto, largura / 2, altura / 2);
        contexto.restore();
      }

      const { data } = contexto.getImageData(0, 0, largura, altura);
      let binario = "";
      const tamanhoBloco = 32_768;
      for (let i = 0; i < data.length; i += tamanhoBloco) {
        binario += String.fromCharCode(...data.subarray(i, i + tamanhoBloco));
      }
      return btoa(binario);
    },
    { altura: ALTURA, labelTexto: label ?? null, largura: LARGURA }
  );

  return Buffer.from(base64, "base64");
}

/** RGBA (4 bytes/pixel) → I420 planar (Y inteiro, U/V subamostrados 4:2:0), BT.601 faixa completa. */
function rgbaParaI420(rgba, largura, altura) {
  const y = Buffer.alloc(largura * altura);
  const metadeLargura = largura / 2;
  const metadeAltura = altura / 2;
  const u = Buffer.alloc(metadeLargura * metadeAltura);
  const v = Buffer.alloc(metadeLargura * metadeAltura);

  for (let linha = 0; linha < altura; linha += 1) {
    for (let coluna = 0; coluna < largura; coluna += 1) {
      const indiceRgba = (linha * largura + coluna) * 4;
      const r = rgba[indiceRgba];
      const g = rgba[indiceRgba + 1];
      const b = rgba[indiceRgba + 2];
      y[linha * largura + coluna] = Math.round(
        0.299 * r + 0.587 * g + 0.114 * b
      );
    }
  }

  for (let linhaBloco = 0; linhaBloco < metadeAltura; linhaBloco += 1) {
    for (let colunaBloco = 0; colunaBloco < metadeLargura; colunaBloco += 1) {
      let somaCb = 0;
      let somaCr = 0;

      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          const linha = linhaBloco * 2 + dy;
          const coluna = colunaBloco * 2 + dx;
          const indiceRgba = (linha * largura + coluna) * 4;
          const r = rgba[indiceRgba];
          const g = rgba[indiceRgba + 1];
          const b = rgba[indiceRgba + 2];
          somaCb += -0.168_736 * r - 0.331_264 * g + 0.5 * b + 128;
          somaCr += 0.5 * r - 0.418_688 * g - 0.081_312 * b + 128;
        }
      }

      const indice = linhaBloco * metadeLargura + colunaBloco;
      u[indice] = Math.round(somaCb / 4);
      v[indice] = Math.round(somaCr / 4);
    }
  }

  return Buffer.concat([y, u, v]);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage({
    viewport: { height: ALTURA, width: LARGURA },
  });
  await page.setContent(
    `<canvas width="${LARGURA}" height="${ALTURA}"></canvas>`
  );

  const timeline = [
    { contagem: QUADROS_BRANCO_INICIAL, label: null },
    ...PALAVRAS.flatMap((label) => [
      { contagem: QUADROS_TOKEN, label },
      { contagem: QUADROS_BRANCO, label: null },
    ]),
  ];

  await mkdir(DIR_SAIDA, { recursive: true });

  const cabecalho = `YUV4MPEG2 W${LARGURA} H${ALTURA} F${FPS}:1 Ip A1:1 C420jpeg\n`;
  const partes = [Buffer.from(cabecalho, "ascii")];
  let totalQuadros = 0;

  for (const segmento of timeline) {
    const rgba = await capturarQuadro(page, segmento.label);
    const i420 = rgbaParaI420(rgba, LARGURA, ALTURA);

    for (let i = 0; i < segmento.contagem; i += 1) {
      partes.push(Buffer.from("FRAME\n", "ascii"), i420);
      totalQuadros += 1;
    }
  }

  await browser.close();
  await writeFile(ARQUIVO_SAIDA, Buffer.concat(partes));

  console.log(
    `Gerado ${ARQUIVO_SAIDA} — ${totalQuadros} quadros a ${FPS}fps (~${(totalQuadros / FPS).toFixed(1)}s), ${LARGURA}x${ALTURA}.`
  );
}

main();
