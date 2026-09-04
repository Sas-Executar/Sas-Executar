import { defineConfig, devices } from "@playwright/test";

/**
 * `PLAYWRIGHT_CHROMIUM_PATH` só é necessário em ambientes com um binário
 * Chromium pré-instalado sob uma revisão diferente da que esta versão de
 * `@playwright/test` espera (ex.: sandboxes de execução isolados) — sem a
 * variável, usa a resolução padrão do Playwright (o caminho normal em
 * CI/máquina local depois de `npx playwright install`).
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  expect: {
    timeout: 120_000,
  },
  fullyParallel: false,
  reporter: "line",
  retries: 0,
  timeout: 150_000,
  use: {
    ...devices["Desktop Chrome"],
    launchOptions: executablePath ? { executablePath } : undefined,
  },
});
