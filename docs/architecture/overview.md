> **Зачем читать:** устройство решения целиком, одной схемой.
> **Кому:** все — первая страница для нового человека или агента.
> **Последняя проверка:** 2026-10-11.

## Что это

Монорепозиторий-основа: общий контракт API, общая фабрика запросов, общая
палитра и парные компоненты для веба и мобильного. Все 13 фаз исходного
задания ([docs/architecture/original-task.md](original-task.md)) выполнены —
эта страница описывает фактическое устройство, не целевую схему.

## Схема

```text
┌──────────────┐         ┌──────────────┐
│   apps/web    │         │  apps/mobile  │
│ TanStack Start│         │ Expo + Router │
│ ui-web (shadcn│         │ ui-native     │
│  на Base UI)  │         │  (Uniwind)    │
└───────┬───────┘         └───────┬───────┘
        │                         │
        │   packages/api-client   │
        │  (транспорт + TanStack  │
        │   Query через oRPC) +   │
        │  кольцевой буфер        │
        │  запросов для багрепорта│
        └───────────┬─────────────┘
                     │
           packages/contract
        (oRPC-контракты на Zod —
         источник правды для типов
         и для OpenAPI)
                     │
              apps/server (Nest)
        контроллер → сервис → репозиторий
                     │
        ┌────────────┼────────────┐
        │            │            │
   PostgreSQL      Redis       Хранилище
   (Prisma)      (BullMQ)    (S3-совместимое,
                              адаптер Garage)
```

Сквозные пакеты, не привязанные к одной стрелке на схеме:
`packages/tailwind-config` (палитра — токены читают и `ui-web`, и
`ui-native`), `packages/i18n` (каталоги — читают веб, мобильное и сервер),
`packages/ui-core` (варианты компонентов без привязки к платформе),
`packages/admin-kit` (конструктор админки — реестр ресурсов, таблица,
форма, права), `packages/testing` (пресеты Vitest, подмена сети),
`packages/devtools` (сбор контекста и маскирование для кнопки
«сообщить о проблеме»), `apps/docs` (сайт документации, VitePress,
страницы порождаются из репозитория).

## Три свойства, ради которых так

1. **Один фундамент для двух интерфейсов.** Контракт, клиент и палитра
   общие — изменение переносится в оба интерфейса механически, а не
   пишется дважды.
2. **Механизм согласованности, который нельзя обойти.** `pnpm gate`
   (раздел "Механизм согласованности" ниже) объединяет линтер, типы,
   тесты и проверки документации в одну команду, обязательную и локально,
   и в CI.
3. **Заготовленные места для будущих модулей.** Аутентификация, права,
   биллинг и уведомления подключаются по единой процедуре
   (`.claude/skills/module-integration/SKILL.md`, [ROADMAP.md](../../ROADMAP.md))
   без переделки фундамента — три точки уже существуют:
   `onUnauthorized` в `api-client`, `PermissionsProvider` в `admin-kit`,
   приёмники `BugReportReceiver` в `devtools`.

## Механизм согласованности

```text
AGENTS.md              всегда в контексте: репозиторий, карта, контракт работы
  CLAUDE.md             одна строка — @AGENTS.md
.claude/rules/*.md       подгружаются по paths, когда агент касается файлов
.claude/skills/*         процедуры, подгружаются по вызову
pnpm gate                одна команда: формат, линтер, типы, проверки, тесты
```

Подробности — [decisions/ADR-0001-stack.md](decisions/ADR-0001-stack.md)
(версии и выбор стека) и [docs/operations/ci.md](../operations/ci.md)
(то же самое в CI — `.github/workflows/ci.yml`, не прогонялось вживую,
нет `git remote`, `docs/BACKLOG.md`, `B-261008-no-remote-repo`).

## Требование задания → где выполнено

