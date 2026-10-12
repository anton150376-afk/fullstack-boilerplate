# mobile

Expo SDK 57 (Expo Router, новая архитектура) — те же `@boilerplate/i18n` и
`@boilerplate/api-client`, что у `apps/web`. Подробности —
[docs/apps/mobile.md](../../docs/apps/mobile.md).

## Команды

```bash
pnpm --filter mobile start      # expo start — development build, не Expo Go
pnpm --filter mobile web        # expo start --web
pnpm --filter mobile build:web  # expo export -p web — статическая веб-сборка
pnpm --filter mobile test       # jest (не vitest — см. docs/guides/testing.md)
```

Первый запуск любой командой генерирует `expo-env.d.ts` и `uniwind-env.d.ts`
(оба в `.gitignore`) — до этого `pnpm typecheck` может не находить типы
`className`/`process.env`.
