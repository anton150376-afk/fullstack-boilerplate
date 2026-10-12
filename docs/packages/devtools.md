> **Зачем читать:** что собирает багрепорт, что в нём маскируется и как
> переключить приёмник.
> **Кому:** кто дорабатывает кнопку «сообщить о проблеме» или разбирает отчёты.
> **Последняя проверка:** 2026-10-11.

## Что это

Ядро сбора контекста для кнопки «сообщить о проблеме» (раздел "Фаза 9"
задания) — маршрутно-независимый пакет, который используют и
`apps/web`, и `apps/mobile`, и `apps/server`. Главная точка входа
(`@boilerplate/devtools`) безопасна для браузера и React Native —
только `fetch`, никакого `node:fs`. Приёмники, завязанные на Node
(`file`, `github`, `api`), живут в отдельном подпути `@boilerplate/devtools/receivers`,
который импортирует только сервер.

## Что собирается

- Маршрут и параметры, версия и git SHA сборки, имя окружения, платформа
  (ОС, версия, устройство, размер экрана, локаль).
- `requestLog` — кольцевой буфер последних двадцати запросов из
  `@boilerplate/api-client` (метод, путь, статус, длительность,
  `request-id`). Именно по `request-id` разбирающий отчёт находит
  серверные логи конкретного запроса — без этого отчёт сводится к «не
  работает кнопка» (цель всей фазы).
- `logs` — буфер примерно двухсот записей (`createLogBuffer`),
  перехватывает `console.error`/`console.warn` сам; необработанные
  исключения и отказы промисов — платформенный API
  (`window.onerror`/`onunhandledrejection` на вебе, `ErrorUtils` на RN),
  вызывающий код сам передаёт их в `record()`.
- `actionTrail` — последние тридцать событий (`createActionTrail`):
  переход по маршруту, нажатие на элемент с `data-testid`/`accessibilityLabel`,
  отправка формы. Значения полей не записываются никогда — `record()`
  принимает только `type` и `label` (имя маршрута/атрибут), в сигнатуре
  просто нет места для значения поля.
- `queries` — урезанный снимок TanStack Query (`snapshotQueryCache`):
  ключ, статус, факт ошибки, время обновления. Данные запросов в снимок
  не попадают.
- `screenshot` — по желанию. На вебе кнопка «приложить» без автоматики
  (DOM-снимки врут на внешних шрифтах/canvas/кросс-доменных картинках).
  На native — автоматический снимок текущего экрана через
  `react-native-view-shot`, собирается в `apps/mobile`.

## Маскирование — в ядре, не у вызывающего кода

`maskSecrets()` (`src/masking.ts`) рекурсивно проходит отчёт целиком:
заголовок `Authorization` и ключи вида `token`/`password`/`secret`/`api-key`/`cookie`
заменяются на `[masked]` по имени поля, а строка `Bearer <токен>` в
свободном тексте — отдельным регулярным выражением (например, если
секрет оказался в описании проблемы). `formatBugReportMarkdown()`
вызывает `maskSecrets()` первым шагом — защита работает независимо от
того, какой приёмник получит отчёт дальше. Правила покрыты тестами
(`masking.test.ts`, 5 тестов) и дополнительно проверены на уровне
HTTP-эндпоинта (`apps/server/test/dev-bug-reports.e2e-spec.ts`).

## Приёмники

Один интерфейс — `BugReportReceiver.submit(report)`, три реализации на
сервере (`@boilerplate/devtools/receivers`) и один изоморфный на клиенте:

- `createFileReceiver` — по умолчанию на сервере: пишет markdown
  (`formatBugReportMarkdown`) в каталог `.bugs/`, имя файла собирает сам
  (временная метка + случайный суффикс) — клиент не может продиктовать
  путь записи.
- `createGithubReceiver` — создаёт issue с метками через REST API
  GitHub напрямую (`fetch`, без отдельной зависимости вроде `@octokit/rest`)
  — для передачи отчёта другому человеку.
- `createApiReceiver` — запись в Postgres. Не реализован: раздел 9.1
  задания оставляет это "на случай, если понадобится" — правило 2.2
  задания запрещает реализовывать модули раньше времени. Вызов
  `submit()` отклоняет промис с объясняющим сообщением.
- `createHttpBugReportReceiver` — единственный приёмник из главной
  точки входа (не из `/receivers`): клиент (веб/мобильный) всегда
  отправляет отчёт POST-ом на `/dev/bug-reports`, а какой из трёх
  серверных приёмников фактически запишет отчёт — решает сервер,
  переменной `BUG_REPORT_RECEIVER` (`docs/operations/env-vars.md`).

Переключение приёмника на сервере — одна переменная окружения,
смотреть `docs/guides/bug-reports.md`.

## Почему `createHttpBugReportReceiver`, а не инлайн-`fetch` в apps/web/apps/mobile

Прямые вызовы `fetch` вне `packages/api-client` запрещены линтом в
React-коде (`noDirectNetwork`, `packages/eslint-config/react.js`).
`packages/devtools` — обычный Node-профиль ESLint, где `fetch` не под
запретом (как и у `github-receiver.ts`), поэтому клиентский HTTP-вызов
живёт здесь, а не инлайном в `apps/web/src/lib/bug-report.ts`.

## Сборка для сервера

Точка входа `.` (кнопка, клиентская часть) читается Vite и Metro из `src`.
Серверу нужны приёмники — `@boilerplate/devtools/receivers`
(`createApiReceiver`, `createFileReceiver`, `createGithubReceiver` и др.). У обеих точек входа есть условие
`compiled` → `dist/index.js` и `dist/receivers/index.js`; сборка —
`pnpm --filter @boilerplate/devtools build` (`tsc -p tsconfig.build.json`),
сервер запускается как `node --conditions=compiled`
(`docs/architecture/monorepo.md`, раздел «Условие compiled»).

## Ссылки

- [README.md пакета](../../packages/devtools/README.md)
- [docs/guides/bug-reports.md](../guides/bug-reports.md)
- `docs/architecture/decisions/ADR-0001-stack.md`
