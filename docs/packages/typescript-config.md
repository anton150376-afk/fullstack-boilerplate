> **Зачем читать:** какой вариант `tsconfig.json` подключить новому пакету или приложению.
> **Кому:** кто добавляет пакет или приложение в монорепозиторий.
> **Последняя проверка:** 2026-10-08.

## Что это

Общие варианты `tsconfig.json`, чтобы строгость и опции модулей не расходились
между пакетами. Исходники — `packages/typescript-config/`.

## Как подключить

В `tsconfig.json` своего пакета:

```json
{
  "extends": "@boilerplate/typescript-config/node.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

| Вариант             | Когда брать                                                                              | Отличие от базы                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node.json`         | Серверный код (`apps/server`, воркер)                                                    | `moduleResolution: "nodenext"`; **без** `erasableSyntaxOnly` — он ломает параметры-свойства конструктора, на которых держится внедрение зависимостей Nest |
| `react.json`        | Веб (`apps/web`, `packages/ui-web`)                                                      | `moduleResolution: "bundler"`, `jsx: "react-jsx"`, типы DOM; `erasableSyntaxOnly` включён                                                                 |
| `react-native.json` | Мобильное (`apps/mobile`, `packages/ui-native`)                                          | То же, что `react.json`, но без типов DOM                                                                                                                 |
| `library.json`      | Платформенно-независимый пакет, собираемый `tsc` (например, будущий `packages/contract`) | Эмит включён: `declaration`, `declarationMap`, `sourceMap`. **`outDir`/`rootDir` не входят** — см. ниже, почему                                           |

Корневой `tsconfig.json` репозитория (проверка `scripts/**/*.ts`) использует
`node.json` напрямую — у скриптов нет собственного `package.json` с зависимостями.

Пакет, который не компилируется в `dist/`, а потребляется как исходник
бандлером потребителя (Vite, Metro, tsx) — как `packages/tailwind-config` —
берёт `node.json` или `react.json`/`react-native.json`, а не `library.json`:
эмит ему не нужен, достаточно проверки типов.

## Почему `outDir`/`rootDir` не в `library.json`

Это реальная найденная ловушка: при `extends` относительные пути
(`outDir`, `rootDir`, `baseUrl`) в компиляторных опциях **базового** файла
резолвятся относительно каталога самого базового файла
(`packages/typescript-config/`), а не относительно потребителя. Строка
`"rootDir": "src"` в `library.json` молча требовала, чтобы исходники
потребителя лежали в `packages/typescript-config/src` — `tsc` падал с
`TS6059` на первом же реальном потребителе (`packages/tailwind-config`,
Фаза 2). Поэтому `outDir`/`rootDir` всегда задаются в `tsconfig.json`
**потребителя**, никогда в общем варианте.

## Частые ошибки

- Включить `erasableSyntaxOnly` в `node.json` или в его потребителе — Nest
  перестанет собираться из-за параметров-свойств конструктора.
- Задать `outDir`/`rootDir` в самом `library.json` вместо потребителя — см.
  раздел выше.
- Не добавить `*.config.ts` (например, `vitest.config.ts`) в `include`
  своего `tsconfig.json` — typed-правила ESLint откажутся его разбирать
  с ошибкой «was not found by the project service».

## Ссылки

- [README.md пакета](../../packages/typescript-config/README.md)
- [ADR-0001-stack.md](../architecture/decisions/ADR-0001-stack.md) — решение D10 (TypeScript 6.0.3)
