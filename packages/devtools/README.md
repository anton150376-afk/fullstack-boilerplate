# @boilerplate/devtools

Сбор контекста для кнопки «сообщить о проблеме» (Фаза 9) — маршрут,
сборка, платформа, кольцевой буфер запросов, буфер логов, трейл
действий, снимок TanStack Query, маскирование секретов, markdown-формат
отчёта. Подробности — [docs/packages/devtools.md](../../docs/packages/devtools.md),
как переключить приёмник и разобрать отчёт —
[docs/guides/bug-reports.md](../../docs/guides/bug-reports.md).

```ts
import {
  createHttpBugReportReceiver,
  formatBugReportMarkdown,
  maskSecrets,
  type BugReport,
  type BugReportReceiver,
} from "@boilerplate/devtools";
// Серверные приёмники (node:fs, GitHub API) — отдельный подпуть,
// не тянется в браузерный/RN-бандл главной точки входа.
import { createFileReceiver, createGithubReceiver } from "@boilerplate/devtools/receivers";
```
