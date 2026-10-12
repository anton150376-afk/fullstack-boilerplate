import { z } from "zod";

// Зеркало BugReport/ProductionFeedback (@boilerplate/devtools/src/bug-report.ts)
// как zod-схема — проверка происходит здесь, на границе HTTP, куда
// приходит недоверенный вход. Сами интерфейсы в devtools остаются
// простыми типами: их проверяет компилятор у вызывающего клиентского
// кода, этому эндпоинту доверять клиенту нечем.
const requestLogEntrySchema = z.object({
  method: z.string(),
  path: z.string(),
  status: z.number(),
  durationMs: z.number(),
  requestId: z.string().optional(),
});

const logEntrySchema = z.object({
  level: z.enum(["error", "warn", "unhandledRejection", "uncaughtException"]),
  message: z.string(),
  timestamp: z.string(),
});

const actionTrailEntrySchema = z.object({
  type: z.enum(["navigation", "press", "submit"]),
  label: z.string(),
  timestamp: z.string(),
});

const querySnapshotEntrySchema = z.object({
  key: z.string(),
  status: z.enum(["pending", "error", "success"]),
  isError: z.boolean(),
  dataUpdatedAt: z.number(),
});

const bugReportContextSchema = z.object({
  route: z.object({ path: z.string(), params: z.record(z.string(), z.string()) }),
  build: z.object({ version: z.string(), gitSha: z.string() }),
  environment: z.string(),
  platform: z.object({
    os: z.string(),
    osVersion: z.string(),
    device: z.string(),
    screen: z.object({ width: z.number(), height: z.number() }),
    locale: z.string(),
  }),
  requestLog: z.array(requestLogEntrySchema),
  logs: z.array(logEntrySchema),
  actionTrail: z.array(actionTrailEntrySchema),
  queries: z.array(querySnapshotEntrySchema),
  screenshot: z.string().optional(),
});

const bugReportSchema = z.object({
  description: z.string().min(1),
  stepsToReproduce: z.string(),
  expectedBehavior: z.string(),
  context: bugReportContextSchema,
  createdAt: z.string(),
});

const productionFeedbackSchema = z.object({
  description: z.string().min(1),
  route: z.string(),
  buildVersion: z.string(),
  createdAt: z.string(),
});

// Полный отчёт отличается от урезанного отзыва наличием context — zod
// пробует схемы по порядку и останавливается на первом совпадении формы.
export const bugReportRequestSchema = z.union([bugReportSchema, productionFeedbackSchema]);

export type BugReportRequest = z.infer<typeof bugReportRequestSchema>;
