# @boilerplate/typescript-config

Общие варианты `tsconfig.json` для монорепозитория. Подробности и примеры
подключения — [docs/packages/typescript-config.md](../../docs/packages/typescript-config.md).

## Файлы

- `base.json` — общая основа: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`.
- `node.json` — для серверного кода (`moduleResolution: "nodenext"`), без `erasableSyntaxOnly`.
- `react.json` — для веба (`moduleResolution: "bundler"`, `jsx: "react-jsx"`, DOM-типы).
- `react-native.json` — для мобильного, как `react.json`, но без DOM-типов.
- `library.json` — для пакетов, собираемых `tsc` (эмит, декларации). `outDir`/`rootDir`
  задаёт сам потребитель — в `extends` они резолвились бы относительно этого пакета.