| Требование                                                                                       | Фаза        | Где                                                                                                                  |
| ------------------------------------------------------------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| Монорепозиторий на turborepo и pnpm                                                              | 1           | `pnpm-workspace.yaml`, `turbo.json`                                                                                  |
| Общие пакеты ESLint, Prettier, Tailwind 4 с единой палитрой                                      | 2           | `packages/eslint-config`, `packages/prettier-config`, `packages/tailwind-config`                                     |
| Агентские файлы: `AGENTS.md`, правила, бэклог, `.mcp.json`, `.claude/`                           | 3           | `AGENTS.md`, `.claude/rules`, `.claude/skills`, `docs/BACKLOG.md`, `.mcp.json`                                       |
| `.vscode` с `tasks.json`, `settings.json`, `extensions.json`                                     | 3           | `.vscode/`                                                                                                           |
| Общая система тестов на Vitest (с отступлением для `apps/mobile`)                                | 1, 4–8      | `vitest.config.ts` (корень, `test.projects`), [guides/testing.md](../guides/testing.md) — граница с Jest             |
| Система развития документации в `docs/*`, читаемая человеком                                     | 3, далее    | `docs/README.md` — карта; каждая страница: Зачем читать/Кому/Последняя проверка                                      |
| Механизм согласованности: код, тесты, линтер, дока, остаток работ                                | 3, 9, 13    | `scripts/done-gate.sh` (`pnpm gate`/`gate:full`), `scripts/check-*.ts`                                               |
| Действия сборки и тестов в `.github`                                                             | 10          | `.github/workflows/ci.yml`, `docker.yml`, `docs.yml`, `mobile.yml`, `release.yml`, `claude.yml`                      |
| Сервер: TypeScript, Nest, PostgreSQL, очереди Redis, Docker, health                              | 4           | `apps/server` — Nest 12, Prisma 7, BullMQ, `apps/server/Dockerfile`, `/health/live`, `/health/ready`                 |
| Веб: TypeScript, React, семейство TanStack, фабрика запросов, shadcn на Base UI, Docker          | 5, 6        | `apps/web` — TanStack Start/Router/Query, `packages/ui-web`, `apps/web/Dockerfile`                                   |
| Мобильное: TypeScript, React Native, Expo, Expo Router, Uniwind, фабрика запросов, веб-развёртка | 5, 7        | `apps/mobile` — Expo SDK 57, `packages/ui-native`, `expo export -p web`, `apps/mobile/Dockerfile`                    |
| Однотипный фундамент интерфейсных приложений                                                     | 5, 6, 7     | `packages/contract`, `packages/api-client`, `packages/ui-core` — общий слой под обоими приложениями                  |
| Типовое решение для админок: конструктор и демонстрация                                          | 8           | `packages/admin-kit` — `defineResource`, `DataTable`, `ResourceForm`, `AdminLayout`, `PermissionsProvider`           |
| Локализация интерфейсов, русский и английский                                                    | 2, 6, 7     | `packages/i18n` — каталоги по доменам, четыре формы числа для русского, [guides/i18n.md](../guides/i18n.md)          |
| Загрузка файлов в S3-совместимое хранилище                                                       | 4, 6, 7     | `packages/storage` — адаптер на четыре метода, подписанные формы POST, [packages/storage.md](../packages/storage.md) |
| Багрепорт при разработке                                                                         | 9           | `packages/devtools`, `/dev/bug-reports`, [guides/bug-reports.md](../guides/bug-reports.md)                           |
| Параллельная работа нескольких человек                                                           | 7, 3, 4, 10 | `CONTRIBUTING.md`, `docker-compose.override.yml.example`, миграции по одной на pull request                          |
| Закрытый сайт документации с картой модулей                                                      | 10          | `apps/docs` (VitePress), [apps/docs.md](../apps/docs.md) — деплой по SSH не настроен, нет целевого хоста             |
| Создание нового проекта из коробки                                                               | 12          | `scripts/init-project.ts`, [guides/trimming.md](../guides/trimming.md)                                               |
| ROADMAP модулей с единой процедурой выполнения                                                   | 11, 15, 16  | [ROADMAP.md](../../ROADMAP.md), `docs/modules/*.md`, `.claude/skills/module-integration/SKILL.md`                    |

