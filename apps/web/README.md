# web

Веб-приложение на TanStack Start (SSR) — Tailwind 4, i18n по cookie,
oRPC-клиент из `@boilerplate/api-client`. Подробности —
[docs/apps/web.md](../../docs/apps/web.md).

## Команды

```bash
pnpm --filter web dev      # vite dev, SSR
pnpm --filter web build    # прод-сборка (dist/)
pnpm --filter web start    # запустить собранный server-entry.mjs (srvx)
```

Нужен запущенный `server` (`VITE_API_URL`) — см.
[apps/server/README.md](../server/README.md).
