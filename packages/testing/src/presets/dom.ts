import type { UserWorkspaceConfig } from "vitest/config";

// Пресет для DOM-тестов (apps/web, packages/ui-web): jsdom, а не happy-dom
// (решение агента Фазы 2 — ADR-0001, раздел "Четыре решения, оставленные
// агенту"). Потребителю нужен собственный devDependency на `jsdom`:
// Vitest резолвит окружение по имени из node_modules потребителя, а не
// этого пакета (isolated linker pnpm не хостит чужие зависимости).
export const domPreset = {
  environment: "jsdom",
  // Таймауты подняты с 5 секунд: под полным гейтом параллельно идут tsc,
  // ESLint, Vitest и Jest (B-261008-openapi-test-flaky-under-load).
  testTimeout: 30_000,
  hookTimeout: 30_000,
  setupFiles: ["@boilerplate/testing/setup/dom"],
} satisfies UserWorkspaceConfig["test"];
