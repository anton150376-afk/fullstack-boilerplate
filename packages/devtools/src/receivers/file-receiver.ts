import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { BugReport, BugReportReceiver, ProductionFeedback } from "../bug-report.js";
import { formatBugReportMarkdown } from "../markdown.js";

export interface FileReceiverConfig {
  /** Каталог для markdown-отчётов — на сервере это `.bugs/` в корне репозитория. */
  directory: string;
}

// Приёмник по умолчанию (раздел "Фаза 9" задания, пункт 9.1). Имя файла
// собирается здесь, не из отчёта — требование пункта 9.3 "имя файла
// формируется сервером", чтобы клиент не мог продиктовать путь записи.
export function createFileReceiver(config: FileReceiverConfig): BugReportReceiver {
  return {
    async submit(report: BugReport | ProductionFeedback): Promise<void> {
      await mkdir(config.directory, { recursive: true });
      const filename = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}.md`;
      await writeFile(join(config.directory, filename), formatBugReportMarkdown(report), "utf8");
    },
  };
}
