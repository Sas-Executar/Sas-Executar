import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: {
    timeout: 120_000,
  },
  fullyParallel: false,
  reporter: "line",
  retries: 0,
  timeout: 150_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "python3 -m http.server 4173 --directory .",
    reuseExistingServer: !process.env.CI,
    url: "http://127.0.0.1:4173",
  },
});
