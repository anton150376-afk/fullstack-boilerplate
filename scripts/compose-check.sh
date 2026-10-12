#!/usr/bin/env bash
# Проверка запуска контейнеров (docs/guides/docker.md, раздел «Проверка контейнеров»):
# поднимает весь стек через docker-compose.yml и убеждается, что он работает так,
# как описано, а не только собирается.
#
#   bash scripts/compose-check.sh                # без браузера
#   WITH_E2E=1 bash scripts/compose-check.sh     # плюс сквозные тесты Playwright
#   KEEP_UP=1 bash scripts/compose-check.sh      # не гасить стек после проверки
#
# Нужны Docker с compose v2, Node и pnpm (миграции идут с хоста, как в
# docs/guides/docker.md), а для WITH_E2E=1 — браузер Playwright
# (pnpm --filter web e2e:install). Берёт .env из .env.example, если его нет.
set -uo pipefail

cd "$(dirname "$0")/.."

[ -f .env ] || cp .env.example .env
set -a
# shellcheck disable=SC1091
. ./.env
set +a

API="http://localhost:${PORT:-3000}"
WEB="http://localhost:${WEB_PORT:-3001}"
MOBILE_WEB="http://localhost:${MOBILE_WEB_PORT:-3002}"
COMPOSE=(docker compose --profile app --profile web --profile mobile-web)
FAILED=0

step() { echo; echo "==> $1"; }
fail() {
  echo "ОШИБКА: $1" >&2
  FAILED=1
}
status() { curl -s -o /dev/null -m 10 -w '%{http_code}' "$1" || true; }

# Ждёт, пока адрес ответит нужным кодом (до 60 секунд).
wait_for() { # wait_for <url> <код>
  for _ in $(seq 1 30); do
    [ "$(status "$1")" = "$2" ] && return 0
    sleep 2
  done
  return 1
}

cleanup() {
  if [ "$FAILED" != 0 ]; then
    echo
    echo "--- Состояние и журналы контейнеров ---" >&2
    "${COMPOSE[@]}" ps >&2 || true
    "${COMPOSE[@]}" logs --no-color --tail=80 >&2 || true
  fi
  if [ "${KEEP_UP:-}" != 1 ]; then
    "${COMPOSE[@]}" down -v >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

step "Инфраструктура: PostgreSQL, Redis, Garage"
docker compose up -d --wait --wait-timeout 120 || {
  fail "инфраструктура не поднялась (healthcheck)"
  exit 1
}

step "Garage: ключ доступа и бакет созданы из переменных окружения"
docker compose exec -T garage /garage key info "$S3_ACCESS_KEY_ID" >/dev/null &&
  echo "ok: ключ $S3_ACCESS_KEY_ID есть" || fail "в Garage нет ключа $S3_ACCESS_KEY_ID"
docker compose exec -T garage /garage bucket info "${S3_BUCKET:-app-files}" >/dev/null &&
  echo "ok: бакет ${S3_BUCKET:-app-files} есть" || fail "в Garage нет бакета ${S3_BUCKET:-app-files}"

step "Миграции (с хоста, как в docs/guides/docker.md)"
(cd apps/server && DATABASE_URL="postgresql://app:app@localhost:${POSTGRES_PORT:-5432}/app" npx prisma migrate deploy) ||
  {
    fail "миграции не применились"
    exit 1
  }

step "Приложения: server, worker, web, mobile-web (сборка образов и healthcheck)"
"${COMPOSE[@]}" up -d --build --wait --wait-timeout 600 || {
  fail "приложения не поднялись или не стали healthy"
  exit 1
}

step "Здоровье API"
[ "$(status "$API/health/live")" = 200 ] && echo "ok: /health/live" || fail "/health/live не 200"
[ "$(status "$API/health/ready")" = 200 ] && echo "ok: /health/ready (база и Redis)" || fail "/health/ready не 200"

step "Дымовая проверка API (scripts/smoke-api.sh)"
bash scripts/smoke-api.sh "$API" || fail "дымовая проверка API провалена"

step "Остановка Redis: /health/ready должен упасть, /health/live — нет"
docker compose stop redis >/dev/null
if wait_for "$API/health/ready" 503; then
  echo "ok: /health/ready ответил 503 без Redis"
else
  fail "/health/ready не стал 503 после остановки Redis (сейчас $(status "$API/health/ready"))"
fi
[ "$(status "$API/health/live")" = 200 ] && echo "ok: /health/live остался 200" || fail "/health/live упал вместе с Redis"
docker compose start redis >/dev/null
if wait_for "$API/health/ready" 200; then
  echo "ok: /health/ready снова 200 после запуска Redis"
else
  fail "/health/ready не восстановился после запуска Redis"
fi

step "Веб: страница и статика клиента (раньше все /assets/* отвечали 404)"
[ "$(status "$WEB/")" = 200 ] && echo "ok: $WEB/" || fail "веб не отвечает 200"
# grep -a: HTML с кириллицей grep в локали C считает двоичным файлом и ничего не печатает.
ASSET="$(curl -s -m 10 "$WEB/" | grep -ao '/assets/[^"]*\.js' | head -1)"
if [ -n "$ASSET" ] && [ "$(status "$WEB$ASSET")" = 200 ]; then
  echo "ok: $ASSET"
else
  fail "скрипт клиента ${ASSET:-<не найден в HTML>} не отдаётся"
fi

step "Веб-экспорт мобильного приложения"
[ "$(status "$MOBILE_WEB/")" = 200 ] && echo "ok: $MOBILE_WEB/" || fail "mobile-web не отвечает 200"

if [ "${WITH_E2E:-}" = 1 ]; then
  step "Сквозные тесты Playwright против контейнеров"
  # Кнопка багрепорта вшивается в бандл при сборке, а контейнер собран без неё, и
  # отчёты пишутся внутрь контейнера, а не в .bugs/ хоста: эти сценарии здесь не идут.
  E2E_REUSE_SERVERS=true E2E_API_URL="$API" E2E_WEB_URL="$WEB" \
    pnpm --filter web e2e --grep-invert "багрепорт" || fail "сквозные тесты провалены"
fi

echo
if [ "$FAILED" = 0 ]; then
  echo "Проверка контейнеров пройдена"
else
  echo "Проверка контейнеров провалена" >&2
fi
exit "$FAILED"
