> **Зачем читать:** какие импорты между пакетами разрешены, а какие ловит гейт.
> **Кому:** кто добавляет пакет или импорт между существующими.
> **Последняя проверка:** 2026-10-11.

## Границы

| Направление импорта                                 | Разрешено? | Чем ловится нарушение                                                      |
| --------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| `apps/*` → `packages/*`                             | Да         | —                                                                          |
| `apps/*` → другое `apps/*`                          | **Нет**    | `turbo boundaries` (граф зависимостей рабочей области)                     |
| `packages/*` → `packages/*/src/*` (минуя `exports`) | **Нет**    | ESLint, правило `no-restricted-imports` в `packages/eslint-config/base.js` |
| Прямые `fetch`/`axios` вне `packages/api-client`    | **Нет**    | ESLint, правило в `packages/eslint-config/react.js`                        |
| Пакет или приложение → `apps/*`                     | **Нет**    | `turbo boundaries`, тег `app`                                              |
| Веб-код ↔ нативный ↔ серверный                      | **Нет**    | `turbo boundaries`, теги `platform-*`                                      |
| Общий код → любая платформа                         | **Нет**    | `turbo boundaries`, тег `platform-agnostic`                                |

### Теги `turbo boundaries`

`turbo boundaries` — экспериментальная функция Turborepo. Правила лежат в
корневом `turbo.json` (секция `boundaries.tags`), теги пакета — в его
собственном `turbo.json` (`{ "extends": ["//"], "tags": [...] }`).
Запускается `pnpm check:boundaries` (шаг гейта) и отдельной задачей CI.

| Тег                 | Кто                                                     | Правило                                           |
| ------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| `app`               | `server`, `web`, `docs-site`, `mobile`                  | от приложения не зависят ни приложения, ни пакеты |
| `lib`               | все пакеты с тегом платформы                            | —                                                 |
| `platform-web`      | `web`, `docs-site`, `ui-web`, `admin-kit`               | не зависит от `platform-native` и `platform-node` |
| `platform-native`   | `mobile`, `ui-native`                                   | не зависит от `platform-web` и `platform-node`    |
| `platform-node`     | `server`, `storage`                                     | не зависит от `platform-web` и `platform-native`  |
| `platform-agnostic` | `contract`, `api-client`, `i18n`, `ui-core`, `devtools` | не зависит ни от одной платформы                  |

Пакеты без тега (`eslint-config`, `typescript-config`, `prettier-config`,
`tailwind-config`, `testing`) не ограничены ни в одну сторону. Новый пакет
с рантайм-кодом получает теги `lib` и платформу при создании; без тега он
остаётся вне проверки, поэтому ставьте его сразу. Правила проверены
подстановкой запрещённой зависимости (`ui-core` → `ui-native`): `turbo
boundaries` завершается с кодом 1.

## Каталог версий

Версии пакетов, общих для нескольких рабочих областей (React, TypeScript,
Zod, TanStack, Tailwind, oRPC, Vitest), живут **только** в `catalog:`
`pnpm-workspace.yaml`. Пакет ссылается на них строкой `"catalog:"` в своём
`package.json`, а не числом — так расхождение версий между пакетами
невозможно технически, а не по дисциплине.

`catalogPrune: true` **не включается**, пока каждая запись каталога не
используется хотя бы одним пакетом — иначе он стирает ещё не
востребованные записи (см. `docs/BACKLOG.md`,
`B-261008-catalog-prune-too-early`).

## Условие compiled

Пакеты воркспейса отдают **сырой TypeScript**: `exports` ведёт на
`src/*.ts`. Так их читают Vite, Metro, `tsc` и Vitest — пересборка пакета
при каждой правке не нужна. Обычный Node такие файлы не загружает (импорты
внутри пакета записаны с расширением `.js`, а файлов `.js` в `src` нет),
поэтому сервер в продакшене не мог запуститься с `node dist/main.js`.

Пакеты, которые нужны серверу в рантайме (`contract`, `storage`, `devtools`),
описывают точки входа так:

```json
"exports": {
  ".": {
    "types": "./src/index.ts",
    "compiled": "./dist/index.js",
    "default": "./src/index.ts"
  }
}
```

и собираются `tsc -p tsconfig.build.json` (скрипт `build`; `dist/` в
`.gitignore`, в turbo — выходные данные задачи `build`). Сервер в
Docker-образе и в `pnpm --filter server start` запускается с
`node --conditions=compiled`: тогда Node выбирает ветку `compiled`, остальные
инструменты по-прежнему идут в `default`.

Правило для нового пакета, от которого зависит `apps/server`
(`workspace:*`): добавить `build`, `tsconfig.build.json` и условие `compiled`
у **каждой** точки входа. Забыть это нельзя — `pnpm check:runtime`
(`scripts/check-runtime.ts`, шаг гейта) требует условие, наличие собранного
файла и реально импортирует точку входа под
`node --conditions=compiled`.

## Scope пакетов

`@boilerplate/*` (решение D1 задания) — имя задаётся именем репозитория,
переименовывается целиком при создании нового проекта из коробки
(`scripts/init-project.ts`, Фаза 12).

## Ссылки

- [data-flow.md](data-flow.md) — путь запроса через эти границы.
- [packages/eslint-config.md](../packages/eslint-config.md) — правила, которые реализуют границы.
