import { defineConfig, devices } from "@playwright/test";

// Сквозные тесты в настоящем браузере (docs/apps/web.md, раздел «Сквозные
// тесты»). Запросы из браузера идут на API с другого адреса, чем веб, поэтому
// эти тесты ловят то, чего не видят ни Vitest, ни дымовая проверка API:
// CORS, куки, гидратацию на клиенте.
//
// Запуск: pnpm --filter web e2e (конфиг лежит здесь, в e2e/).
// Серверы поднимает сам Playwright (webServer) из собранных артефактов:
//   pnpm turbo run build --filter=server --filter=web   # веб — с VITE_ENABLE_BUG_REPORTS=true
// Нужны применённые миграции и переменные окружения сервера (DATABASE_URL,
// REDIS_URL, S3_*). Уже запущенные серверы используются повторно вне CI.
const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000";
const WEB_URL = process.env.E2E_WEB_URL ?? "http://localhost:3001";

// Вне CI используем уже запущенные серверы. В CI — только если их поднял
// scripts/compose-check.sh (контейнеры), тогда E2E_REUSE_SERVERS=true.
const reuseExistingServer = !process.env.CI || process.env.E2E_REUSE_SERVERS === "true";

export default defineConfig({
  testDir: ".",
  // Тесты делят одну базу данных и один каталог отчётов — по одному за раз.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    // Локально можно взять установленный браузер, не скачивая свой:
    // E2E_BROWSER_CHANNEL=msedge pnpm --filter web e2e
    channel: process.env.E2E_BROWSER_CHANNEL === "" ? undefined : process.env.E2E_BROWSER_CHANNEL,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node --conditions=compiled dist/main.js",
      cwd: "../../server",
      url: `${API_URL}/health/ready`,
      env: { PORT: new URL(API_URL).port, NODE_ENV: "development" },
      reuseExistingServer,
      timeout: 60_000,
    },
    {
      command: "node server-entry.mjs",
      cwd: "..",
      url: WEB_URL,
      env: { PORT: new URL(WEB_URL).port, NODE_ENV: "production" },
      reuseExistingServer,
      timeout: 60_000,
    },
  ],
});
