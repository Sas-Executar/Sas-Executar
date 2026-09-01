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
    ...devices["Desktop Chrome"],
  },
});
