import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));

// apps/server/src/dev-bug-reports (в разработке) или
// apps/server/dist/dev-bug-reports (после сборки) — одна и та же глубина
// до корня монорепозитория в обоих случаях (tsconfig.build.json сохраняет
// структуру каталогов), поэтому путь не зависит от process.cwd(), которым
// управляет turbo/pnpm, а не этот модуль.
export const BUGS_DIRECTORY = resolve(moduleDir, "../../../../.bugs");

// Политика размера — решение сервера, не то, что просит клиент (тот же
// принцип, что у MAX_UPLOAD_BYTES в apps/server/src/files/files.constants.ts).
// Снимок экрана в base64 — самая тяжёлая часть отчёта, 5 МБ хватает на
// один скриншот с запасом.
export const MAX_BUG_REPORT_BYTES = 5 * 1024 * 1024;
