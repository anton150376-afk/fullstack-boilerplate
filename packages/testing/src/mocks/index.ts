import type { RequestHandler } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

/**
 * Поднимает MSW-сервер на время набора тестов: `listen` в `beforeAll`,
 * `resetHandlers` после каждого теста (обработчики, добавленные `server.use`
 * в одном тесте, не утекают в следующий), `close` в `afterAll`.
 * `onUnhandledFrame: "error"` — необработанный запрос роняет тест, а не
 * тихо уходит в сеть. В msw 3.x опция называется `onUnhandledFrame`, а не
 * `onUnhandledRequest` (переименована и расширена на WebSocket) — реальная
 * проверка через `tsc`, не по памяти о более старой версии msw.
 */
export function createMockServer(handlers: RequestHandler[] = []): ReturnType<typeof setupServer> {
  const server = setupServer(...handlers);

  beforeAll(() => {
    server.listen({ onUnhandledFrame: "error" });
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => {
    server.close();
  });

  return server;
}

export { http, HttpResponse } from "msw";
