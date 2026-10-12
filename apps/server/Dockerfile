# syntax=docker/dockerfile:1.7
#
# Многоступенчатая сборка через `turbo prune` (решение агента, ADR-0001):
# обрезает монорепозиторий до apps/server и его реальных зависимостей,
# разделяя установку зависимостей и копирование исходников — повторная
# сборка не переустанавливает зависимости, если менялся только код.
#
# Образы api и worker собраны, запущены и проходят healthcheck в составе
# docker-compose.yml (Codespace, 2026-10-12, scripts/compose-check.sh).

FROM node:22.23-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS pruner
COPY . .
RUN npx turbo@2.11.7 prune server --docker

FROM base AS deps
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY --from=pruner /app/out/full/ .
# prisma generate требует DATABASE_URL даже без реального подключения к
# базе (Prisma 7 больше не держит url в schema.prisma — см.
# docs/apps/server.md). Значение используется только во время сборки.
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV DATABASE_URL=${DATABASE_URL}
RUN pnpm turbo run build --filter=server

FROM base AS api
ENV NODE_ENV=production
# /app создаёт WORKDIR от root, а COPY --chown меняет владельца только содержимого:
# без chown сервер не сможет создать в /app каталог .bugs/ (отчёты в dev-режиме).
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs \
  && chown nestjs:nodejs /app
COPY --from=build --chown=nestjs:nodejs /app .
USER nestjs
EXPOSE 3000
# Указывает на /health/live, а не /health/ready — именно этого требует
# раздел "Фаза 4" задания: HEALTHCHECK для compose не должен зависеть от
# внешних сервисов, иначе их временная недоступность рестартует контейнер.
# В оркестраторе вместо этого — настоящие liveness/readiness probes.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health/live').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# --conditions=compiled: пакеты воркспейса (contract, storage, devtools) отдают
# сырой TypeScript по умолчанию, а в рантайме Node берёт их собранный dist.
CMD ["node", "--conditions=compiled", "apps/server/dist/main.js"]

FROM base AS worker
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs
COPY --from=build --chown=nestjs:nodejs /app .
USER nestjs
# Воркер не поднимает HTTP — /health/live у него нет (BullMQ-процесс
# без Nest-приложения). Проверка на уровне "процесс жив": worker.js —
# PID 1 в своём контейнере, читаем /proc напрямую, без pgrep/procps,
# которого на -slim по умолчанию нет.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD grep -q worker.js /proc/1/cmdline || exit 1
CMD ["node", "--conditions=compiled", "apps/server/dist/queue/worker.js"]
