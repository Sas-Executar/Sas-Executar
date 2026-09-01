import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { createWorker, OEM, PSM } from "tesseract.js";

const PALAVRAS = ["ENTRADA", "COPILOTO", "SELETOR", "FEITO", "SAIDA"];

test("reconhece os cinco símbolos em menos de três segundos", async (
  { page },
  testInfo
) => {
  await page.setContent(`
    <style>
      body { margin: 0; background: #f5f5f5; }
      #samples { display: grid; gap: 16px; padding: 24px; }
      .sample {
        box-sizing: border-box;
        display: grid;
        width: 480px;
        height: 320px;
        place-items: center;
        color: #000;
        background: #fff;
        border: 1px solid #bbb;
        font: 700 68px Arial, sans-serif;
      }
    </style>
    <div id="samples">
      ${PALAVRAS.map((palavra) => `<div class="sample">${palavra}</div>`).join("")}
    </div>
  `);

  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    cacheMethod: "none",
    langPath: resolve("node_modules/@tesseract.js-data/eng/4.0.0"),
  });
  await worker.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    tessedit_pageseg_mode: PSM.SINGLE_WORD,
    user_defined_dpi: "300",
  });

  const resultados = [];
  const amostras = page.locator(".sample");
  for (const [index, palavra] of PALAVRAS.entries()) {
    const imagem = await amostras.nth(index).screenshot();
    const inicio = performance.now();
    const reconhecimento = await worker.recognize(imagem);
    const latencyMs = Math.round(performance.now() - inicio);
    const text = reconhecimento.data.text.replace(/[^A-Z]/gi, "").toUpperCase();
    resultados.push({ expected: palavra, latencyMs, text });
  }
  await worker.terminate();

  await testInfo.attach("latencias-ocr.json", {
    body: JSON.stringify(resultados, null, 2),
    contentType: "application/json",
  });
  expect(resultados).toHaveLength(5);
  for (const resultado of resultados) {
    expect(resultado.text).toContain(resultado.expected);
    expect(resultado.latencyMs).toBeLessThan(3000);
  }
});
