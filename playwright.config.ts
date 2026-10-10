import { defineConfig, devices } from "@playwright/test";

// A BASE_URL means a deployed target, so no local server is started.
const remote = process.env.BASE_URL;
const baseURL = remote ?? "http://localhost:3100";

// Workers inherit this env, so specs read the same admin key.
const adminKey = process.env.E2E_ADMIN_KEY ?? "e2e-key";
process.env.E2E_ADMIN_KEY = adminKey;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  // 3 s client poll + 1 s server cache + render: at least 3 polls.
  expect: { timeout: 10_000 },
  // Tests share one Redis prefix and one active poll, so run them in order.
  workers: 1,
  use: { baseURL },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: remote
    ? undefined
    : {
        command: "npx next dev -p 3100",
        url: baseURL,
        timeout: 120_000,
        env: {
          ...(process.env as Record<string, string>),
          REDIS_PREFIX: "e2e:",
          ADMIN_KEY: adminKey,
          SUPER_ADMIN_KEY: "e2e-super-key",
        },
      },
});
