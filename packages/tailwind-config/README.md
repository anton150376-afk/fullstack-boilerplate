# @boilerplate/tailwind-config

Палитра и базовые стили Tailwind 4 для веба и мобильного. Подробности —
[docs/packages/tailwind-config.md](../../docs/packages/tailwind-config.md).

## Экспорты

- `./theme.css` — `@theme` с палитрой (brand/accent/neutral/success/warning/danger,
  50–950, в `oklch`), радиусами, типографикой, тенями, семантическими
  переменными светлой/тёмной темы.
- `./base.css` — сброс и базовые стили для DOM (`apps/web`).
- `./tokens` — hex-зеркало палитры (`src/tokens.ts`) для потребителей,
  которые не понимают `oklch`: `react-native-svg`, сырые стили RN, генераторы
  иконок.

## Как пересчитать палитру

1. Поменять hue/хрому семейства или кривую светлоты в `src/theme.css`.
2. `pnpm --filter @boilerplate/tailwind-config generate:tokens` —
   перегенерирует `src/tokens.ts` из `theme.css`.
3. `pnpm --filter @boilerplate/tailwind-config test` — тест падает, если
   зеркало и `theme.css` разошлись.

`src/tokens.ts` не редактируется руками — шапка файла напоминает об этом.
