import { isSpanContextValid, trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

import type { Env } from "../config/env.schema.js";

// Шов, а не стек (раздел "Фаза 4" задания, пункт 9; D12, ADR-0001): ядро
// трассировки 2.x стабильно, но экспортёры и автоинструментации остаются
// 0.x, и мажор 3.x близок — закладывать их в основу рано. Включённый флаг
// регистрирует только провайдер и контекст-менеджер, без единого
// SpanProcessor: спаны, которые появятся позже (ручные или от будущей
// автоинструментации), будут видны через контекст и попадут в поля pino
// (src/logger/pino-options.ts), но никуда не отправляются, пока модуль M5
// (ROADMAP) не выберет экспортёра и коллектора.
let initialized = false;

export function initTracing(env: Pick<Env, "OTEL_ENABLED">): void {
  if (!env.OTEL_ENABLED || initialized) {
    return;
  }

  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({ "service.name": "server" }),
  });
  provider.register({ contextManager: new AsyncLocalStorageContextManager() });
  initialized = true;
}

export interface TraceIds {
  traceId: string;
  spanId: string;
}

// Вызывается из customProps pino-http при формировании каждой записи
// лога. Возвращает undefined, если трассировка выключена или активного
// спана нет — тогда поля traceId/spanId просто не появляются в записи,
// без дополнительных условий на вызывающей стороне.
export function getActiveTraceIds(): TraceIds | undefined {
  const span = trace.getActiveSpan();
  if (!span) {
    return undefined;
  }

  const spanContext = span.spanContext();
  if (!isSpanContextValid(spanContext)) {
    return undefined;
  }

  return { traceId: spanContext.traceId, spanId: spanContext.spanId };
}

// Только для тестов: initialized — состояние на уровне модуля, в
// работающем процессе новый процесс — это и есть сброс.
export function resetTracingForTests(): void {
  initialized = false;
}
