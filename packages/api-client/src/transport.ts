import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { OpenAPILink } from "@orpc/openapi-client/fetch";

import { contract } from "@boilerplate/contract";

import { createRequestLog, type RequestLog } from "./request-log.js";
import type { TokenStorage } from "./token-storage.js";

// Сервер отвечает по OpenAPI-маршрутам контракта (REST-пути, не единая
// RPC-точка), поэтому клиент — OpenAPILink, а не RPCLink (раздел "Фаза 5"
// задания, пункт 5.2: ImplementInterceptor сериализует ответ тем же
// StandardOpenAPICodec, что и генератор /openapi.json).
export type ApiClient = ContractRouterClient<typeof contract>;

export interface CreateApiClientOptions {
  /** Базовый адрес сервера, например "https://api.example.com". */
  baseUrl: string;
  /** Платформенное хранилище токена — своё для веба и для мобильного (Фазы 6–7). */
  tokenStorage?: TokenStorage;
  /** Вызывается при 401 — обычно сброс токена и переход на экран входа. */
  onUnauthorized?: () => void | Promise<void>;
  /** Подмена сети в тестах; по умолчанию платформенный fetch. */
  fetch?: typeof fetch;
  timeoutMs?: number;
  /** Повторы при 5xx и сетевых ошибках, без повтора по умолчанию. */
  retries?: number;
  /**
   * Кольцевой буфер последних запросов для багрепорта (Фаза 9). По
   * умолчанию выключен — в том числе в продакшене (раздел "Фаза 5"
   * задания, пункт 5.3); включается явно вызывающим кодом веба/мобильного,
   * который знает своё окружение.
   */
  enableRequestLog?: boolean;
}

export interface ApiClientResult {
  client: ApiClient;
  requestLog: RequestLog;
}

export function createApiClient(options: CreateApiClientOptions): ApiClientResult {
  const requestLog = createRequestLog();
  const fetchImpl = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const retries = options.retries ?? 0;
  const enableRequestLog = options.enableRequestLog ?? false;

  const link = new OpenAPILink(contract, {
    url: options.baseUrl,
    fetch: (request, init) => fetchWithResilience(fetchImpl, request, init, timeoutMs, retries),
    adapterInterceptors: [
      async (interceptorOptions) => {
        const token = await options.tokenStorage?.getToken();
        if (token) {
          interceptorOptions.request.headers.set("Authorization", `Bearer ${token}`);
        }

        const startedAt = Date.now();
        const response = await interceptorOptions.next();

        if (enableRequestLog) {
          requestLog.record({
            method: interceptorOptions.request.method,
            path: new URL(interceptorOptions.request.url).pathname,
            status: response.status,
            durationMs: Date.now() - startedAt,
            requestId: response.headers.get("x-request-id") ?? undefined,
          });
        }

        if (response.status === 401) {
          await options.onUnauthorized?.();
        }

        return response;
      },
    ],
  });

  const client = createORPCClient<ApiClient>(link);

  return { client, requestLog };
}

// Таймаут и повторы — свойства самого сетевого вызова, а не того, что
// происходит с запросом/ответом (это — adapterInterceptors выше), поэтому
// разведены по разным параметрам OpenAPILink. request.clone() обязателен:
// тело Request читается один раз, повтор без клона завершился бы ошибкой
// на втором чтении.
async function fetchWithResilience(
  fetchImpl: typeof fetch,
  request: Request,
  init: { redirect?: Request["redirect"] },
  timeoutMs: number,
  retries: number,
): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetchImpl(request.clone(), {
        redirect: init.redirect,
        signal: controller.signal,
      });
      if (response.status >= 500 && attempt < retries) {
        continue;
      }
      return response;
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
