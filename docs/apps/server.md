> **Зачем читать:** структура сервера, как добавить модуль, как работают миграции и очереди.
> **Кому:** кто пишет серверный код.
> **Последняя проверка:** 2026-10-11.

> Страница пишется по ходу Фазы 4 — разделы появляются вместе с кодом,
> который описывают.

## Что это

Nest 12 на адаптере Express, ESM (`"type": "module"`, `moduleResolution:
"nodenext"`). Структура модулями вертикальными срезами:
`module/{controller,service,repository,dto,spec}` — видно на `src/notes/`.

## Конфигурация

`src/config/env.schema.ts` — схема Zod; сервер падает при старте с
понятным сообщением, если переменная отсутствует или не того формата.
Список переменных — `docs/operations/env-vars.md` (появится вместе с
`.env.example` в этой же фазе).

## Запуск

| Команда                             | Что делает                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm --filter server dev`          | HTTP-процесс из исходников: `node --watch-path=src --import @swc-node/register/esm-register`         |
| `pnpm --filter server dev:worker`   | то же для воркера очередей                                                                           |
| `pnpm --filter server build`        | `tsc -p tsconfig.build.json` — `dist/` сервера; перед этим turbo собирает `dist/` пакетов воркспейса |
| `pnpm --filter server start`        | `node --conditions=compiled dist/main.js` — то, что запускает Docker-образ                           |
| `pnpm --filter server start:worker` | `node --conditions=compiled dist/queue/worker.js`                                                    |

Два режима нужны из-за устройства монорепозитория
([docs/architecture/monorepo.md](../architecture/monorepo.md#условие-compiled)):

- **Разработка.** Загрузчик `@swc-node/register` компилирует TypeScript на
  лету и **эмитит `emitDecoratorMetadata`**. Внедрение зависимостей Nest без
  этих метаданных молча не работает (конструкторные параметры без
  `@Inject()` приходят `undefined`), поэтому `tsx` (esbuild) здесь не
  годится — тот же довод, что у `unplugin-swc` в `vitest.config.ts`.
- **Продакшен.** Пакеты воркспейса (`contract`, `storage`, `devtools`)
  по умолчанию отдают сырой TypeScript, и обычный `node dist/main.js` падал
  на первом же импорте контракта. Флаг `--conditions=compiled` включает
  в их `exports` ветку `compiled` → `dist/*.js`. Защищают от возврата
  `pnpm check:runtime` (гейт) и задача `smoke` в CI
  ([docs/operations/ci.md](../operations/ci.md)).

Дымовая проверка запущенного сервера — `bash scripts/smoke-api.sh [адрес]`
(20 проверок: здоровье, цикл задач, типизированные ошибки, заметка с
постановкой в очередь, OpenAPI, цепочка багрепорта по `X-Request-Id`).
Нужны применённые миграции и `NODE_ENV=development`.

## CORS

Браузер блокирует ответ API, если страница загружена с другого адреса (веб на
:3001, API на :3000), а в ответе нет `Access-Control-Allow-Origin`. Сервер при
этом отвечает 200, и в его журнале ничего не видно. Поэтому
`src/common/cors.ts` (`createCorsOptions`), подключённый в `main.ts`, разрешает
адреса из `CORS_ORIGINS` (через запятую, без пути и слэша в конце;
`docs/operations/env-vars.md`). Пустой список оставляет CORS выключенным —
верно, когда веб и API отдаются с одного адреса.

Ответ открывает странице заголовок `X-Request-Id` (`exposedHeaders`): без этого
`packages/api-client` не видит идентификатор в чужом источнике, и журнал
запросов в багрепорте остаётся без него. Куки не используются
(аутентификации нет), поэтому `credentials` выключены. Проверено
`test/cors.e2e-spec.ts` (предварительный `OPTIONS`, заголовки, чужой адрес,
выключенный CORS) и сквозными тестами в браузере (`apps/web/e2e`).

## Логи

`nestjs-pino` (`src/logger/pino-options.ts`, общие для HTTP-процесса и
воркера). Идентификатор запроса выдаёт `genReqId` (`generateRequestId`):
UUID либо входящий заголовок `X-Request-Id`, если он соответствует
`^[A-Za-z0-9._-]{1,128}$`; он же уходит в заголовок ответа — по нему
находятся записи конкретного запроса (замыкание на багрепорт, Фаза 9).
Заголовок ставится в `genReqId`, до обработчиков: отдельное промежуточное
звено в `main.ts` падало с 500 на любом маршруте (pino-http подменяет
`res.setHeader`). Токены, пароли и `refreshToken` редактируются в логе
безусловно (`redact` в pino, не частичная маскировка).

Ошибки обработчиков oRPC не попадают в журнал сами: `ORPCModule.forRoot`
получает перехватчик `onError` (`src/common/orpc-error-logging.ts`,
`logOrpcError`). Он пишет в лог ошибки со статусом 500 и выше вместе со
стеком и **не** пишет ожидаемые `ORPCError` с кодами 4xx (валидация,
«не найдено»). Без него 500 приходил клиенту, а в журнале не было ни
строки.

## База данных

Prisma 7 (`prismaSchemaFolder`): схема разложена по `prisma/schema/*.prisma`
(`schema.prisma` — только generator/datasource, остальное — по модулю:
`note.prisma`, `file.prisma`, `queue.prisma`). Миграции — в
`prisma/migrations/`, путь задан в `prisma.config.ts`, а не в
`schema.prisma` — начиная с Prisma 7 `datasource.url` там не поддерживается
вовсе: подключение идёт через драйвер-адаптер
(`@prisma/adapter-pg`, `src/prisma/prisma.service.ts`), а не через URL в
схеме. Доступ к данным — только через репозиторий модуля
(`src/notes/notes.repository.ts`); транзакции явные (пример —
`NotificationsProcessor.process`, запись в `ProcessedJob` и побочный
эффект в одном `$transaction`).

```bash
pnpm --filter server db:generate   # перегенерировать клиент из схемы
pnpm --filter server db:migrate    # создать и применить миграцию (dev)
```

### Первая миграция и как она проверена

`prisma/migrations/20261011171831_init/` создана без базы данных:
`prisma migrate diff --from-empty --to-schema prisma/schema --script`.
Она содержит пять таблиц (`audit_log_entries`, `uploaded_files`, `notes`,
`processed_jobs`, `tasks`), перечисление `UploadedFileStatus` и три индекса.

Проверена на настоящем движке Postgres в WebAssembly (PGlite с сетевым
сокетом, на машине без Docker): `prisma migrate deploy` применил миграцию,
`prisma migrate status` сообщил «схема актуальна», а
`prisma migrate diff --from-config-datasource --to-schema prisma/schema --exit-code`
вернул «расхождений нет». Оба сида (`db:seed:demo`, `db:seed:test`)
отработали дважды подряд без ошибок.

Следующую миграцию создавайте как раньше (`db:migrate` против базы из
`docker:up`). Без базы SQL можно получить так:
`prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema --script`,
но в Prisma 7 эта форма требует `datasource.shadowDatabaseUrl` в
`prisma.config.ts`.

## Очереди

BullMQ через `@nestjs/bullmq`, одно подключение Redis на процесс
(`src/redis/`, общее для health-проверки и очередей). Две очереди:

| Очередь         | Что делает                                                                                                | Идемпотентность                                                                                                                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notifications` | `NotificationsProcessor` обрабатывает `note-created` после создания заметки                               | Детерминированный `jobId` (`note-created-<id>`, без «:» — BullMQ отвергает пользовательский id с двоеточием, если частей не ровно три) + таблица `ProcessedJob`: побочный эффект и ключ пишутся в одной транзакции — повторная обработка той же задачи его не повторяет |
| `maintenance`   | `MaintenanceProcessor` раз в час помечает `FAILED` записи `UploadedFile` в статусе `PENDING` старше суток | Расписание — `upsertJobScheduler` (`MaintenanceScheduler.onModuleInit`), не `queue.add` с `repeat` — опция `utc` в BullMQ 6 заменена на `tz`                                                                                                                            |

Воркер — отдельный процесс без HTTP (`src/queue/worker.ts`,
`NestFactory.createApplicationContext(WorkerModule)`), свой `WorkerModule`
без контроллеров: `pnpm --filter server start:worker`.

## Контракт API

Маршруты `notes`, `tasks` и `files` объявлены в `@boilerplate/contract`
(`packages/contract`), а не декораторами `@Get`/`@Post` напрямую —
подробности, как добавить домен и чего это стоит, в
[docs/packages/contract.md](../packages/contract.md). Короткая версия для
этого приложения:

- `ORPCModule.forRoot({})` в `app.module.ts` — даёт `ImplementInterceptor`,
  без которого `@Implement` не работает.
- Контроллер без `@Controller(path)`: путь целиком в контракте.
  `@Implement(contract.notes)` на методе, возвращающем объект обработчиков
  `implement(contract.notes.<procedure>).handler(...)` — по одному на
  каждую процедуру домена; забытый обработчик — ошибка `tsc` на этапе
  `pnpm typecheck`, не на старте приложения.
- Сервисы (`NotesService`, `FilesService`) остаются транспортно-независимыми
  и продолжают бросать `NotFoundException`/`BadRequestException` — контроллер
  на границе переводит их в `ORPCError` с кодом из `contract.errors()`;
  без перевода оRPC отдаёт непрозрачный 500 (ошибка не "определена"
  контрактом). См. `notes.controller.ts`/`tasks.controller.ts`/
  `files.controller.ts`.
- Модуль `src/tasks/` (Фаза 12.3) собран по образцу `src/notes/`:
  `TasksController` → `TasksService` → `TasksRepository`, модель `Task`
  в `prisma/schema/task.prisma`, запись в журнал действий на создание,
  переключение и удаление. Тесты: `tasks.service.spec.ts` (сервис) и
  `test/tasks.e2e-spec.ts` (маршрутизация контракта с подменённым
  сервисом). Миграции для `Task` нет: Postgres на машине сборки не было
  (`docs/BACKLOG.md`, `B-261008-no-prisma-migrations`).
- **Нужен лишний параметр `@Res() _res: Response`, даже неиспользуемый.**
  `ImplementInterceptor` сам пишет HTTP-ответ; без этого параметра Nest
  (`isResponseHandled` в `router-execution-context.js`) пытается отправить
  его повторно. Для обычных ответов это расхождение незаметно, а для
  `successStatus: 204` роняло шумное `Cannot remove headers after they are
sent` — найдено `test/notes.e2e-spec.ts`, не по документации.
- `GET /openapi.json` (`src/openapi/`) порождает OpenAPI из контракта
  (`OpenAPIGenerator` + `ZodToJsonSchemaConverter` из **`@orpc/zod/zod4`**,
  не из корня пакета — корневой `@orpc/zod` читает типы `zod/v3` и не
  поймёт схемы Zod 4). Маршрута нет вовсе при `NODE_ENV=production`
  (раздел "Фаза 5" задания, пункт 5.1: "публикуется в разработке").

## Файлы

Байты не проходят через API. `src/files/` — два шага:

1. `POST /files/upload-ticket` (`FilesService.createUploadTicket`) — пишет
   запись `UploadedFile` со статусом `PENDING`, просит у
   `@boilerplate/storage` подписанную форму POST и отдаёт её клиенту вместе
   с `fileId`. Размер ограничивает сервер (`MAX_UPLOAD_BYTES`), не клиент.
2. Клиент отправляет файл подписанной формой напрямую в хранилище, минуя
   сервер, затем `POST /files/:id/confirm` (`FilesService.confirm`):
   `storage.head()` — реальный размер; затем `storage.getDownloadUrl()` +
   `fetch` с заголовком `Range` на первые 4100 байт + `file-type` —
   настоящий тип по сигнатуре, не по расширению и не по тому, что заявил
   клиент. Несовпадение или отсутствие файла — запись переходит в `FAILED`.

`MaintenanceProcessor` (раздел «Очереди» выше) раз в час переводит в
`FAILED` записи `PENDING` старше суток — это и есть «уборка незавершённых
загрузок» из задания: клиент получил талон и не долил файл.

## Health

`/health/live` — только процесс (память, `MemoryHealthIndicator`). Внешних
зависимостей здесь нет умышленно: если проверка живости зависит от базы,
короткий сбой Postgres перезапускает все инстансы и превращает устранимую
аварию в неустранимую.

`/health/ready` — PostgreSQL (`PrismaHealthIndicator` из `@nestjs/terminus`,
`.withTimeout(1000).cacheFor(5000)`) и Redis (свой `RedisHealthIndicator`
через `HealthIndicatorService` — готового индикатора Redis в terminus нет).
Исключение внутри индикатора даёт 500, возврат `down` — 503.
`test/health.e2e-spec.ts` проверяет `/health/live` настоящим HTTP-запросом
через supertest, а `/health/ready` — тем же способом, но с подделанным
клиентом Redis (`ping()` падает или отвечает) и минимальной заглушкой
Prisma: так проверяется само поведение контроллера и индикатора (503 при
отказе Redis, 200 при двух живых зависимостях), а не факт работы реального
Redis. Против настоящих PostgreSQL/Redis/Garage в `docker-compose` — за
`pnpm docker:up`, на этой машине не прогонялось (`docs/BACKLOG.md`,
`B-261008-no-docker`, `B-261008-docker-unverified`) — остаётся отдельной
задачей.

## Журнал действий

`src/audit-log` (Фаза 8, `packages/admin-kit`'s служебный просмотр) —
`AuditLogEntry` в Prisma (`actor`/`entity`/`entityId`/`action`/
`occurredAt`), запись делают сервисы напрямую (`AuditLogService.record`),
не через HTTP — `NotesService` зовёт его после `create`/`update`/
`delete`. Актор — заглушка `"system"`: настоящего "кто" до модуля
аутентификации (M1) взять негде, полноценная привязка к пользователю —
отдельный пункт ROADMAP. Чтение — `contract.auditLog.list`, с
пагинацией и фильтром по `entity`/`actor`.

## Багрепорт

`src/dev-bug-reports` (Фаза 9) — `POST /dev/bug-reports`, пишет
markdown в `.bugs/` (приёмник выбирает `BUG_REPORT_RECEIVER`). Модуль
регистрируется в `app.module.ts` только при `NODE_ENV !== "production"`
(`should-register-dev-bug-reports.ts`, чистая функция, проверена без
импорта всего `AppModule`) — в продакшен-образе маршрута нет вовсе, не
просто 404 изнутри хендлера. Лимит тела (5 МБ, под скриншот) навешен
per-route через `NestModule.configure()`, а не через глобальный
дефолт body-parser — тот у Nest срабатывает раньше и резал бы
легитимный отчёт до 100кб (`main.ts`: `bodyParser: false`). Подробности
сбора/маскирования — `docs/packages/devtools.md`, `docs/guides/bug-reports.md`.

## Трассировка

Шов, а не стек (D12, `ADR-0001-stack.md`): ядро OpenTelemetry 2.x
(`@opentelemetry/api` 1.9.1, `sdk-trace-node`/`resources`/
`context-async-hooks` 2.12.0, версии проверены `pnpm view` 2026-10-08)
стабильно, но экспортёры и автоинструментации остаются 0.x, и мажор 3.x
близок — закладывать их в основу рано (ROADMAP, M5).

`OTEL_ENABLED` (по умолчанию `false`). Включённый флаг (`src/observability/
tracing.ts`, `initTracing`, вызывается в начале `bootstrap()` и в
`src/main.ts`, и в `src/queue/worker.ts`) регистрирует только
`NodeTracerProvider` и контекст-менеджер — без единого `SpanProcessor`:
спаны, которые появятся позже (ручные или от будущей автоинструментации),
видны через контекст и попадают в поля `traceId`/`spanId` записей pino
(`src/logger/pino-options.ts`, `getActiveTraceIds()`), но никуда не
отправляются, пока M5 не выберет экспортёра и коллектора. При выключенном
флаге (по умолчанию) поля просто не появляются — проверено
`src/observability/tracing.spec.ts` на обоих состояниях флага и с/без
активного спана.

## Docker

`Dockerfile` — два целевых образа (`api`, `worker`) через `turbo prune`;
`docker-compose.yml` в корне — инфраструктура (PostgreSQL, Redis, Garage)
в основном наборе, `server`/`worker` — в профиле `app`. Образы запускают
`node --conditions=compiled apps/server/dist/main.js` (воркер —
`…/dist/queue/worker.js`), см. «Запуск». Подробности, ключ
доступа Garage и переменные контейнеров — `docs/guides/docker.md`.

## Как добавить модуль

1. Каталог `src/<module>/` с `module.ts`, `controller.ts`, `service.ts`,
   `repository.ts`, `*.spec.ts` — по образцу `src/notes/`.
2. Схема Prisma модуля — свой файл в `prisma/schema/`, если нужны новые
   таблицы.
3. Домен в `packages/contract` (новый файл `*.contract.ts` + запись в
   `src/index.ts`) раньше обработчика — раздел "Фаза 5" задания, пункт
   5.1; типы входа/выхода выводятся из него, свой DTO-файл не нужен.
   Контроллер — `@Implement(contract.<domain>)`, см. раздел «Контракт API»
   выше и [docs/packages/contract.md](../packages/contract.md).
4. Регистрация модуля в `src/app.module.ts` (и в `src/worker.module.ts`,
   если модуль содержит обработчики очередей).

## Известные ограничения

- Атомарная постановка задачи вместе с коммитом строки в той же
  транзакции BullMQ не умеет — очередь и база данных остаются двумя
  разными системами. Текущая идемпотентность (детерминированный `jobId` +
  таблица `ProcessedJob`) закрывает повторную обработку, но не гарантирует
  атомарность самой постановки. Если понадобится настоящая атомарность —
  отдельный механизм на Postgres (например, outbox-таблица), не BullMQ.
- `bull-board` не подключён: он должен стоять за админским доступом, а
  модуля аутентификации ещё нет (M1 в ROADMAP) — подключать админку к
  несуществующей защите означало бы открытую панель управления очередями.
- `vitest.config.ts` подключает `unplugin-swc`: esbuild (транспайлер
  Vitest по умолчанию) не эмитит `emitDecoratorMetadata`, из-за чего Nest
  DI в e2e-тестах резолвил конструкторные параметры без `@Inject()` в
  `undefined` вместо нужного провайдера — см. `B-261008-vitest-esbuild-no-decorator-metadata`
  в `docs/BACKLOG.md`.
