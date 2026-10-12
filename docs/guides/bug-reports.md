> **Зачем читать:** что собирает и маскирует кнопка «сообщить о
> проблеме», как разобрать отчёт и как переключить приёмник.
> **Кому:** кто разбирает отчёт из `.bugs/` или настраивает приёмник.
> **Последняя проверка:** 2026-10-08.

## Что собирается

Полный список полей — `docs/packages/devtools.md`. Главное для разбора:
`context.requestLog` несёт `request-id` последних двадцати запросов —
сервер проставляет его в логи (`apps/server/src/logger/pino-options.ts`:
`customProps` добавляет `requestId: req.id` в каждую запись pino-http
для этого запроса; `apps/server/src/main.ts` эхом ставит тот же id в
заголовок ответа `X-Request-Id`), клиент читает заголовок и кладёт в
`RequestLogEntry.requestId` (`@boilerplate/api-client`). По этому полю
находятся серверные логи конкретного запроса, упавшего перед тем, как
пользователь нажал кнопку.

Цепочка проверена тестами на каждом стыке (pino-options/main.ts —
Фаза 4; `api-client`'s запись `requestId` из заголовка ответа — Фаза 5;
`dev-bug-reports.e2e-spec.ts` — Фаза 9, `request-id` из `requestLog`
действительно попадает в написанный markdown-файл), но живая
демонстрация "сломать запрос в браузере → найти ту же строку в стдауте
сервера" не проводилась на этой машине — нужны Postgres/Redis,
недоступные здесь (`docs/BACKLOG.md`, `B-261008-no-docker`). См.
`B-261008-bug-report-requestid-live-demo` там же.

## Что маскируется

`Authorization`, поля `token`/`password`/`secret`/`api-key`/`cookie` (по
имени ключа) и строка `Bearer <токен>` в свободном тексте — всегда, на
уровне `packages/devtools/src/masking.ts`, до того, как отчёт попадёт в
markdown или уйдёт по сети. Данные самих запросов (`requestLog`) не
собираются вовсе — там только метод/путь/статус/длительность/`request-id`,
полям для заголовков и тел там просто нет места в типе.

## Как разобрать отчёт

1. Новый файл появляется в `.bugs/` (корень репозитория,
   `apps/server/src/dev-bug-reports/dev-bug-reports.constants.ts`).
2. Скилл `bug-triage` (`.claude/skills/bug-triage/SKILL.md`) читает
   контекст отчёта, находит серверные логи по `request-id` из таблицы
   «Последние запросы», воспроизводит проблему, пишет падающий тест,
   чинит, закрывает пункт `docs/BACKLOG.md` и переносит отчёт в
   `.bugs/closed/`.
3. Снимок экрана (если есть) — markdown-изображение с data URI вместо
   ссылки на файл; большинство markdown-просмотрщиков отрисуют его инлайн.

## Как переключить приёмник

Сервер выбирает приёмник переменной `BUG_REPORT_RECEIVER`
(`docs/operations/env-vars.md`), клиент всегда отправляет на один и тот
же `POST /dev/bug-reports` — переключение происходит только на сервере,
без участия клиента:

- `file` (по умолчанию) — markdown в `.bugs/`.
- `github` — issue в репозитории с метками; требует
  `BUG_REPORT_GITHUB_OWNER`/`BUG_REPORT_GITHUB_REPO`/`BUG_REPORT_GITHUB_TOKEN`
  (сервер падает при старте с понятным сообщением, если выбран `github`
  без этих трёх переменных).
- `api` — запись в Postgres, не реализована сейчас (раздел 9.1 задания:
  "реализуется, если понадобится").

## Как включить кнопку

Выключена по умолчанию везде. Флаг — `VITE_ENABLE_BUG_REPORTS=true`
(`apps/web`) или `EXPO_PUBLIC_ENABLE_BUG_REPORTS=true` (`apps/mobile`).
Сам dev-эндпоинт сервера регистрируется только при `NODE_ENV !== "production"`
(`apps/server/src/dev-bug-reports/should-register-dev-bug-reports.ts`) —
в продакшен-сборке его нет вовсе, независимо от флага на клиенте.

## Задел под продакшен (раздел 9.4 задания)

Ядро уже различает полный `BugReport` и урезанный `ProductionFeedback`
(только текст, маршрут, версия сборки — без логов, сети, трейла и
снимков) на уровне типов, маскирования и markdown-форматирования
(`packages/devtools/src/bug-report.ts`, `markdown.ts`). Сам
продакшен-эндпоинт и кнопка под отдельным флагом не построены в этой
фазе — он должен работать там, где dev-модуль недоступен по определению
(`NODE_ENV === "production"`), поэтому ему нужен отдельный, всегда
зарегистрированный маршрут и собственная модерация/привязка к
аккаунту — это пункт ROADMAP, а не Фазы 9 (так и указано в задании:
"полноценный приём отзывов... — пункт ROADMAP, а не этой фазы").

## Частые ошибки

- Доверять дефолтному лимиту body-parser у Nest: он срабатывает раньше
  собственного лимита модуля, если не выключить его явно
  (`NestFactory.create(AppModule, { bodyParser: false })`,
  `docs/BACKLOG.md`, `B-261008-nest-default-bodyparser-preempts-route-limit`).
- Писать `fetch` прямо в `apps/web`/`apps/mobile` для отправки отчёта —
  запрещено линтом (`noDirectNetwork`); отправка живёт в
  `createHttpBugReportReceiver` (`@boilerplate/devtools`), который
  использует обычный Node-профиль ESLint.

## Ссылки

- [docs/packages/devtools.md](../packages/devtools.md)
- [docs/operations/env-vars.md](../operations/env-vars.md)
- `.claude/skills/bug-triage/SKILL.md`
