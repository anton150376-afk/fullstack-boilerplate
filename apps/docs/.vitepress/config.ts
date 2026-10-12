import { createRequire } from "node:module";

import { defineConfig } from "vitepress";

const require = createRequire(import.meta.url);

// Сайт документации (раздел "Фаза 10" задания, пункт 10.3) — конфиг
// живёт в apps/docs/.vitepress/ (не в docs/), потому что vitepress сам
// резолвит отсюда свой импорт через node_modules apps/docs — pnpm не
// хоистит его в docs/ (та папка не рабочее пространство). srcDir уводит
// фактическое содержимое в настоящий docs/ в корне репозитория:
// страницы порождаются из репозитория, а не пишутся отдельно для сайта.
//
// ignoreDeadLinks: ссылки в docs/ ведут и на код (.ts, .sh), и на файлы
// вне docs/ (AGENTS.md, CLAUDE.md в корне) — не
// страницы VitePress. Проверка внешних и внутренних ссылок уже есть
// отдельно (`pnpm check:docs`, lychee в .github/workflows/docs.yml) —
// дублировать её здесь не нужно.
export default defineConfig({
  title: "Boilerplate — документация",
  description: "Внутренняя документация монорепозитория (раздел «Фаза 10» задания, пункт 10.3).",
  srcDir: "../../docs",
  ignoreDeadLinks: true,
  lang: "ru-RU",
  cleanUrls: true,

  // Rollup резолвит "vue"/"vue/server-renderer" из markdown-файлов в
  // настоящем docs/ (srcDir — вне apps/docs), то есть от пути самого
  // markdown-файла, а не от vitepress — pnpm 11 (strict) там не видит
  // транзитивную зависимость vitepress на vue, даже когда vue объявлен
  // прямой зависимостью apps/docs (найдено настоящей сборкой — без алиаса
  // падает "Rollup failed to resolve import vue/server-renderer").
  vite: {
    resolve: {
      alias: [
        { find: /^vue\/server-renderer$/, replacement: require.resolve("vue/server-renderer") },
        { find: /^vue$/, replacement: require.resolve("vue") },
      ],
    },
  },

  themeConfig: {
    search: { provider: "local" },
    nav: [
      { text: "Карта", link: "/README" },
      { text: "Статус проекта", link: "/generated/project-status" },
      { text: "Пакеты и приложения", link: "/generated/packages-graph" },
      { text: "Модули ROADMAP", link: "/generated/modules-roadmap" },
      { text: "API", link: "/generated/api-reference" },
    ],
    sidebar: [
      { text: "Карта документации", link: "/README" },
      {
        text: "Сгенерировано из репозитория",
        items: [
          { text: "Статус проекта", link: "/generated/project-status" },
          { text: "Пакеты и приложения", link: "/generated/packages-graph" },
          { text: "Модули ROADMAP", link: "/generated/modules-roadmap" },
          { text: "Справочник API", link: "/generated/api-reference" },
        ],
      },
      {
        text: "architecture/",
        items: [
          { text: "overview", link: "/architecture/overview" },
          { text: "monorepo", link: "/architecture/monorepo" },
          { text: "data-flow", link: "/architecture/data-flow" },
          { text: "versions", link: "/architecture/versions" },
          { text: "original-task (архив)", link: "/architecture/original-task" },
        ],
      },
      {
        text: "modules/",
        items: [
          { text: "M1 — аутентификация", link: "/modules/M1-auth" },
          { text: "M2 — права и роли", link: "/modules/M2-permissions" },
          { text: "M3 — биллинг", link: "/modules/M3-billing" },
          { text: "M4 — уведомления", link: "/modules/M4-notifications" },
          { text: "M5 — наблюдаемость", link: "/modules/M5-observability" },
          { text: "M6 — развитие заложенного", link: "/modules/M6-development" },
          { text: "M7 — прочее", link: "/modules/M7-misc" },
        ],
      },
      {
        text: "packages/",
        items: [
          { text: "ui.md (паритет)", link: "/packages/ui" },
          { text: "devtools", link: "/packages/devtools" },
          { text: "admin-kit", link: "/packages/admin-kit" },
        ],
      },
      {
        text: "guides/",
        items: [
          { text: "onboarding", link: "/guides/onboarding" },
          { text: "trimming", link: "/guides/trimming" },
          { text: "docker", link: "/guides/docker" },
          { text: "bug-reports", link: "/guides/bug-reports" },
          { text: "testing", link: "/guides/testing" },
        ],
      },
      {
        text: "operations/",
        items: [
          { text: "env-vars", link: "/operations/env-vars" },
          { text: "ci", link: "/operations/ci" },
          { text: "mcp", link: "/operations/mcp" },
        ],
      },
      { text: "BACKLOG", link: "/BACKLOG" },
    ],
  },
});
