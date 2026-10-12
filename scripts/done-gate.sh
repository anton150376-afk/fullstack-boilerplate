#!/usr/bin/env bash
set -uo pipefail
# Не "set -e": код возврата каждого шага проверяется вручную, чтобы хук
# Stop гарантированно получал ровно exit 2 при любой находке (раздел 3.5
# задания), а не то, что вернула конкретная команда.

START_TIME=$(date +%s)

# --full — весь гейт целиком (CI, раздел 3.5 задания), без аргумента —
# быстрый путь для Stop-хука: тесты только затронутых пакетов через
# turbo run test --filter=...[HEAD] (покрывает и Vitest, и Jest одним
# проходом — turbo не различает, какой раннер стоит за скриптом "test"
# пакета), не полный test:coverage. На тёплом кеше гейт перестал
# укладываться в полторы минуты после Фазы 8 (найдено реальным
# прогоном, не предположением) — см. docs/BACKLOG.md.
FULL=false
if [ "${1:-}" = "--full" ]; then
  FULL=true
fi

GATE_ALLOW="${GATE_ALLOW:-}"
ALLOW_STEP=""
ALLOW_ID=""
if [ -n "$GATE_ALLOW" ]; then
  ALLOW_STEP="${GATE_ALLOW%%=*}"
  ALLOW_ID="${GATE_ALLOW#*=}"
fi

# Выполняет шаг; при неудаче печатает имя шага и команду для
# воспроизведения и завершает гейт сразу (fail-fast — агент получает
# обратную связь по первой находке, а не ждёт остальные шаги).
run_step() {
  local name="$1"
  shift

  if [ "$name" = "$ALLOW_STEP" ]; then
    if npx tsx scripts/gate-allow-check.ts "$ALLOW_ID" >/dev/null 2>&1; then
      echo ""
      echo "############################################################"
      echo "# GATE_ALLOW: шаг '$name' пропущен по пункту бэклога $ALLOW_ID"
      echo "############################################################"
      echo ""
      return 0
    else
      echo "GATE_ALLOW=$GATE_ALLOW указывает на несуществующий или не открытый пункт бэклога — клапан не открыт" >&2
    fi
  fi

  echo "==> $name"
  if ! "$@"; then
    echo "" >&2
    echo "--- Гейт провален на шаге '$name' ---" >&2
    echo "Воспроизвести: $*" >&2
    exit 2
  fi
}

run_step "format:check" pnpm format:check
run_step "lint" pnpm lint
run_step "typecheck" pnpm typecheck
run_step "check:docs" pnpm check:docs
run_step "check:backlog" pnpm check:backlog
run_step "check:env" pnpm check:env
run_step "check:parity" pnpm check:parity
run_step "check:i18n" pnpm check:i18n
run_step "check:runtime" pnpm check:runtime
run_step "check:boundaries" pnpm check:boundaries
if [ "$FULL" = true ]; then
  run_step "test:coverage" pnpm test:coverage
  if [ -d apps/mobile ]; then
    run_step "test:mobile" pnpm test:mobile
  fi
else
  run_step "test (затронутые пакеты)" npx turbo run test --filter '...[HEAD]'
fi

# Жёсткое правило: packages/contract изменился без правки docs/ в том же
# рабочем дереве. packages/contract появляется в Фазе 5 — до этого момента
# проверка не находит каталога и корректно ничего не делает.
if [ -d packages/contract ]; then
  CONTRACT_CHANGED=$(git diff --name-only HEAD -- packages/contract 2>/dev/null || true)
  if [ -n "$CONTRACT_CHANGED" ]; then
    DOCS_CHANGED=$(git diff --name-only HEAD -- docs 2>/dev/null || true)
    if [ -z "$DOCS_CHANGED" ]; then
      echo "" >&2
      echo "--- Гейт провален: packages/contract изменён без правки docs/ ---" >&2
      echo "Воспроизвести: git diff --name-only HEAD -- packages/contract docs" >&2
      exit 2
    fi
  fi
fi

# Предупреждение без падения: apps/*/src или packages/*/src изменились,
# а docs/ — нет. Не роняет гейт, только называет затронутые области.
SRC_CHANGED=$(git diff --name-only HEAD -- 'apps/*/src' 'packages/*/src' 2>/dev/null || true)
if [ -n "$SRC_CHANGED" ]; then
  DOCS_CHANGED=$(git diff --name-only HEAD -- docs 2>/dev/null || true)
  if [ -z "$DOCS_CHANGED" ]; then
    echo "" >&2
    echo "ПРЕДУПРЕЖДЕНИЕ: изменения в src/ без единой правки docs/:" >&2
    echo "$SRC_CHANGED" | sed 's/^/  - /' >&2
  fi
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo ""
echo "==> Гейт пройден (${DURATION}s)"

if [ "$FULL" = false ] && [ "$DURATION" -gt 90 ]; then
  echo "ПРЕДУПРЕЖДЕНИЕ: быстрый гейт занял больше полутора минут — раздел 3.5 задания требует новой меры (это уже gate/gate:full, порог нарушен снова)" >&2
fi
