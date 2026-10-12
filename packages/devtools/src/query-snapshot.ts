import type { QueryClient } from "@tanstack/query-core";

import type { QuerySnapshotEntry } from "./bug-report.js";

// Снимок кеша TanStack Query — только ключ/статус/время обновления
// (раздел "Фаза 9" задания, пункт 9.1): данные запросов в отчёт не попадают,
// только форма QuerySnapshotEntry, уже описанная в bug-report.ts.
export function snapshotQueryCache(queryClient: QueryClient): QuerySnapshotEntry[] {
  return queryClient
    .getQueryCache()
    .getAll()
    .map((query) => ({
      key: query.queryHash,
      status: query.state.status,
      isError: query.state.status === "error",
      dataUpdatedAt: query.state.dataUpdatedAt,
    }));
}
