> **Зачем читать:** где живут варианты компонентов и почему они не JSX.
> **Кому:** кто добавляет компонент в `ui-web` или `ui-native`.
> **Последняя проверка:** 2026-10-11.

## Что это

Варианты (`cva`) и утилита слияния классов (`cn`) без привязки к
платформе — правило `ui.md`: "Стили только токенами; варианты в
ui-core". `ui-web` (Base UI) и `ui-native` (Uniwind, Фаза 7) рисуют один
и тот же набор вариантов каждый на своём примитиве — имена пропсов
(`variant`, `size`) парны между ними.

## Состав

- `buttonVariants` (`src/button-variants.ts`) — классы по образцу
  настоящего `shadcn init -b base` (стиль `base-nova`): `bg-primary`,
  `bg-destructive/10` и так далее — имена утилит, которые реально
  генерирует Tailwind из токенов `packages/tailwind-config` (см.
  `docs/packages/tailwind-config.md` про `@theme inline`).
- `cn` (`src/cn.ts`) — реэкспорт из пакета `cn` (наследник clsx +
  tailwind-merge, грабля 24 задания: утилита переехала в отдельный
  пакет).

## Подписи компонентов

`src/labels.ts` хранит типы `BugReportLabels` и `FileUploadLabels`, их
русские значения по умолчанию и `resolveLabels(defaults, overrides)`.
`ui-web` и `ui-native` берут отсюда подписи, поэтому набор ключей у веба и
мобильного общий. Подробности — [ui.md](ui.md).

## Частые ошибки

- Писать здесь JSX или импортировать React — пакет должен собираться и
  типизироваться без DOM и без React Native одновременно; платформенная
  часть — в `ui-web`/`ui-native`.
- Заводить новый вариант без проверки на `pnpm build` в `apps/web` —
  `@apply`/утилита, ссылающаяся на несуществующий токен Tailwind, падает
  только на настоящей сборке, не при `vite dev` (найдено в Фазе 6,
  `docs/BACKLOG.md`, `B-261008-tailwind-semantic-tokens-not-registered`).

## Ссылки

- [README.md пакета](../../packages/ui-core/README.md)
- [ui-web.md](ui-web.md) — где это используется.
- [tailwind-config.md](tailwind-config.md) — источник токенов.
