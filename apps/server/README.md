# server

API на Nest 12 (Express, ESM) — PostgreSQL через Prisma, очереди BullMQ,
health-эндпоинты. Подробности — [docs/apps/server.md](../../docs/apps/server.md).

## Команды

```bash
pnpm --filter server dev            # HTTP-процесс из исходников (с перезапуском при правках)
pnpm --filter server dev:worker     # воркер очередей из исходников, отдельный процесс
pnpm --filter server build          # dist/ (turbo сначала собирает пакеты воркспейса)
pnpm --filter server start          # node --conditions=compiled dist/main.js — как в Docker
pnpm --filter server start:worker   # воркер из dist/
pnpm --filter server db:generate    # сгенерировать Prisma Client
pnpm --filter server db:migrate     # применить миграции (нужен Postgres)
bash scripts/smoke-api.sh           # дымовая проверка запущенного сервера (из корня репозитория)
```

Требует запущенных PostgreSQL и Redis — `pnpm docker:up` в корне репозитория
(см. `docker-compose.yml`).

`dev` использует `@swc-node/register` (а не `tsx`): Nest DI нужны метаданные
декораторов, esbuild их не эмитит. `start` требует флага `--conditions=compiled`
— см. [docs/architecture/monorepo.md](../../docs/architecture/monorepo.md#условие-compiled).
