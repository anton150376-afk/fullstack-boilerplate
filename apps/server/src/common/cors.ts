import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface.js";

// Браузер блокирует ответ API, если страница загружена с другого адреса
// (веб на :3001, API на :3000) и в ответе нет Access-Control-Allow-Origin;
// сервер при этом отвечает 200, и в его журнале ничего не видно. Найдено
// сквозным тестом в настоящем браузере (apps/web/e2e): не работали ни
// клиентские запросы, ни отправка багрепорта.
//
// Список адресов — CORS_ORIGINS (docs/operations/env-vars.md). Пустой список
// оставляет CORS выключенным: так и нужно, когда веб и API отдаются с одного
// адреса, например за общим обратным прокси.
export function createCorsOptions(origins: readonly string[]): CorsOptions | undefined {
  if (origins.length === 0) {
    return undefined;
  }
  return {
    origin: [...origins],
    // Без этого JavaScript страницы не видит X-Request-Id чужого источника, и
    // журнал запросов в багрепорте остаётся без идентификаторов
    // (packages/api-client читает заголовок именно из ответа).
    exposedHeaders: ["X-Request-Id"],
    // Куки пока не используются (аутентификации нет, M1 в ROADMAP): credentials
    // остаются выключенными, чтобы не разрешать лишнего.
    maxAge: 600,
  };
}
