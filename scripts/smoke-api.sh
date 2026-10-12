#!/usr/bin/env bash
# Дымовая проверка запущенного API (docs/operations/ci.md, задача smoke): сервер, база и Redis
# работают, маршруты отвечают, очередь принимает задачи, request-id доходит до журнала.
#
#   bash scripts/smoke-api.sh [адрес]            # по умолчанию http://127.0.0.1:3100
#   LOG_FILE=server.log bash scripts/smoke-api.sh # дополнительно ищет request-id в журнале сервера
#
# Сервер должен быть запущен с NODE_ENV=development (маршрут /dev/bug-reports в продакшене
# отсутствует) и применёнными миграциями. Запросы метятся User-Agent probe-smoke.
# Тела запросов ASCII: curl под Windows портит кириллицу в аргументах.
set -uo pipefail

BASE="${1:-http://127.0.0.1:3100}"
LOG_FILE="${LOG_FILE:-}"
UA="probe-smoke"
FAILED=0
TMP="$(mktemp -d)"
UUID_RE='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'

pass() { echo "ok:     $1"; }
fail() { echo "ОШИБКА: $1" >&2; FAILED=1; }
check() { # check <описание> <ожидали> <получили>
  if [ "$2" = "$3" ]; then pass "$1 -> $3"; else fail "$1 -> $3 (ожидали $2)"; fi
}

# request <метод> <путь> [файл тела]; печатает код, тело в $TMP/body, заголовки в $TMP/head
request() {
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -sS -m 30 -A "$UA" -X "$method" -H 'content-type: application/json' --data-binary "@$body" \
      -D "$TMP/head" -o "$TMP/body" -w '%{http_code}' "$BASE$path"
  else
    curl -sS -m 30 -A "$UA" -X "$method" -D "$TMP/head" -o "$TMP/body" -w '%{http_code}' "$BASE$path"
  fi
}
field() { # field <имя> — значение строкового поля первого JSON-объекта из $TMP/body
  node -e 'const b=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); const o=Array.isArray(b)?b[0]:b; console.log(o?.[process.argv[2]] ?? "")' "$TMP/body" "$1"
}
header() { grep -i "^$1:" "$TMP/head" | head -1 | cut -d: -f2- | tr -d '\r ' ; }

# 0. ждём старта
for _ in $(seq 1 60); do
  curl -sS -m 3 -o /dev/null -A "$UA" "$BASE/health/live" 2>/dev/null && break
  sleep 2
done

# 1. здоровье и request-id
check "GET /health/live" 200 "$(request GET /health/live)"
RID="$(header x-request-id)"
if [[ "$RID" =~ $UUID_RE ]]; then pass "X-Request-Id — UUID ($RID)"; else fail "X-Request-Id не UUID: «$RID»"; fi
check "GET /health/ready (база и Redis)" 200 "$(request GET /health/ready)"

# 2. задачи: полный цикл
printf '%s' '{"title":"smoke task"}' > "$TMP/task.json"
check "POST /tasks" 200 "$(request POST /tasks "$TMP/task.json")"
TASK_ID="$(field id)"
[ -n "$TASK_ID" ] && pass "создана задача $TASK_ID" || fail "в ответе нет id задачи"
check "GET /tasks" 200 "$(request GET /tasks)"
grep -q "$TASK_ID" "$TMP/body" && pass "задача видна в списке" || fail "задачи нет в списке"
check "PATCH /tasks/:id/toggle" 200 "$(request PATCH "/tasks/$TASK_ID/toggle")"
[ "$(field done)" = "true" ] && pass "done стало true" || fail "done не переключилось"
printf '%s' '{"title":""}' > "$TMP/empty.json"
check "POST /tasks с пустым title" 400 "$(request POST /tasks "$TMP/empty.json")"
check "PATCH toggle несуществующей" 404 "$(request PATCH /tasks/00000000-0000-0000-0000-000000000000/toggle)"
[ "$(field code)" = "NOT_FOUND" ] && pass "код ошибки NOT_FOUND" || fail "код ошибки не NOT_FOUND"
check "DELETE /tasks/:id" 204 "$(request DELETE "/tasks/$TASK_ID")"

# 3. заметка: вставка в базу и постановка задачи в очередь BullMQ
printf '%s' '{"title":"smoke note","body":"queue check"}' > "$TMP/note.json"
check "POST /notes (база + очередь)" 200 "$(request POST /notes "$TMP/note.json")"
NOTE_ID="$(field id)"
[ -n "$NOTE_ID" ] && check "DELETE /notes/:id" 204 "$(request DELETE "/notes/$NOTE_ID")"

# 4. OpenAPI
check "GET /openapi.json" 200 "$(request GET /openapi.json)"
grep -q '"/tasks"' "$TMP/body" && pass "в спецификации есть /tasks" || fail "в спецификации нет /tasks"

# 5. цепочка багрепорта: сломанный запрос -> X-Request-Id -> отчёт -> запись в журнале
check "сломанный запрос (toggle несуществующей)" 404 "$(request PATCH /tasks/11111111-1111-1111-1111-111111111111/toggle)"
BROKEN_ID="$(header x-request-id)"
node -e '
const rid = process.argv[1];
require("fs").writeFileSync(process.argv[2], JSON.stringify({
  description: "smoke: task is not toggled", stepsToReproduce: "1. open", expectedBehavior: "toggled",
  createdAt: new Date().toISOString(),
  context: {
    route: { path: "/admin/tasks", params: {} }, build: { version: "0.0.0", gitSha: "smoke" },
    environment: "development",
    platform: { os: "linux", osVersion: "1", device: "ci", screen: { width: 1, height: 1 }, locale: "en-US" },
    requestLog: [{ method: "PATCH", path: "/tasks/x/toggle", status: 404, durationMs: 1, requestId: rid }],
    logs: [], actionTrail: [], queries: [],
  },
}));' "$BROKEN_ID" "$TMP/report.json"
check "POST /dev/bug-reports" 204 "$(request POST /dev/bug-reports "$TMP/report.json")"
if [ -n "$LOG_FILE" ]; then
  if grep -aq "\"id\":\"$BROKEN_ID\"" "$LOG_FILE"; then pass "request-id $BROKEN_ID найден в журнале сервера"; else fail "request-id $BROKEN_ID нет в журнале $LOG_FILE"; fi
fi

if [ "$FAILED" = 0 ]; then echo "Дымовая проверка пройдена"; else echo "Дымовая проверка провалена" >&2; fi
exit "$FAILED"
