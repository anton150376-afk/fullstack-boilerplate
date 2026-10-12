import type { IncomingMessage, ServerResponse } from "node:http";

import { describe, expect, it, vi } from "vitest";

import { generateRequestId } from "./pino-options.js";

function createExchange(requestId?: string) {
  const req = { headers: requestId === undefined ? {} : { "x-request-id": requestId } };
  const res = { setHeader: vi.fn() };
  return {
    req: req as unknown as IncomingMessage,
    res: res as unknown as ServerResponse,
    setHeader: res.setHeader,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("generateRequestId", () => {
  it("без заголовка создаёт UUID и ставит его в X-Request-Id ответа", () => {
    const { req, res, setHeader } = createExchange();

    const id = generateRequestId(req, res);

    expect(id).toMatch(UUID);
    expect(setHeader).toHaveBeenCalledWith("X-Request-Id", id);
  });

  it("безопасный идентификатор клиента принимает как есть", () => {
    const { req, res, setHeader } = createExchange("trace-abc_123.4");

    const id = generateRequestId(req, res);

    expect(id).toBe("trace-abc_123.4");
    expect(setHeader).toHaveBeenCalledWith("X-Request-Id", "trace-abc_123.4");
  });

  it.each([
    ["с пробелом и спецсимволами", "a b;c"],
    ["с разделителем строк", "abc\r\nSet-Cookie: x=1"],
    ["длиннее 128 знаков", "a".repeat(129)],
    ["пустой", ""],
  ])("небезопасный идентификатор клиента (%s) заменяет на UUID", (_title, value) => {
    const { req, res } = createExchange(value);

    expect(generateRequestId(req, res)).toMatch(UUID);
  });

  it("два запроса получают разные идентификаторы", () => {
    const first = generateRequestId(...pair());
    const second = generateRequestId(...pair());

    expect(first).not.toBe(second);
  });
});

function pair(): [IncomingMessage, ServerResponse] {
  const { req, res } = createExchange();
  return [req, res];
}
