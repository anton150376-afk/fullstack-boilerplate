import { createApiClient, createTanstackQueryUtils } from "@boilerplate/api-client";

import { getApiBaseUrl } from "./api-url.js";

// Синглтон на модуль — до модуля аутентификации (M1, ROADMAP) клиент не
// хранит ничего специфичного для запроса (TokenStorage не подключён),
// поэтому общий экземпляр на сервере между запросами безопасен. Когда
// появится M1, это место пересматривается: токен должен приходить за
// запрос, а не жить в модульном синглтоне.
// requestLog — кольцевой буфер последних запросов для багрепорта (раздел
// "Фаза 9" задания, пункт 9.1); экспортируется, чтобы собрать его в
// контекст отчёта, когда пользователь нажимает «Сообщить о проблеме».
export const { client, requestLog } = createApiClient({
  baseUrl: getApiBaseUrl(),
  enableRequestLog: true,
});

export const api = createTanstackQueryUtils(client);
