#!/usr/bin/env node
/**
 * Gerador do corpus de fixtures OCR — PR-08 do plano "Scanner OCR-first
 * V2" (handoff §"OCR Fixture Corpus", nível L1: imagens estáticas).
 *
 * Sintetiza os 5 tokens administrativos (ENTRADA/COPILOTO/SELETOR/FEITO/
 * SAIDA) em variações que aproximam condições reais de captura — mesma
 * técnica já usada em `tests/e2e/scanner-ocr.spec.ts` (renderizar texto
 * numa página e tirar screenshot), sem precisar de fotos reais nem de uma
 * dependência nova: só `@playwright/test` (já presente) e o Chromium já
 * instalado neste ambiente.
 *
 * Roda uma vez para (re)gerar `tests/fixtures/scanner/**\/*.png` +
 * `manifest.json` — não faz parte da suíte de testes automatizada (os
 * arquivos gerados É que são versionados e consumidos pelos testes).
 *
 * Uso: `node apps/app/scripts/scanner/gerar-fixtures-ocr.mjs`
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const PALAVRAS = [
  { id: "entrada", label: "ENTRADA" },
  { id: "copiloto", label: "COPILOTO" },
  { id: "seletor", label: "SELETOR" },
  { id: "feito", label: "FEITO" },
  { id: "saida", label: "SAIDA" },
];

/**
 * Cada variação aproxima um eixo de degradação real de captura por
 * câmera (handoff: "distância/escala, perspectiva, contraste, blur").
 * `fontSizePx` simula distância/escala (fonte menor = alvo mais longe do
 * quadro), `rotateXDeg` simula perspectiva (câmera não perpendicular ao
 * cartão), `contrast`/`blur` simulam degradação óptica (tinta desbotada/
 * reflexo, e desfoque de movimento ou foco).
 */
const VARIACOES = [
  { blur: 0, contrast: 1, fontSizePx: 68, id: "base", rotateXDeg: 0 },
  {
    blur: 0,
    contrast: 1,
    fontSizePx: 34,
    id: "distancia-longe",
    rotateXDeg: 0,
  },
  {
    blur: 0,
    contrast: 1,
    fontSizePx: 112,
    id: "distancia-perto",
    rotateXDeg: 0,
  },
  { blur: 0, contrast: 1, fontSizePx: 68, id: "perspectiva", rotateXDeg: 28 },
  {
    blur: 0,
    contrast: 0.35,
    fontSizePx: 68,
    id: "contraste-baixo",
    rotateXDeg: 0,
  },
  { blur: 2.2, contrast: 1, fontSizePx: 68, id: "desfoque", rotateXDeg: 0 },
];

const LARGURA = 480;
const ALTURA = 320;

const DIR_FIXTURES = fileURLToPath(
  new URL("../../../../tests/fixtures/scanner/", import.meta.url)
);

function html({ blur, contrast, fontSizePx, label, rotateXDeg }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; }
      .card {
        box-sizing: border-box;
        display: grid;
        width: ${LARGURA}px;
        height: ${ALTURA}px;
        place-items: center;
        background: #fff;
        overflow: hidden;
      }
      .label {
        color: #000;
        font: 700 ${fontSizePx}px Arial, sans-serif;
        filter: contrast(${contrast}) blur(${blur}px);
        transform: perspective(520px) rotateX(${rotateXDeg}deg);
      }
    </style>
  </head>
  <body>
    <div class="card"><span class="label">${label}</span></div>
  </body>
</html>`;
}

async function main() {
  // `PLAYWRIGHT_CHROMIUM_PATH` só é necessário em ambientes com um binário
  // Chromium pré-instalado sob uma revisão diferente da que este
  // `@playwright/test` espera (ex.: este sandbox) — sem a variável, usa a
  // resolução padrão do Playwright (o caminho normal em CI/máquina local
  // depois de `npx playwright install`).
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });
  const page = await browser.newPage({
    viewport: { height: ALTURA, width: LARGURA },
  });

  const manifest = [];

  for (const palavra of PALAVRAS) {
    const dirPalavra = join(DIR_FIXTURES, palavra.id);
    await mkdir(dirPalavra, { recursive: true });

    for (const variacao of VARIACOES) {
      await page.setContent(html({ ...variacao, label: palavra.label }));
      const arquivo = `${variacao.id}.png`;
      await page.locator(".card").screenshot({
        path: join(dirPalavra, arquivo),
      });
      manifest.push({
        actionId: palavra.id,
        path: `${palavra.id}/${arquivo}`,
        variation: variacao.id,
      });
    }
  }

  await browser.close();

  await writeFile(
    join(DIR_FIXTURES, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  console.log(
    `Gerados ${manifest.length} fixtures (${PALAVRAS.length} palavras × ${VARIACOES.length} variações) em ${DIR_FIXTURES}`
  );
}

main();
