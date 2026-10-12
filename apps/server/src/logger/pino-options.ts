import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { Params } from "nestjs-pino";

import type { Env } from "../config/env.schema.js";
import { getActiveTraceIds } from "../observability/tracing.js";

// Безопасный идентификатор от клиента или прокси принимается как есть
// (сквозная трассировка), всё остальное заменяется на UUID: произвольные
// строки не должны попадать в журналы.
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

// Идентификатор запроса и заголовок X-Request-Id создаются в одном месте.
// Раньше заголовок ставило промежуточное звено в main.ts, а оно срабатывало
// до pino-http, req.id был undefined, и каждый запрос падал с 500
// (ERR_HTTP_INVALID_HEADER_VALUE; найдено живым запуском сервера). Порядковый
// номер pino-http по умолчанию сбрасывается при перезапуске процесса и не
// годится для поиска по журналам и отчётам об ошибках.
export function generateRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers["x-request-id"];
  const id =
    typeof incoming === "string" && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader("X-Request-Id", id);
  return id;
}

// Общие настройки pino для HTTP-процесса и воркера — чтобы формат записей
// (и правила редактирования секретов) не расходились между двумя точками
// входа одного приложения.
export function createPinoOptions(level: Env["LOG_LEVEL"]): Params["pinoHttp"] {
  return {
    level,
    genReqId: generateRequestId,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
        "req.body.token",
        'req.body["refreshToken"]',
        "res.headers['set-cookie']",
      ],
      censor: "[REDACTED]",
    },
    // Спред undefined — это {} (раздел "Фаза 4" задания, пункт 9): без
    // активного спана (трассировка выключена по умолчанию) traceId/spanId
    // в записи просто не появляются, без условия на вызывающей стороне.
    customProps: (req: { id?: unknown }) => ({
      requestId: req.id,
      ...getActiveTraceIds(),
    }),
  };
}
