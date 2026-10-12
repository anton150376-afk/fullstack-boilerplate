> **Зачем читать:** какой вариант конфига подключить и что реально проверено.
> **Кому:** кто добавляет пакет или приложение, кто настраивает `turbo boundaries`.
> **Последняя проверка:** 2026-10-08.

## Что это

Пять flat-конфигов ESLint 10 поверх `typescript-eslint` (`strictTypeChecked` +
`stylisticTypeChecked`, `parserOptions.projectService: true`). Источники —
`packages/eslint-config/*.js`.

## Как подключить

```js
// eslint.config.js любого пакета или приложения
import react from "@boilerplate/eslint-config/react";

export default react;
```

Три строки, как требует критерий приёмки Фазы 2. Нужен `tsconfig.json` рядом
(`projectService` находит его сам, идти вверх по дереву при необходимости).

## Что проверяет каждый вариант

| Вариант  | Поверх  | Добавляет                                                                                                                                                                                                                                                                        |
| -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base`   | —       | `@eslint/js` recommended, `typescript-eslint` strict+stylistic (type-aware), `eslint-config-prettier` (снимает правила форматирования — этим занят Prettier), запрет `no-restricted-imports` на `@boilerplate/*/src/*` (пакет импортируется через `exports`, а не из исходников) |
| `node`   | `base`  | Глобалы Node.js                                                                                                                                                                                                                                                                  |
| `react`  | `base`  | `eslint-plugin-react` (`configs.flat.recommended` + `jsx-runtime`), `eslint-plugin-jsx-a11y` (`flatConfigs.recommended`), `eslint-plugin-react-hooks`, `@tanstack/eslint-plugin-query`, запрет `fetch`/`axios` вне `packages/api-client`                                         |
| `native` | `react` | `eslint-plugin-react-native` (`configs.all`), глобалы React Native (`__DEV__` и так далее)                                                                                                                                                                                       |
| `test`   | `base`  | `@vitest/eslint-plugin` (`configs.recommended`) на `**/*.test.ts(x)` и `**/*.spec.ts`/`**/*.e2e-spec.ts`; меняет `@typescript-eslint/unbound-method` на `vitest/unbound-method` (см. ниже)                                                                                       |

## Вызовы `vi.fn()` в `expect(...)` и `unbound-method`

Базовое правило `@typescript-eslint/unbound-method` не понимает моки
`vi.fn()`: любое обращение вида `expect(repository.findById).toHaveBeenCalledWith(...)`
оно трактует как «отвязанный метод» и ошибочно требует `.bind()` или
стрелочную функцию. Найдено на реальном тесте (`apps/server`,
`notes.service.spec.ts`). Вариант `test` выключает базовое правило в
пользу `vitest/unbound-method` из `@vitest/eslint-plugin` — он устроен так
же, но различает моки.

## Ведущее подчёркивание — осознанно неиспользуемое

`@typescript-eslint/no-unused-vars` настроен с `argsIgnorePattern`/`varsIgnorePattern: "^_"`
во всех вариантах: `const { DATABASE_URL: _DATABASE_URL, ...rest } = env`
не считается ошибкой — имя с `_` впереди явно говорит, что поле исключается
намеренно.

## Границы импортов: что ловит линтер, а что — `turbo boundaries`

- **Линтер** (`no-restricted-imports` в `base`): запрещает импорт `src/`
  другого пакета мимо `exports` в его `package.json`. Прямые обращения к
  сети вне `packages/api-client` — тоже линтер (`react`).
- **`turbo boundaries`** (отдельная задача, см. `turbo.json`): запрещает
  приложению импортировать другое приложение и ловит импорты
  необъявленных зависимостей рабочей области — это граф зависимостей,
  линтер его не видит.

## Пиры versus ESLint 10 — реальное расхождение

На дату проверки `eslint-plugin-jsx-a11y@6.10.2`, `eslint-plugin-react@7.37.5`
и `eslint-plugin-react-native@5.0.0` объявляют пир-диапазон до `^9` включительно
и **не перечисляют ESLint 10** явно. `pnpm peers check` показывает это как
несовпадение. Проверено фактически: все три плагина экспортируют готовые
flat-конфиги (`configs.flat.*`, `flatConfigs.*`) и реально приняты ESLint 10
без ошибок — отставание только в метаданных `peerDependencies`, а не в
совместимости кода. См. `docs/BACKLOG.md`, пункт о пирах ESLint 10.

## Частые ошибки

- Забыть `tsconfig.json` в пакете — `projectService` не найдёт проект, и
  typed-правила упадут с ошибкой парсинга.
- Подключить `native` там, где достаточно `react` — лишние правила
  React Native будут шуметь на обычном вебе.

## Ссылки

- [README.md пакета](../../packages/eslint-config/README.md)
- [ADR-0001-stack.md](../architecture/decisions/ADR-0001-stack.md)
