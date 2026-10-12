import type { RequestLogEntry } from "@boilerplate/api-client";

// Полная форма контекста (раздел "Фаза 9" задания, пункт 9.1) — у всех
// трёх приложений теперь есть что собирать (apps/web — Фаза 6,
// apps/mobile — Фаза 7, journal — Фаза 8). Поля ТОЛЬКО примитивные/
// плоские там, где могут содержать пользовательский ввод (trail —
// ниже) — максируется не здесь постфактум, а структурой данных: для
// значений полей формы просто нет места.
export interface BugReportContext {
  route: { path: string; params: Record<string, string> };
  build: { version: string; gitSha: string };
  environment: string;
  platform: {
    os: string;
    osVersion: string;
    device: string;
    screen: { width: number; height: number };
    locale: string;
  };
  /** Последние 20 запросов из api-client — главная причина, по которой request-id вообще собирается. */
  requestLog: readonly RequestLogEntry[];
  /** console.error/warn, необработанные исключения и отказы промисов — см. src/log-buffer.ts. */
  logs: readonly LogEntry[];
  /** Переходы, нажатия, отправки форм — БЕЗ значений полей, см. src/action-trail.ts. */
  actionTrail: readonly ActionTrailEntry[];
  /** Ключ/статус/факт ошибки/время обновления — не данные запроса, см. src/query-snapshot.ts. */
  queries: readonly QuerySnapshotEntry[];
  /** Вложение по кнопке «приложить снимок» (веб) или react-native-view-shot (мобильный) — data URL, опционально. */
  screenshot?: string;
}

export interface LogEntry {
  level: "error" | "warn" | "unhandledRejection" | "uncaughtException";
  message: string;
  timestamp: string;
}

export interface ActionTrailEntry {
  type: "navigation" | "press" | "submit";
  label: string;
  timestamp: string;
}

export interface QuerySnapshotEntry {
  key: string;
  status: "pending" | "error" | "success";
  isError: boolean;
  dataUpdatedAt: number;
}

export interface BugReport {
  description: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  context: BugReportContext;
  createdAt: string;
}

// Урезанная форма для продакшен-отзыва (раздел "Фаза 9" задания, пункт
// 9.4) — только текст, маршрут и версия сборки, без логов/сети/трейла/
// снимков. Отдельный тип, не Partial<BugReport>: Partial разрешил бы
// случайно передать логи/трейл там, где это ролью запрещено.
export interface ProductionFeedback {
  description: string;
  route: string;
  buildVersion: string;
  createdAt: string;
}

// Та же схема адаптеров, что у биллинга и уведомлений (ROADMAP, M3/M4):
// ядро не знает, куда уходит отчёт. Реализации — src/receivers/.
export interface BugReportReceiver {
  submit(report: BugReport | ProductionFeedback): Promise<void>;
}
