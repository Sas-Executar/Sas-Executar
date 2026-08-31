import { expect, test } from "@playwright/test";

interface ResultadoOcr {
  readonly expected: string;
  readonly latencyMs: number;
  readonly passed: boolean;
  readonly text: string;
}

test("reconhece os cinco símbolos em menos de três segundos", async ({
  page,
}) => {
  await page.goto("/tests/e2e/scanner-ocr-playwright.html");
  await expect(page.locator("#status")).toHaveAttribute("data-result", "pass");

  const resultados = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __scannerOcrResult: ResultadoOcr[];
        }
      ).__scannerOcrResult
  );

  expect(resultados).toHaveLength(5);
  expect(resultados.every(({ latencyMs }) => latencyMs < 3000)).toBe(true);
  expect(resultados.map(({ expected }) => expected)).toEqual([
    "ENTRADA",
    "COPILOTO",
    "SELETOR",
    "FEITO",
    "SAIDA",
  ]);
});
