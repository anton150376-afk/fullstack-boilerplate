import type { BugReport, ProductionFeedback } from "./bug-report.js";
import { maskSecrets } from "./masking.js";

function isBugReport(report: BugReport | ProductionFeedback): report is BugReport {
  return "context" in report;
}

// Формат, который читает скилл bug-triage (.claude/skills/bug-triage/SKILL.md,
// шаг 1 "Контекст") — маршрут, версия сборки, платформа, буфер запросов
// с request-id, трейл действий, снимок TanStack Query, каждый раздел —
// отдельный заголовок, не единый JSON-дамп, чтобы читать глазами было
// так же легко, как автоматически.
export function formatBugReportMarkdown(report: BugReport | ProductionFeedback): string {
  const masked = maskSecrets(report) as BugReport | ProductionFeedback;

  if (!isBugReport(masked)) {
    return [
      "# Отзыв пользователя (продакшен)",
      "",
      `**Создан:** ${masked.createdAt}`,
      `**Маршрут:** ${masked.route}`,
      `**Версия сборки:** ${masked.buildVersion}`,
      "",
      "## Описание",
      "",
      masked.description,
    ].join("\n");
  }

  const { context } = masked;
  const lines: string[] = [
    "# Отчёт об ошибке",
    "",
    `**Создан:** ${masked.createdAt}`,
    `**Маршрут:** ${context.route.path}`,
    `**Окружение:** ${context.environment}`,
    `**Сборка:** ${context.build.version} (${context.build.gitSha})`,
    `**Платформа:** ${context.platform.os} ${context.platform.osVersion}, ${context.platform.device}, ${context.platform.screen.width}×${context.platform.screen.height}, ${context.platform.locale}`,
    "",
    "## Описание",
    "",
    masked.description,
    "",
    "## Шаги воспроизведения",
    "",
    masked.stepsToReproduce,
    "",
    "## Ожидаемое поведение",
    "",
    masked.expectedBehavior,
    "",
    "## Последние запросы",
    "",
    "| Метод | Путь | Статус | Длительность | request-id |",
    "| --- | --- | --- | --- | --- |",
    ...context.requestLog.map(
      (entry) =>
        `| ${entry.method} | ${entry.path} | ${entry.status} | ${entry.durationMs}мс | ${entry.requestId ?? "—"} |`,
    ),
    "",
    "## Трейл действий",
    "",
    ...context.actionTrail.map((entry) => `- [${entry.timestamp}] ${entry.type}: ${entry.label}`),
    "",
    "## Снимок TanStack Query",
    "",
    "| Ключ | Статус | Ошибка | Обновлён |",
    "| --- | --- | --- | --- |",
    ...context.queries.map(
      (query) =>
        `| ${query.key} | ${query.status} | ${query.isError ? "да" : "нет"} | ${new Date(query.dataUpdatedAt).toISOString()} |`,
    ),
    "",
    "## Журнал",
    "",
    ...context.logs.map((entry) => `- [${entry.timestamp}] (${entry.level}) ${entry.message}`),
  ];

  if (context.screenshot) {
    lines.push("", "## Снимок экрана", "", `![снимок](${context.screenshot})`);
  }

  return lines.join("\n");
}
