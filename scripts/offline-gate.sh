#!/usr/bin/env bash
# Гейт с заблокированной сетью: докажет, что ни один шаг (format, lint,
# typecheck, check:*, тесты) не обращается к внешним адресам
# (docs/BACKLOG.md, B-261008-gate-network-by-design).
#
#   bash scripts/offline-gate.sh [--full]     # аргументы уходят в done-gate.sh
#
# Как это устроено: в NODE_OPTIONS подключается scripts/block-network.mjs —
# он режет любые соединения Node не на петлю (127.0.0.0/8, ::1, localhost) и
# пишет каждую попытку в журнал. Действует на все процессы Node (pnpm, tsx,
# ESLint, воркеры Vitest и Jest). Бинарник turbo написан не на Node и под
# блокировку не попадает: его телеметрия отключена переменными ниже. TURBO_FORCE
# отключает кеш, иначе шаги вернули бы готовый результат, не выполняясь.
# Если гейт прошёл, но в журнале есть попытки выйти в сеть, скрипт всё равно
# завершается с кодом 1.
set -uo pipefail

cd "$(dirname "$0")/.."

BLOCKER_URL="$(node -p "require('node:url').pathToFileURL(require('node:path').resolve('scripts/block-network.mjs')).href")"
BLOCK_NET_LOG="$(mktemp)"
export BLOCK_NET_LOG
export NODE_OPTIONS="${NODE_OPTIONS:-} --import ${BLOCKER_URL}"
export TURBO_FORCE=true
export TURBO_TELEMETRY_DISABLED=1
export DO_NOT_TRACK=1
export NO_UPDATE_NOTIFIER=1

bash scripts/done-gate.sh "$@"
GATE_CODE=$?

echo ""
if [ -s "$BLOCK_NET_LOG" ]; then
  echo "Сеть: заблокированные попытки выйти наружу (процесс, вид, адрес):" >&2
  sort "$BLOCK_NET_LOG" | uniq -c | sort -rn >&2
  rm -f "$BLOCK_NET_LOG"
  exit 1
fi
rm -f "$BLOCK_NET_LOG"
echo "Сеть: попыток выйти наружу не было"
exit "$GATE_CODE"
