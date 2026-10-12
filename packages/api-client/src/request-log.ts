// Кольцевой буфер последних двадцати запросов для багрепорта (раздел
// "Фаза 5" задания, пункт 5.3; полная сборка контекста — Фаза 9). Поля —
// ровно те, что перечислены в задании: метод, путь, статус, длительность,
// request-id. Заголовки и тела запроса сюда никогда не попадают — это
// сильнее маскирования постфактум: токену и паролю просто негде
// оказаться в записи, потому что для них нет поля (см. тест).
export interface RequestLogEntry {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  requestId: string | undefined;
}

export interface RequestLog {
  entries(): readonly RequestLogEntry[];
  record(entry: RequestLogEntry): void;
}

const MAX_ENTRIES = 20;

export function createRequestLog(): RequestLog {
  const buffer: RequestLogEntry[] = [];

  return {
    entries: () => buffer.slice(),
    record(entry) {
      buffer.push(entry);
      if (buffer.length > MAX_ENTRIES) {
        buffer.shift();
      }
    },
  };
}
