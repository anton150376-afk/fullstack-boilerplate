import { auditLogContract } from "./audit-log.contract.js";
import { filesContract } from "./files.contract.js";
import { notesContract } from "./notes.contract.js";
import { tasksContract } from "./tasks.contract.js";

// Раскладка по доменам (раздел "Фаза 5" задания, пункт 5.1): новый модуль
// добавляет свой файл *.contract.ts и свою запись здесь, не трогая
// существующие домены. "health" сюда не входит — это обычный REST поверх
// terminus (apps/server/src/health), а не бизнес-операция через oRPC;
// причина — в docs/packages/contract.md.
export const contract = {
  notes: notesContract,
  tasks: tasksContract,
  files: filesContract,
  auditLog: auditLogContract,
};

export * from "./audit-log.contract.js";
export * from "./files.contract.js";
export * from "./notes.contract.js";
export * from "./tasks.contract.js";
