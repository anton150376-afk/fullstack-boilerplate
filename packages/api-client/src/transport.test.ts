import { ORPCError } from "@orpc/client";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryClient } from "@tanstack/query-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createInMemoryTokenStorage } from "./token-storage.js";
import { createApiClient } from "./transport.js";

// auditLog.list — единственная оставшаяся реальная процедура GET-списка в
// контракте (files — только загрузка, не список). Раньше этот файл гонял
// транспортную механику через notes.*, но notes — показательная сущность,
// которую убирает scripts/init-project.ts; тест транспорта не должен
// зависеть от демо-сущности, иначе каждое удаление требует патчить и этот
// файл отдельно (найдено 09.10.2026 реальным прогоном init-project.ts —
// после удаления notes этот файл не компилировался).
const ENTRY = {
  id: "1",
  actor: "system",
  entity: "note",
  entityId: "1",
  action: "created",
  occurredAt: "2026-01-01T00:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("createApiClient — вызовы контракта", () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
  });

  it("GET /audit-log вызывает fetch с методом GET и возвращает декодированный список", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [ENTRY], total: 1 }));

    const { client } = createApiClient({ baseUrl: "https://api.test", fetch: fetchMock });
    const result = await client.auditLog.list({});

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("1");
    const [request] = fetchMock.mock.calls[0] as [Request];
    expect(request.method).toBe("GET");
    expect(new URL(request.url).pathname).toBe("/audit-log");
  });

  it("добавляет заголовок Authorization из TokenStorage перед отправкой", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0 }));
    const tokenStorage = createInMemoryTokenStorage();
    await tokenStorage.setToken("secret-token");

    const { client } = createApiClient({
      baseUrl: "https://api.test",
      fetch: fetchMock,
      tokenStorage,
    });
    await client.auditLog.list({});

    const [request] = fetchMock.mock.calls[0] as [Request];
    expect(request.headers.get("authorization")).toBe("Bearer secret-token");
  });

  it("не добавляет Authorization, если TokenStorage не передан или токена нет", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [], total: 0 }));

    const { client } = createApiClient({ baseUrl: "https://api.test", fetch: fetchMock });
    await client.auditLog.list({});

    const [request] = fetchMock.mock.calls[0] as [Request];
    expect(request.headers.get("authorization")).toBeNull();
  });

  it("при 401 вызывает onUnauthorized", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Unauthorized" }, 401));
    const onUnauthorized = vi.fn();

    const { client } = createApiClient({
      baseUrl: "https://api.test",
      fetch: fetchMock,
      onUnauthorized,
    });

    await expect(client.auditLog.list({})).rejects.toBeTruthy();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("декодирует NOT_FOUND из contract.errors в типизированный ORPCError", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          defined: true,
          code: "NOT_FOUND",
          status: 404,
          message: "Не найдено",
          data: { id: "missing" },
        },
        404,
      ),
    );

    const { client } = createApiClient({ baseUrl: "https://api.test", fetch: fetchMock });

    const error: unknown = await client.auditLog.list({}).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ORPCError);
    expect((error as ORPCError<string, unknown>).code).toBe("NOT_FOUND");
    expect((error as ORPCError<string, { id: string }>).data).toEqual({ id: "missing" });
  });

  it("повторяет запрос при 5xx до retries раз, затем возвращает последний ответ", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: "oops" }, 503))
      .mockResolvedValueOnce(jsonResponse({ items: [ENTRY], total: 1 }));

    const { client } = createApiClient({
      baseUrl: "https://api.test",
      fetch: fetchMock,
      retries: 1,
    });
    const result = await client.auditLog.list({});

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.items).toHaveLength(1);
  });
});

describe("createApiClient — кольцевой буфер запросов", () => {
  it("по умолчанию выключен — вызовы не попадают в requestLog", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ items: [], total: 0 }));
    const { client, requestLog } = createApiClient({
      baseUrl: "https://api.test",
      fetch: fetchMock,
    });

    await client.auditLog.list({});

    expect(requestLog.entries()).toHaveLength(0);
  });

  it("включённый флагом записывает метод/путь/статус/длительность/request-id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), {
        status: 200,
        headers: { "content-type": "application/json", "x-request-id": "req-1" },
      }),
    );
    const { client, requestLog } = createApiClient({
      baseUrl: "https://api.test",
      fetch: fetchMock,
      enableRequestLog: true,
    });

    await client.auditLog.list({});

    const [entry] = requestLog.entries();
    expect(entry).toMatchObject({
      method: "GET",
      path: "/audit-log",
      status: 200,
      requestId: "req-1",
    });
    expect(typeof entry?.durationMs).toBe("number");
  });
});

describe("createApiClient — интеграция с @orpc/tanstack-query", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("queryKey() из createTanstackQueryUtils адресует тот же кеш, что заполняет queryOptions()", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ items: [ENTRY], total: 1 }));
    const { client } = createApiClient({ baseUrl: "https://api.test", fetch: fetchMock });
    const utils = createTanstackQueryUtils(client);

    // queryClient.fetchQuery объявлен устаревшим — грабля 9 задания,
    // замена queryClient.query(opts).
    await queryClient.query(utils.auditLog.list.queryOptions({ input: {} }));
    const cached = queryClient
      .getQueryCache()
      .find({ queryKey: utils.auditLog.list.queryKey({ input: {} }) });

    expect(cached?.state.data).toMatchObject({ total: 1 });
    expect(cached?.state.isInvalidated).toBe(false);

    await queryClient.invalidateQueries({ queryKey: utils.auditLog.list.queryKey({ input: {} }) });

    expect(cached?.state.isInvalidated).toBe(true);
  });
});
