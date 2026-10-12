import type { UserWorkspaceConfig } from "vitest/config";

// Пресет для пакетов и серверного кода: окружение node, без DOM.
// Подключается спредом в test своего vitest.config.ts, а не импортом
// целого конфига — так потребитель волен переопределить любое поле.
export const nodePreset = {
  environment: "node",
  // Таймауты подняты с 5 секунд: под полным гейтом параллельно идут tsc,
  // ESLint, Vitest и Jest (B-261008-openapi-test-flaky-under-load).
  testTimeout: 30_000,
  hookTimeout: 30_000,
} satisfies UserWorkspaceConfig["test"];
