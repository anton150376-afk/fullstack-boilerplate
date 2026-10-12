import { defineConfig } from "vitest/config";

// Глобы — явные пути к пакетам, а не маска "packages/*": конфиги дочерних
// пакетов не ищутся вверх по дереву (Vitest 5, см. грабля 12 задания), и
// явный список не даёт пакету молча выпасть из прогона. Каждый новый пакет
// или приложение с тестами добавляет сюда свою строку в том же коммите,
// где появляется его vitest.config.ts.
export default defineConfig({
  test: {
    projects: [
      "packages/tailwind-config",
      "packages/i18n",
      "packages/testing",
      "packages/storage",
      "packages/devtools",
      "packages/contract",
      "packages/api-client",
      "packages/ui-core",
      "packages/ui-web",
      "packages/admin-kit",
      "apps/server",
      "apps/web",
    ],
    coverage: {
      provider: "v8",
      // json-summary — машиночитаемый итог по каждому файлу, читает
      // apps/docs/scripts/generate.ts для страницы "Статус проекта"
      // (раздел "Фаза 10" задания, пункт 10.3: "покрытие по пакетам").
      reporter: ["text", "html", "json-summary"],
      // Раздел "Фаза 12" задания, пункт 12.1: пороги по фактическому
      // состоянию (прогон на 2026-10-09 — lines 79.53%, statements
      // 79.5%, functions 69.39%, branches 65.29%) с небольшим запасом,
      // не впритык — мелкие колебания покрытия не должны ронять гейт.
      // Плоский объект, не по шаблонам путей на пакет: Vitest 5 не
      // поддерживает per-glob пороги в режиме test.projects (рабочее
      // пространство), только единый порог на объединённый отчёт.
      // Правило «пороги не понижаются» — docs/guides/testing.md.
      thresholds: {
        lines: 75,
        statements: 75,
        functions: 65,
        branches: 60,
      },
    },
  },
});
