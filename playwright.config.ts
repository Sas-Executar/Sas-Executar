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
  // PR-10 "Performance Gate CI": os 3 projetos do plano "Scanner OCR-first
  // V2" — cada arquivo de teste cai em exatamente um, por nome de arquivo,
  // então rodar `playwright test tests/e2e/<arquivo>.spec.ts` continua
  // funcionando sem duplicar execução entre projetos.
  projects: [
    {
      // Benchmark estático de OCR (imagens paradas, sem câmera) — PR-08.
      name: "scanner-ocr-benchmark",
      testMatch: /scanner-ocr\.spec\.ts$/,
    },
    {
      // E2E de câmera falsa via getUserMedia (--use-fake-device-for-media-
      // stream) — PR-09.
      name: "scanner-camera-chromium",
      testMatch: /scanner-fake-camera\.spec\.ts$/,
    },
    {
      // Gate de regressão de performance (p50/p95/p99 + cold start) — PR-10.
      // Reservado também para futuros testes de regressão funcional (ex.:
      // independência de QR, PR-11) que não precisem dos flags de câmera.
      name: "scanner-regression",
      testMatch: /scanner-performance-gate\.spec\.ts$/,
    },
  ],
});
