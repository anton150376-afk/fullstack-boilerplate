<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# AGENTS.md

Коробочная основа: общий контракт API, общая фабрика запросов, общая
палитра, парные компоненты для веба и мобильного. Устройство целиком, одной
схемой — [docs/architecture/overview.md](docs/architecture/overview.md).

## Контракт работы

1. Перед правкой кода читать не нужно специально — применимые правила из
   `.claude/rules/*.md` подгружаются сами по путям файлов, которые
   затронуты.
2. Работа считается завершённой только после зелёного `pnpm gate` (хук
   `Stop` не даст закончить сессию раньше).
3. Недоделанное и обойдённое — в `docs/BACKLOG.md`, в том же коммите, где
   обнаружено.
4. Документация правится в том же коммите, что и код, который она
   описывает.
5. Решение с альтернативами — ADR в `docs/architecture/decisions/`, по
   шаблону `TEMPLATE.md`.

## Карта репозитория

| Каталог                                 | Назначение                                         | Документация                                    |
| --------------------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| `apps/server`                           | Nest, PostgreSQL, очереди Redis                    | `docs/apps/server.md`                           |
| `apps/web`                              | TanStack Start, `ui-web` (shadcn на Base UI)       | `docs/apps/web.md`                              |
| `apps/mobile`                           | Expo + Router, `ui-native` (Uniwind)               | `docs/apps/mobile.md`                           |
| `apps/docs`                             | Сайт документации (VitePress)                      | `docs/apps/docs.md`                             |
| `packages/contract`                     | oRPC-контракты на Zod — источник правды для типов  | `docs/packages/contract.md`                     |
| `packages/api-client`                   | Транспорт + TanStack Query через oRPC              | `docs/packages/api-client.md`                   |
| `packages/ui-core`/`ui-web`/`ui-native` | Варианты компонентов и их платформенные реализации | `docs/packages/ui.md` (паритет)                 |
| `packages/admin-kit`                    | Конструктор админки: реестр ресурсов, права        | `docs/packages/admin-kit.md`                    |
| `packages/devtools`                     | Багрепорт при разработке                           | `docs/packages/devtools.md`                     |
| `packages/storage`                      | Адаптер S3-совместимого хранилища                  | `docs/packages/storage.md`                      |
| `packages/typescript-config`            | Варианты `tsconfig.json`                           | `docs/packages/typescript-config.md`            |
| `packages/eslint-config`                | Flat-конфиги ESLint                                | `docs/packages/eslint-config.md`                |
| `packages/prettier-config`              | Форматирование и сортировка импортов               | `docs/packages/prettier-config.md`              |
| `packages/tailwind-config`              | Палитра, hex-зеркало, базовые стили                | `docs/packages/tailwind-config.md`              |
| `packages/i18n`                         | Локализация ru/en, формы числа                     | `docs/packages/i18n.md`                         |
| `packages/testing`                      | Пресеты Vitest, подмена сети, фабрики              | `docs/packages/testing.md`                      |
| `.claude/rules`                         | Правила, подгружаются по `paths`                   | этот файл, раздел ниже                          |
| `.claude/skills`                        | Процедуры (циклы работы)                           | `.claude/skills/<имя>/SKILL.md`                 |
| `scripts/`                              | Гейт и проверки                                    | `docs/operations/ci.md`                         |
| `docs/BACKLOG.md`                       | Остаток работ, риски                               | —                                               |
| `ROADMAP.md`                            | Модули, подключаемые позже                         | `docs/modules/*.md`, скилл `module-integration` |

## Команды на каждый день

```bash
pnpm install        # установка рабочей области
pnpm dev            # все приложения в режиме разработки
pnpm verify         # тот же гейт, что в CI и в хуке Stop
pnpm lint:fix       # автофикс линтера
pnpm format         # Prettier по всему репозиторию
pnpm --filter <pkg> <script>   # команда одного пакета, например test
```

`GATE_ALLOW=<шаг>=<B-ID>` пропускает один шаг гейта, если указанный пункт
`docs/BACKLOG.md` существует со статусом «Открыто» или «В работе» —
аварийный клапан, не способ отключить проверку навсегда (раздел
`.claude/rules/git.md`).

## Правила по месту

Полный список и `paths` — таблица в `.claude/rules/README.md`. Коротко:
`server.md` (апи), `contract.md` (контракт), `client.md` (клиент и
приложения), `ui.md` (компоненты), `i18n.md` (локализация), `admin.md`
(админка), `storage.md` (файлы), `queues.md` (очереди), `tests.md`
(тесты), `docs.md` (документация), `git.md` (коммиты и ветки, без
ограничения по `paths`).

## Когда неопределённость

Проверить документацию → сравнить варианты по критериям сравнения
библиотек (скилл `module-integration` — лицензия, статус проекта,
активность, зрелость, автобусный фактор, типизация, совместимость,
автономность, стоимость выхода, размер) → выбрать → записать ADR.
Остановиться и спросить, если: нужен платный аккаунт или внешний сервис с
биллингом; выбор меняет публичный контракт уже написанного кода;
требование противоречиво или невыполнимо на текущих версиях библиотек
(в этом случае сначала — пункт в `docs/BACKLOG.md`). Если спросить
некого — вариант с наименьшими необратимыми последствиями, ADR со
статусом «требует подтверждения», и продолжить.
