# syntax=docker/dockerfile:1.7
#
# Многоступенчатая сборка через `turbo prune` — тот же приём, что у
# apps/web/Dockerfile. `expo export -p web` отдаёт статику в dist/ —
# веб-сборка мобильного приложения — вторичная поверхность для быстрой
# выдачи того же интерфейса в браузере, не продуктовая веб-поверхность
# (ей остаётся apps/web, раздел "Фаза 7" задания, пункт 8). Раздаёт
# `serve`, не Node-обработчик fetch — здесь нет SSR, только статика.
#
# Образ собран, запущен и отвечает 200 в составе docker-compose.yml (Codespace,
# 2026-10-12, scripts/compose-check.sh).

FROM node:22.23-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS pruner
COPY . .
RUN npx turbo@2.11.7 prune mobile --docker

FROM base AS deps
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY --from=pruner /app/out/full/ .
# EXPO_PUBLIC_API_URL встраивается в клиентский бандл на этапе сборки
# (babel-preset-expo/inline-env-vars — не рантайм-переменная); реальный
# адрес сервера передаётся через --build-arg при собственной сборке.
ARG EXPO_PUBLIC_API_URL="http://localhost:3000"
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
RUN cd apps/mobile && npx uniwind generate-artifacts --css ./src/global.css --dts ./uniwind-env.d.ts
# Не `turbo run build:web`: в turbo.json такой задачи нет, turbo отвечает
# «Could not find task» (найдено первым запуском Docker в CI). Скрипт пакета
# вызывается напрямую — так же, как в mobile.yml.
RUN pnpm --filter mobile build:web

FROM base AS mobile-web
ENV NODE_ENV=production
# serve ставится при сборке образа с точной версией, а не через npx при
# запуске: контейнеру не нужна сеть, версия не плавает. Записи в каталоге
# pnpm для него нет, потому что образ не ставит зависимости воркспейса.
# `serve dist -p 3000` с этой версией проверен вне контейнера.
RUN npm install --global --ignore-scripts serve@14.2.6
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 webapp
COPY --from=build --chown=webapp:nodejs /app/apps/mobile/dist /app/dist
WORKDIR /app
USER webapp
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["serve", "dist", "-p", "3000"]
