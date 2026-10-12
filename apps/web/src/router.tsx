import { QueryClient } from "@tanstack/query-core";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { NotFound } from "./components/not-found.js";
import { routeTree } from "./routeTree.gen.js";

// Имя файла и экспорт getRouter — конвенция плагина tanstackStart()
// (раздел "Фаза 6" задания, пункт 2): он резолвит src/router.tsx по
// умолчанию, без явной настройки в vite.config.ts.
export function getRouter() {
  // Новый QueryClient на каждый вызов getRouter(), а не модульный синглтон:
  // на сервере это вызывается на каждый запрос, общий клиент между
  // запросами означал бы утечку кеша одного пользователя другому.
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Без этого роутер и Query кешировали бы одни и те же данные дважды
    // (раздел "Фаза 6" задания, пункт 2 со ссылкой на router-core/data-loading).
    defaultPreloadStaleTime: 0,
    // Служебная страница 404 (раздел "Фаза 8" задания, пункт 8.5) —
    // pages/service-pages.tsx не импортирует react-hook-form/table-core,
    // поэтому не тянет их в основную сборку, несмотря на общий index.ts
    // пакета admin-kit.
    defaultNotFoundComponent: NotFound,
  });

  // Сам ставит провайдер (QueryClientProvider) и дегидратацию/гидратацию —
  // раздел "Фаза 6" задания, пункт 2; грабля 10 задания:
  // routerWithQueryClient исчез, руками dehydrate/hydrate не делать.
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

// Регистрация типа роутера в модуле '@tanstack/react-start' дописывается
// автоматически в хвост src/routeTree.gen.ts самим плагином — вручную
// здесь объявлять не нужно (routerFilePath читается им же).
