> **Зачем читать:** структура веб-приложения, как добавить страницу с
> загрузкой данных, как устроены связка с Query, язык и загрузка файлов.
> **Кому:** кто пишет интерфейс `apps/web`.
> **Последняя проверка:** 2026-10-08.

## Что это

TanStack Start (ветка 1.x) на Vite 8, файловая маршрутизация
`@tanstack/react-router`, Tailwind 4 + Base UI (`packages/ui-web`),
данные — только через `@boilerplate/api-client`. Структура:

```text
src/
├─ router.tsx          getRouter() — конвенция плагина, резолвится по имени
├─ routes/
│  ├─ __root.tsx        контекст (QueryClient), язык, <nav>
│  ├─ index.tsx         список заметок — показательный срез Фазы 4/5
│  ├─ files.tsx          загрузка файлов
│  └─ admin/index.tsx    заготовка под Фазу 8
├─ components/
│  └─ language-switcher.tsx
├─ lib/
│  ├─ api.ts            синглтон api-client
│  └─ language.ts        серверные функции чтения/записи cookie языка
└─ styles/app.css        Tailwind 4 + токены + custom-variant dark
```

## Контракт и фабрика запросов

`src/lib/api.ts` — один `createApiClient()` на модуль (до M1 клиент не
хранит ничего специфичного для запроса — `docs/packages/api-client.md`).
`createTanstackQueryUtils` даёт `queryOptions`/`mutationOptions`/`call`
на каждую процедуру `@boilerplate/contract`.

Загрузчик маршрута и компонент используют **один и тот же объект
опций**:

```tsx
export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.query(api.notes.list.queryOptions()),
  component: HomePage,
});

function HomePage() {
  const { data: notes } = useSuspenseQuery(api.notes.list.queryOptions());
  // ...
}
```

`queryClient.query(opts)` — не `fetchQuery`/`ensureQueryData`/`prefetchQuery`
(устаревшие, грабля 9 задания; линтер их не запрещает отдельным правилом,
но `@typescript-eslint/no-deprecated` ловит прямое использование).

### Связка с TanStack Query

`src/router.tsx`:

```ts
const queryClient = new QueryClient();
const router = createRouter({ routeTree, context: { queryClient }, defaultPreloadStaleTime: 0 });
setupRouterSsrQueryIntegration({ router, queryClient });
```

Новый `QueryClient` на каждый вызов `getRouter()`, не модульный
синглтон: на сервере это вызывается на каждый запрос — общий клиент
означал бы утечку кеша одного пользователя другому. `setupRouterSsrQueryIntegration`
сам ставит `QueryClientProvider` (через `router.options.Wrap`) и
дегидратацию/гидратацию — грабля 10 задания, `routerWithQueryClient`
в актуальной версии не существует, руками `dehydrate`/`hydrate` не
делать. **В тестах, которые строят роутер вручную (не через
`getRouter()`), этот вызов легко забыть** — без него `useSuspenseQuery`
падает с «No QueryClient set», найдено на `src/routes/index.test.tsx`.

## Токены и Tailwind 4

`src/styles/app.css` импортирует `tailwindcss`, затем
`@boilerplate/tailwind-config/theme.css` и `base.css`, затем
`@source` на исходники `ui-web`/`ui-core` (путями от самого CSS-файла —
Tailwind 4 не ходит по симлинкам pnpm, грабля 5 задания). Тёмная тема —
`@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))`,
переключатель — атрибут `data-theme` на `<html>` (пока не подключён в
интерфейсе: токены готовы, переключатель темы — ROADMAP этой фазы).

Семантические токены (`--color-surface`, `--color-primary`,
`--color-border`, …) зарегистрированы в `packages/tailwind-config/theme.css`
через `@theme inline` — без этого Tailwind не порождает для них классы
(`bg-primary`, `border-border`), только `var()`-доступ. Подробности и
история находки — `docs/packages/tailwind-config.md` и
`docs/BACKLOG.md` (`B-261008-tailwind-semantic-tokens-not-registered`).

