import { describe, expect, it } from "vitest";

import type { BugReport, ProductionFeedback } from "./bug-report.js";
import { formatBugReportMarkdown } from "./markdown.js";

function createReport(overrides: Partial<BugReport> = {}): BugReport {
  return {
    description: "Кнопка не работает",
    stepsToReproduce: "1. Открыть /notes\n2. Нажать «Добавить»",
    expectedBehavior: "Заметка должна появиться в списке",
    createdAt: "2026-10-09T10:00:00.000Z",
    context: {
      route: { path: "/notes", params: {} },
      build: { version: "1.2.3", gitSha: "abc1234" },
      environment: "production",
      platform: {
        os: "web",
        osVersion: "",
        device: "desktop",
        screen: { width: 1920, height: 1080 },
        locale: "ru-RU",
      },
      requestLog: [
        { method: "POST", path: "/notes", status: 500, durationMs: 120, requestId: "req-1" },
      ],
      logs: [],
      actionTrail: [
        { type: "press", label: "add-note-button", timestamp: "2026-10-09T09:59:00.000Z" },
      ],
      queries: [],
    },
    ...overrides,
  };
}

// Критерий приёмки Фазы 9: отчёт о заведомо сломанном запросе
// позволяет найти серверные логи по request-id — здесь проверяется,
// что request-id реально попадает в текст отчёта, не только в данные.
describe("formatBugReportMarkdown", () => {
  it("включает request-id запроса в таблицу, чтобы найти серверные логи", () => {
    const markdown = formatBugReportMarkdown(createReport());

    expect(markdown).toContain("req-1");
    expect(markdown).toContain("/notes");
    expect(markdown).toContain("500");
  });

  it("маскирует секрет, даже если он попал в свободный текст описания", () => {
    const report = createReport({
      description: "Запрос с Authorization: Bearer leaked-token-123 не прошёл",
    });

    const markdown = formatBugReportMarkdown(report);

    expect(markdown).not.toContain("leaked-token-123");
    expect(markdown).toContain("Bearer [masked]");
  });

  it("продакшен-отзыв даёт урезанный markdown без разделов логов/сети/трейла", () => {
    const feedback: ProductionFeedback = {
      description: "Не нравится цвет кнопки",
      route: "/notes",
      buildVersion: "1.2.3",
      createdAt: "2026-10-09T10:00:00.000Z",
    };

    const markdown = formatBugReportMarkdown(feedback);

    expect(markdown).toContain("Не нравится цвет кнопки");
    expect(markdown).not.toContain("## Последние запросы");
    expect(markdown).not.toContain("## Журнал");
  });
});
