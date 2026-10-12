import { createApiClient, createTanstackQueryUtils } from "@boilerplate/api-client";

import { createSecureTokenStorage } from "./token-storage.js";

// EXPO_PUBLIC_-префикс — единственный способ Metro вшить переменную
// окружения в клиентский бандл (babel-preset-expo/inline-env-vars),
// аналог VITE_-префикса у apps/web.
// requestLog — кольцевой буфер последних запросов для багрепорта (раздел
// "Фаза 9" задания, пункт 9.1); экспортируется, чтобы собрать его в
// контекст отчёта, когда пользователь нажимает «Сообщить о проблеме».
export const { client, requestLog } = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
  tokenStorage: createSecureTokenStorage(),
  enableRequestLog: true,
});

export const api = createTanstackQueryUtils(client);