`shadcn init -b base` (стиль `base-nova`) добавил СВОИ токены
(`--background`, `--card`, `--destructive`, `--sidebar-*`, `--chart-*`) —
они переведены на `var(--color-*)` из палитры в `:root`/`:root[data-theme="dark"]`
того же `app.css`, а НЕ оставлены литеральными значениями shadcn: смена
токена в `packages/tailwind-config` обязана менять вид веба без правок
здесь (критерий приёмки Фазы 6).

## Локализация

`src/lib/language.ts` — две серверные функции (`createServerFn`):
`getLanguage` читает cookie `lang` (`getCookie` из
`@tanstack/react-start/server`), `setLanguage` её пишет. Корневой
маршрут (`__root.tsx`) резолвит язык в `beforeLoad` (выполняется и на
сервере при SSR, и на клиенте при навигации) и создаёт `createI18n({
language })` из `@boilerplate/i18n` — новый экземпляр на значение
языка, не модульный синглтон (та же причина, что у `QueryClient`).

`LanguageSwitcher` (`src/components/language-switcher.tsx`) вызывает
`setLanguage` через `useServerFn` (не напрямую — raздел "Фаза 6"
задания, по образцу `react-start/SKILL.md`), затем `router.invalidate()`
— это перечитывает cookie через `beforeLoad`, а не полная перезагрузка
страницы.

Строки — только из каталогов `@boilerplate/i18n` (`useTranslation("notes")`
и так далее), не вшиты в компонент. Проверено `curl` с подменённым
cookie `lang=en` против настоящего SSR: заголовок, счётчик с русским
множественным числом (`count_one`/`_few`/`_many`/`_other`) и подпись
кнопки меняются корректно без перезагрузки процесса сервера.

## Файлы

`/files` — показательная страница: `FileUpload` из `packages/ui-web`
получает `requestTicket`/`confirmUpload` как пропсы, реализованные
здесь через `api.files.createUploadTicket.call(...)` и
`api.files.confirm.call(...)` (прямой вызов клиента оRPC, не через
`useMutation` — `FileUpload` запускает их сам, императивно).

## Админка

`/admin` (`src/routes/admin.tsx` — макет, `src/routes/admin/*.tsx` —
экраны) собирает конструктор из `packages/admin-kit`: реестр из двух
сущностей (`notes` и `tasks`), полный цикл список/создание/удаление
через `DataTable`/`ResourceForm`. Экран `tasks` (Фаза 12.3) целиком на
каталогах `@boilerplate/i18n` (`useTranslation("tasks")`) и имеет тест
`src/routes/admin/tasks.test.tsx`; экран `notes` держит строки буквально и
теста не имеет. Состояние системы на `/admin/system`
(`fetchHealthReady` из `packages/api-client` — прямой `fetch()` вне
этого пакета запрещён линтером). Поставщик прав — заглушка
`createAllowAllPermissions()` (M2, ROADMAP); `/admin/` сразу
перенаправляет на `/admin/notes`.

`router.autoCodeSplitting: true` в `vite.config.ts` делает каждый
маршрут отдельным чанком: `react-hook-form`/`@tanstack/react-table`
попадают только в `dist/client/assets/notes-*.js` (143 КБ), не в
главный бандл (`index-*.js`, 551 КБ до и после — разница только на
`NotFoundPage`, подключённый в `router.tsx`) — проверено реальной
сборкой и `grep` по строкам внутри чанков, не предположением.

## Сборка и запуск

```bash
pnpm --filter web dev      # vite dev, нужен apps/server на localhost:3000
pnpm --filter web build    # dist/client (статика) + dist/server/server.js
pnpm --filter web start    # node server-entry.mjs — поднимает server.js через srvx
```

