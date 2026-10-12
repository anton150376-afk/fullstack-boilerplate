import swc from "unplugin-swc";
import { defineProject } from "vitest/config";

export default defineProject({
  // esbuild (транспайлер Vite/Vitest по умолчанию) не эмитит
  // emitDecoratorMetadata — Nest DI резолвит конструкторные параметры
  // без явного @Inject() в undefined вместо нужного провайдера (найдено
  // гейтом test:coverage в Фазе 6, docs/BACKLOG.md). unplugin-swc — то,
  // что Nest сам рекомендует для Jest/Vitest вместо esbuild/ts-jest.
  plugins: [swc.vite()],
  test: {
    name: "server",
    environment: "node",
    // Таймауты подняты с 5 секунд: под полным гейтом параллельно идут tsc,
    // ESLint, Vitest и Jest, и тест, который в одиночку занимает 0,3 с, набирает
    // 5 с (openapi.e2e-spec, B-261008-openapi-test-flaky-under-load).
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ["src/**/*.spec.ts", "test/**/*.e2e-spec.ts", "test/**/*.integration-spec.ts"],
  },
});
