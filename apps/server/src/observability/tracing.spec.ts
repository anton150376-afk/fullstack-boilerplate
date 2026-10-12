import { trace } from "@opentelemetry/api";
import { afterEach, describe, expect, it } from "vitest";

import { getActiveTraceIds, initTracing, resetTracingForTests } from "./tracing.js";

describe("initTracing / getActiveTraceIds", () => {
  afterEach(() => {
    resetTracingForTests();
  });

  it("при OTEL_ENABLED=false не регистрирует провайдер — активного спана нет", () => {
    initTracing({ OTEL_ENABLED: false });

    expect(getActiveTraceIds()).toBeUndefined();
  });

  it("без вызова initTracing() спан из него не делает traceId/spanId видимыми", () => {
    // initTracing не вызван вовсе — глобальный провайдер остаётся
    // no-op-провайдером API по умолчанию.
    trace.getTracer("test").startActiveSpan("span-without-provider", (span) => {
      expect(getActiveTraceIds()).toBeUndefined();
      span.end();
    });
  });

  it("при OTEL_ENABLED=true активный спан даёт валидные traceId/spanId", () => {
    initTracing({ OTEL_ENABLED: true });

    trace.getTracer("test").startActiveSpan("span-with-provider", (span) => {
      const ids = getActiveTraceIds();

      expect(ids).toBeDefined();
      expect(ids?.traceId).toMatch(/^[0-9a-f]{32}$/);
      expect(ids?.spanId).toMatch(/^[0-9a-f]{16}$/);

      span.end();
    });
  });

  it("вне активного спана возвращает undefined даже при включённой трассировке", () => {
    initTracing({ OTEL_ENABLED: true });

    expect(getActiveTraceIds()).toBeUndefined();
  });
});