**`dist/server/server.js` — не самостоятельный сервер.** Это
WHATWG-обработчик `{ fetch }`: в установленной версии
`@tanstack/react-start` нет Nitro и нет `.output/`, которые предполагал
бандловый `SKILL.md` пакета (`node .output/server/index.mjs`) — найдено
настоящей сборкой, не по документации (`docs/BACKLOG.md`,
`B-261008-start-no-dot-output`). `server-entry.mjs` поднимает его через
`srvx` (`serve({ fetch: server.fetch })`), версия зафиксирована той же,
что транзитивно тянет `@tanstack/start-server-core` (`0.11.22`), чтобы
в дереве не было двух расходящихся экземпляров.

## Docker

`Dockerfile` — тот же приём `turbo prune`, что у `apps/server`, цель
`web`. `VITE_API_URL` встраивается в клиентский бандл на этапе сборки
(`import.meta.env` — не рантайм-переменная Vite), поэтому передаётся
через `--build-arg`/`docker-compose.yml`'s `build.args`, не через
`environment`. `docker-compose.yml` — профиль `web` (не `app`, который
занят `server`/`worker`): можно поднять веб отдельно поверх уже
работающего API.

**Два адреса API.** Браузеру нужен публичный адрес (`VITE_API_URL`,
вшивается в бандл при сборке), серверному рендерингу внутри контейнера —
имя сервиса (`API_INTERNAL_URL`, читается из окружения контейнера в
рантайме). `src/lib/api-url.ts` выбирает адрес для клиента в
`src/lib/api.ts`: на сервере внутренний, если он задан, иначе публичный;
в браузере всегда публичный. `docker-compose.yml` задаёт
`API_INTERNAL_URL=http://server:3000` для профиля `web`. Выбор адреса
покрыт тестом (`api-url.test.ts`); работу в контейнере это не проверяет
(`B-261008-docker-unverified`). Вызовы `fetchHealthReady` в
`admin/system.tsx` и отправка багрепорта в `lib/bug-report.ts` идут
только из браузера, поэтому остаются на `VITE_API_URL`.

Образ `web` проверен в контейнере (Codespace, 2026-10-12): страница и статика клиента
отдаются, пять браузерных тестов проходят против контейнеров
(`scripts/compose-check.sh`, `docs/guides/docker.md`).

## Тесты

`src/routes/index.test.tsx` — `@testing-library/react` + настоящий
`createRouter`/`RouterProvider` (не изолированный рендер компонента:
`Route.useRouteContext()`/`Route.useLoaderData()` требуют реального
роутера). `fetch` подделан через `vi.hoisted()` до первого импорта
дерева маршрутов — `packages/api-client` захватывает ссылку на `fetch`
один раз при создании клиента, обычный `vi.stubGlobal` в `beforeEach`
был бы слишком поздним. `src/lib/language.ts` подделан целиком
(`vi.mock`) — в тесте нет настоящего сервера Start для серверных
функций. Проверено: рендер списка из фабрики запросов, состояние
ошибки маршрута (сервер вернул 500), переключатель языка.

Vitest 5 + jsdom (решение агента Фазы 2). `@testing-library/jest-dom`
расширяет типы `Assertion` только через подпуть `/vitest`, не из корня
пакета — `"types"` в `tsconfig.json` сабпути не резолвит, отсюда
`vitest-setup.d.ts` с side-effect импортом (тот же приём в `packages/ui-web`).

## Сквозные тесты

Playwright, настоящий браузер, `apps/web/e2e/` (раздел "Фаза 6" задания, пункт 11).
Не входят в `pnpm gate` (нужны браузер, Postgres и Redis); в CI — задача `e2e`.

