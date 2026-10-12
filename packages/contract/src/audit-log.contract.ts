import { oc } from "@orpc/contract";
import { z } from "zod";

// Журнал действий (раздел "Фаза 8" задания, пункт 8.6) — только чтение
// через API; запись делают репозитории apps/server напрямую (не через
// HTTP), с заглушкой актора "system" до модуля аутентификации (M1).
export const auditLogEntrySchema = z.object({
  id: z.string(),
  actor: z.string(),
  entity: z.string(),
  entityId: z.string(),
  action: z.string(),
  occurredAt: z.coerce.date(),
});
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

export const listAuditLogInputSchema = z.object({
  entity: z.string().optional(),
  actor: z.string().optional(),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(20),
});
export type ListAuditLogInput = z.infer<typeof listAuditLogInputSchema>;

export const listAuditLogOutputSchema = z.object({
  items: z.array(auditLogEntrySchema),
  total: z.number().int().nonnegative(),
});

export const auditLogContract = oc.tag("audit-log").router({
  list: oc
    .route({ method: "GET", path: "/audit-log", summary: "Список событий журнала" })
    .input(listAuditLogInputSchema)
    .output(listAuditLogOutputSchema),
});
