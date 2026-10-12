// `pnpm build` (dist/server/server.js) отдаёт только { fetch } —
// WHATWG-обработчик без своего HTTP-сервера; в этой версии
// @tanstack/react-start нет ни Nitro, ни готового `.output/`, которые
// предполагал SKILL.md пакета ("node .output/server/index.mjs") —
// найдено реальной сборкой, не по документации (docs/apps/web.md).
// srvx — тот же мост fetch↔Node, которым h3/start-server-core пользуется
// внутри себя (транзитивная зависимость @tanstack/start-server-core,
// версия здесь зафиксирована той же, 0.11.22, чтобы не держать в дереве
// два расходящихся экземпляра).
//
// Статику клиента (dist/client: скрипты, стили, шрифты) обработчик SSR не
// отдаёт — только HTML. Без serveStatic страница приходила без стилей и без
// JavaScript, то есть не гидратировалась: все запросы /assets/* получали 404
// (найдено сквозным тестом в настоящем браузере, apps/web/e2e).
import { fileURLToPath } from "node:url";

import { serve } from "srvx";
import { serveStatic } from "srvx/static";

import server from "./dist/server/server.js";

// PORT по умолчанию — из переменной окружения или 3000 (поведение srvx).
serve({
  fetch: server.fetch,
  middleware: [serveStatic({ dir: fileURLToPath(new URL("./dist/client", import.meta.url)) })],
});