Отступления от исходного задания, принятые осознанно и обоснованные
исследованием: вместо `react-query-kit` используются штатные утилиты
TanStack Query через oRPC; тесты `apps/mobile`/`packages/ui-native` идут
на Jest, а не на Vitest ([guides/testing.md](../guides/testing.md)).

## Сквозная проверка шаблона (п. 12.3 задания)

Проверка: провести одну функциональность через все слои. Взята сущность
«Задачи» (список, создание, переключатель «сделано», удаление) — отдельная
от показательных «Заметок».

Что проведено: схема в `packages/contract` → модель Prisma и модуль
`apps/server/src/tasks` → строки в `packages/i18n` (ru и en, четыре формы
числа для русского) → ресурс и экран `/admin/tasks` в вебе → экран `/tasks`
в мобильном → страницы документации → пункты бэклога. Тесты по слоям:
контракт (`tasks.contract.test.ts`), сервис (`tasks.service.spec.ts`),
маршрутизация контракта (`test/tasks.e2e-spec.ts`), веб
(`admin/tasks.test.tsx`), мобильный (`src/tasks-screen.test.tsx`, Jest).

Замер времени, по меткам файлов и коммитов:

| Этап                                                                   | Когда                   | Длительность   |
| ---------------------------------------------------------------------- | ----------------------- | -------------- |
| Код всех слоёв, от контракта до экранов, без единого прогона тестов    | 2026-10-09, 12:47–13:04 | около 17 минут |
| Первый прогон гейта: найден баг в `admin-kit`, исправлен, документация | 2026-10-11              | одна сессия    |

Критерий задания («день — решение работает, три дня — в фундаменте
трение») этим замером ни подтверждён, ни опровергнут: первый вариант
написан быстро, но до первого прогона гейта прошло два дня, и сам прогон
сразу нашёл трение. Время в таблице не включает паузу между этапами.

Найденное трение:

1. **Звёздочка обязательного поля внутри `<label>`** ломала поиск поля по
   видимой подписи. Исправлено в `packages/admin-kit`, подробности —
   [packages/admin-kit.md](../packages/admin-kit.md). Без прикладного
   теста экрана ошибка оставалась невидимой: у `admin/notes.tsx` теста нет.
2. **Вшитые строки гейт не ловит.** Задание обещает проверку правилом и
   скриптом, но гейт прошёл зелёным с литералом «Удалить» в экране задач.
   Открыто: `B-261011-hardcoded-ui-strings`.
3. **Живой запуск невозможен на машине сборки.** Нет Postgres, поэтому у
   `tasks` нет миграции, а нет браузера и устройства, поэтому экраны не
   открывались вручную. Открыто: `B-261011-tasks-unverified-live`.
4. **Файл теста экрана нельзя класть в `src/app/` мобильного.** Expo Router
   сделает его маршрутом. Правило записано в [apps/mobile.md](../apps/mobile.md).
5. **Сбой воркеров в полном прогоне.** Один раз `web:test` в полном гейте
   завершился с `Worker exited unexpectedly with exit code 143` на двух
   файлах. Повторный полный прогон прошёл. Причина не установлена; класс
   проблемы описан в `B-261008-openapi-test-flaky-under-load`.

## Куда идти дальше

- [architecture/monorepo.md](monorepo.md) — границы пакетов, правила зависимостей.
- [architecture/data-flow.md](data-flow.md) — путь запроса от интерфейса до БД.
- [guides/onboarding.md](../guides/onboarding.md) — от клона до запуска, по шагам.
- [guides/trimming.md](../guides/trimming.md) — как выкинуть лишнее при старте нового проекта.
- [ROADMAP.md](../../ROADMAP.md) — что подключается дальше и как.
