> **Зачем читать:** как подключить единый стиль форматирования новому пакету или приложению.
> **Кому:** кто добавляет пакет или приложение.
> **Последняя проверка:** 2026-10-08.

## Что это

Общий объект настроек Prettier плюс детерминированная сортировка импортов
(`@ianvs/prettier-plugin-sort-imports`): встроенные модули → внешние пакеты →
пакеты `@boilerplate/*` → относительные импорты, с пустой строкой между
группами. Исходник — `packages/prettier-config/index.js`.

## Как подключить

```js
// prettier.config.mjs
import base from "@boilerplate/prettier-config";

export default base;
```

Три строки, как и требуется для любого общего пакета конфигурации (раздел
"Критерии приёмки" Фазы 2 задания).

## Tailwind в приложениях

`prettier-plugin-tailwindcss` в общий пакет **не входит**. У `apps/web` и
`apps/mobile` будет собственный `prettier.config.mjs`, который разворачивает
этот общий объект и добавляет плагин со своим `tailwindStylesheet` — один
корневой конфиг не может описать два разных CSS-входа (грабля 19 задания).

## Частые ошибки

- Добавить `prettier-plugin-tailwindcss` сюда вместо приложения — второе
  приложение с другим CSS-входом сломается.
- Забыть продублировать `@boilerplate/prettier-config` в `devDependencies`
  потребителя (`linkWorkspacePackages: false` — пакет не подтягивается неявно).

## Ссылки

- [README.md пакета](../../packages/prettier-config/README.md)