| Файл                 | Что проверяет                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `tasks.spec.ts`      | `/admin/tasks`: создать → переключить → удалить; пустое название не отправляется                                              |
| `notes.spec.ts`      | главная: созданная заметка появляется в списке (база и очередь BullMQ)                                                        |
| `language.spec.ts`   | переключатель языка меняет интерфейс и держится после перезагрузки (cookie `lang`, серверная функция)                         |
| `system.spec.ts`     | `/admin/system`: база данных и Redis доступны (запрос из браузера на другой адрес)                                            |
| `bug-report.spec.ts` | кнопка «Сообщить о проблеме»: отчёт попадает в `.bugs/` и содержит `X-Request-Id` запроса к API; пустая форма не отправляется |

Запуск локально:

```bash
pnpm turbo run build --filter=server --filter=web   # веб — с VITE_ENABLE_BUG_REPORTS=true и VITE_API_URL
pnpm --filter server db:deploy                       # миграции в чистую базу
pnpm --filter web e2e:install                        # один раз: браузер Chromium
pnpm --filter web e2e                                # Playwright сам поднимает API и веб
```

Нужны переменные сервера (`DATABASE_URL`, `REDIS_URL`, `S3_*`) и
`CORS_ORIGINS=http://localhost:3001`. Свой браузер можно взять вместо
скачанного: `E2E_BROWSER_CHANNEL=msedge pnpm --filter web e2e`. Уже
запущенные API и веб используются повторно (вне CI).

Что тесты нашли в первый же запуск, чего не видели ни Vitest, ни сборка образа:

- `node server-entry.mjs` (он же в Docker-образе `web`) не отдавал `dist/client`:
  все `/assets/*` отвечали 404, страница приходила без стилей и без
  JavaScript и не гидратировалась. Исправлено `serveStatic` из `srvx/static`.
- У API не было CORS: браузер блокировал все запросы веба с другого адреса
  (создание задач, багрепорт, `/admin/system`). Исправлено `CORS_ORIGINS`
  (`docs/apps/server.md`, раздел «CORS»).

Контрольная проверка: без CORS на API падают 4 сценария из 7 (все, где браузер
ходит в API), остальные три проходят.

Особенности: `workers: 1` (общая база и каталог отчётов); чекбокс задачи
управляемый и меняется после ответа сервера, поэтому в тесте `click()` +
`toBeChecked()`, а не `check()`. Тест багрепорта читает `.bugs/` на диске, то есть
сервер должен работать на той же машине; созданный отчёт тест удаляет сам.

## Багрепорт

Плавающая кнопка `BugReportTrigger` (`src/components/bug-report-trigger.tsx`)
рендерится в `src/routes/__root.tsx` только при `VITE_ENABLE_BUG_REPORTS=true`.
Контекст (маршрут, сборка, платформа, буфер запросов, логи, трейл
действий, снимок TanStack Query) собирает `src/lib/bug-report.ts`; `git
SHA`/версия сборки вычисляет сам `vite.config.ts` через `git rev-parse`
и `npm_package_version`. Подробности — `docs/guides/bug-reports.md`.

## Частые ошибки

- Проверять версии и примеры API `@tanstack/react-start` по сайту —
  страница обзора называет проект Release Candidate, страница хостинга
  показывает мёртвый `app.config.ts` (грабля 11 задания). Бандловые
  `SKILL.md` пакетов точнее сайта, но и они могут отставать от
  установленной версии (`B-261008-start-router-autocodesplitting`,
  `B-261008-start-no-dot-output`) — при сомнении реальная сборка важнее
  любого источника документации.
- Строить тестовый роутер без `setupRouterSsrQueryIntegration` —
  `useSuspenseQuery` не найдёт `QueryClient`.
- `pnpm exec shadcn ...` в этой среде зависает без вывода — вызывать
  `node node_modules/shadcn/dist/index.js ...` напрямую.

## Ссылки

- [docs/packages/ui-web.md](../packages/ui-web.md), [ui-core.md](../packages/ui-core.md)
- [docs/packages/contract.md](../packages/contract.md), [api-client.md](../packages/api-client.md)
- [docs/guides/i18n.md](../guides/i18n.md), [styling.md](../guides/styling.md)
- `docs/BACKLOG.md` — все находки Фазы 6.
