import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "testing",
    // По умолчанию node — большинство тестов этого пакета про фабрики и
    // сетевые моки, DOM им не нужен. Файл dom-smoke.test.ts переопределяет
    // окружение docblock-пометкой `// @vitest-environment jsdom`.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
