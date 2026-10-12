# syntax=docker/dockerfile:1.7
#
# Многоступенчатая сборка через `turbo prune` — тот же приём, что у
# apps/server/Dockerfile. `vite build` отдаёт dist/client (статика) и
# dist/server/server.js (WHATWG fetch-обработчик без своего HTTP-сервера —
# в этой версии @tanstack/react-start нет Nitro и готового `.output/`,
# см. docs/apps/web.md); server-entry.mjs поднимает его через srvx
# (раздел "Фаза 6" задания, пункт 10).
#
# Образ собран и запущен в составе docker-compose.yml: страница отдаётся, статика
# клиента отдаётся, браузерные тесты проходят (Codespace, 2026-10-12).

FROM node:22.23-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS pruner
COPY . .
RUN npx turbo@2.11.7 prune web --docker

FROM base AS deps
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY --from=pruner /app/out/full/ .
# VITE_API_URL встраивается в клиентский бандл на этапе сборки
# (import.meta.env — не рантайм-переменная); реальный адрес сервера
# передаётся через --build-arg при собственной сборке образа.
ARG VITE_API_URL="http://localhost:3000"
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm turbo run build --filter=web

FROM base AS web
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 webapp
COPY --from=build --chown=webapp:nodejs /app .
WORKDIR /app/apps/web
USER webapp
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server-entry.mjs"]
