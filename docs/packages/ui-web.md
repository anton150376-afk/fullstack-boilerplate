> **Зачем читать:** как добавить компонент shadcn/Base UI в этот
> монорепозиторий без нарушения паритета с `ui-native`.
> **Кому:** кто пишет интерфейс `apps/web`.
> **Последняя проверка:** 2026-10-08.

## Что это

Компоненты на Base UI (`@base-ui/react`), стилизованные классами из
`packages/ui-core`. `shadcn init -b base` (CLI, не сайт) задаёт
конвенцию имён и структуру — пакет следует ей, но держит компонент и
варианты в разных местах (компонент здесь, варианты в `ui-core`),
поскольку `shadcn` сам не разделяет их для монорепозитория с парными
`ui-web`/`ui-native`.

## Состав

- `Button` (`src/components/button.tsx`) — тонкая обёртка над
  `@base-ui/react/button` и `buttonVariants` из `ui-core`.
- `FileUpload` (`src/components/file-upload.tsx`) — получает талон и
  подтверждение КАК ПРОПСЫ (`requestTicket`, `confirmUpload`), не знает
  про `@boilerplate/contract`/`api-client` напрямую (правило `ui.md`):
  `apps/web` подключает реальный контракт, `ui-native` (Фаза 7) —
  тот же контракт через свой file picker. Загрузка идёт подписанной
  формой POST через `XMLHttpRequest` (нужен `xhr.upload.onprogress` —
  у `fetch` нет события прогресса на тело запроса), минуя сервер (D16).

## Как добавить новый компонент shadcn

`shadcn add <component>` **нельзя** направить прямо в `packages/ui-web`
через алиасы `components.json` надёжно (грабля 24 задания: открытые
ошибки CLI в монорепозиториях уже проявились на одной попытке `init` —
см. `docs/BACKLOG.md`, `B-261008-shadcn-init-catalog-strict`). Рабочая
процедура:

1. Закоммитить текущее состояние (грабля 24).
2. `shadcn add <component>` из `apps/web/` — ляжет в
   `apps/web/src/components/ui/<component>.tsx`.
3. Вынести `cva`-варианты в `packages/ui-core/src/<component>-variants.ts`
   (тот же `cva`, те же имена классов).
4. Переписать компонент в `packages/ui-web/src/components/<component>.tsx`:
   примитив `@base-ui/react/<component>` + `cn(variants(...), className)`.
5. Удалить сгенерированный файл из `apps/web/src/components/ui/`.
6. Обновить таблицу паритета (`pnpm check:parity`, появится вместе с
   `ui-native` в Фазе 7) и экспорт в `src/index.ts`.

## Частые ошибки

- Запускать `shadcn` через `pnpm exec` в этой среде — наблюдалась
  необъяснимая задержка/зависание; прямой вызов
  `node node_modules/shadcn/dist/index.js ...` работает надёжно.
- `shadcn init` переписывает CSS-файл и добавляет СВОИ семантические
  токены (`--background`, `--primary`, `--border`, ...) литеральными
  значениями oklch, независимыми от палитры `packages/tailwind-config` —
  после `init`/`add` нужно свериться с `apps/web/src/styles/app.css` и
  перевести новые `:root`-переменные на `var(--color-*)` из палитры,
  иначе бренд-цвет подменяется серым дефолтом shadcn.
- `settings.react.version: "detect"` в `eslint-plugin-react` падает под
  ESLint 10 flat config — версия берётся из каталога текстом
  (`packages/eslint-config/react.js`).

## Ссылки

- [README.md пакета](../../packages/ui-web/README.md)
- [ui-core.md](ui-core.md) — где живут варианты.
- [apps/web.md](../apps/web.md)
- `docs/BACKLOG.md` — находки Фазы 6 по shadcn/Tailwind/Vite.
