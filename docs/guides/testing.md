> **Зачем читать:** где граница между Vitest и Jest в этом монорепозитории
> и почему она не стирается со временем.
> **Кому:** кто пишет тесты для `apps/mobile`/`packages/ui-native`.
> **Последняя проверка:** 2026-10-08.

## Граница

Vitest — везде, кроме `apps/mobile` и `packages/ui-native`. Это
единственное сознательное отступление от общей системы тестов (раздел
"Фаза 7" задания, пункт 9): Expo документирует только Jest с пресетом
`jest-expo`, а путь через Vitest для React Native — библиотека в бете с
одним мейнтейнером и неполной проходимостью. Переносить остальной
монорепозиторий на Jest ради единообразия не имеет смысла — Vitest
быстрее и уже глубоко интегрирован (пресеты `packages/testing`,
`test.projects` в корневом `vitest.config.ts`).

Правило из задания: **общую логику выносить в пакеты, тестируемые
Vitest, чтобы поверхность Jest оставалась маленькой** — это требование,
не пожелание. `packages/ui-native` неизбежно на Jest (рендерит настоящие
компоненты React Native), но бизнес-логика без JSX (контракт,
api-client, i18n) остаётся на Vitest и используется мобильным
приложением как обычная зависимость — её тестирует тот пакет, где она
живёт, повторно в Jest не нужно.

## Что на Jest

- `packages/ui-native` — `Button`, `FileUpload`. Пресет `jest-expo`
  (не `jest-expo/universal` — тот гоняет один файл четырьмя проектами
  web/node/ios/android, нужен только при платформенных `.ios`/`.android`/
  `.web` файлах, которых здесь нет) + `@testing-library/react-native`.
- `apps/mobile` — своих тестов пока нет (экраны — тонкие обёртки вокруг
  `ui-native`/`api-client`, которые тестируются в своих пакетах), но
  `jest-expo` настроен заранее: `jest.config.js` есть, скрипт
  `"test": "jest --passWithNoTests"` не роняет гейт на пустом наборе, но
  и не делает вид, что что-то проверено.

## Запуск

```bash
pnpm --filter mobile test                      # apps/mobile — пройдёт, тестов нет
pnpm --filter @boilerplate/ui-native test       # packages/ui-native — настоящие тесты
pnpm test:mobile                                 # оба сразу, это шаг гейта
```

`turbo run test` прогоняет **и** Vitest-пакеты (через их собственный
`"test": "vitest run"`), **и** эти два Jest-пакета — turbo не знает
и не обязан знать, какой раннер стоит за скриптом `test` в каждом
`package.json`, достаточно одного имени задачи.

## Тесты на настоящей базе данных

Почти все тесты сервера подменяют Prisma целиком. Набор
`apps/server/test/db.integration-spec.ts` проверяет репозитории
(`TasksRepository`, `NotesRepository`, `FilesRepository`) на настоящей схеме
Postgres: значения по умолчанию, обновление дат, порядок выдачи, ошибки
Prisma для несуществующей записи (`P2025`) и для повтора уникального ключа
(`P2002`).

Набор выполняется только при заданном `TEST_DATABASE_URL`: это база с
применёнными миграциями. Без неё он пропущен, поэтому офлайн-гейт базы не
требует. В CI переменная задана, миграции применяются шагом перед гейтом.

Локально с Docker: `pnpm docker:up`, `pnpm --filter server db:deploy`, затем

```bash
TEST_DATABASE_URL=postgresql://app:app@localhost:5432/app pnpm --filter server test
```

### Без Docker: PGlite

Postgres в WebAssembly с сетевым сокетом годится как замена. Так проверены
первая миграция и эти тесты. Во временной папке вне репозитория:

```bash
npm install @electric-sql/pglite @electric-sql/pglite-socket
```

```js
// serve.mjs
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const db = await PGlite.create();
await new PGLiteSocketServer({ db, port: 5433, host: "127.0.0.1" }).start();
```

После `node serve.mjs` адрес базы —
`postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable&connection_limit=1`;
с ним работают `db:deploy`, `db:seed:*` и `TEST_DATABASE_URL`. PGlite держит
одно подключение за раз и после остановки процесса теряет данные.

## Пороги покрытия (раздел "Фаза 12" задания, пункт 12.1)

`vitest.config.ts` (корень) задаёт `coverage.thresholds` плоским
объектом по фактическому состоянию с небольшим запасом (зафиксировано
2026-10-09: lines 79.53%→75, statements 79.5%→75, functions 69.39%→65,
branches 65.29%→60) — не по шаблонам путей на пакет: Vitest 5 не
поддерживает per-glob пороги в режиме `test.projects` (рабочее
пространство), только единый порог на объединённый отчёт.

**Пороги не понижаются.** Падение покрытия из-за новой непротестированной
функциональности — повод дописать тест, не поправить число в конфиге.
**Пороги поднимаются осознанно, отдельным коммитом, никогда попутно с
функциональной работой** — иначе повышение теряется в диффе и
непонятно, какое изменение его вызвало.

## Частые ошибки

- **`render`/`fireEvent` асинхронные в `@testing-library/react-native` 14.** Без `await render(...)` следующая строка (`screen.getByRole(...)`)
  падает с «render function has not been called» — найдено реальным
  тестом, не по памяти (`packages/ui-native/src/components/button.test.tsx`).
- **`jest.mock()` запрещает ссылки на внешние переменные в фабрике**,
  кроме тех, что начинаются с `mock` (регистр не важен) — иначе
  `ReferenceError: The module factory of jest.mock() is not allowed to
reference any out-of-scope variables`.
- **Относительные импорты с `.js`** резолвятся Jest только через
  `moduleNameMapper` (`^(\.{1,2}/.*)\.js$ → $1`) в `jest.config.js` —
  тот же класс проблемы, что у Metro (`docs/apps/mobile.md`), но решается
  отдельно, конфиг Jest не читает `metro.config.js`.
- **`@types/jest` не подключается автоматически** в `packages/ui-native`
  без явного `"types": ["jest"]` в `tsconfig.json` — `jest-expo`
  публикует свою частичную аугментацию (`declare namespace jest {...}`,
  только интерфейсы матчеров), и без основной `declare var jest: Jest`
  из `@types/jest` TypeScript даёт «Cannot use namespace 'jest' as a
  value».

## Ссылки

- [testing.md](../packages/testing.md) — пресеты Vitest (остальной монорепозиторий).
- [ui-native.md](../packages/ui-native.md)
- [mobile.md](../apps/mobile.md)
- `docs/BACKLOG.md` — находки Фазы 7 по Jest/ESLint/типам.
