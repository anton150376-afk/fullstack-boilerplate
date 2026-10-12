import type { BugReport, BugReportReceiver, ProductionFeedback } from "../bug-report.js";
import { formatBugReportMarkdown } from "../markdown.js";

export interface GithubReceiverConfig {
  owner: string;
  repo: string;
  token: string;
  labels?: string[];
}

function titleFor(report: BugReport | ProductionFeedback): string {
  const firstLine = report.description.split("\n")[0]?.trim();
  return firstLine && firstLine.length > 0 ? firstLine.slice(0, 80) : "Багрепорт без описания";
}

// Для передачи отчёта другому человеку (раздел "Фаза 9" задания, пункт
// 9.1) — создаёт issue через REST API напрямую (один вызов, одна правка
// заголовков), без отдельной зависимости вроде @octokit/rest.
export function createGithubReceiver(config: GithubReceiverConfig): BugReportReceiver {
  return {
    async submit(report: BugReport | ProductionFeedback): Promise<void> {
      const response = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/issues`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: titleFor(report),
            body: formatBugReportMarkdown(report),
            labels: config.labels ?? ["bug-report"],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `GitHub API отклонил создание issue: ${response.status} ${await response.text()}`,
        );
      }
    },
  };
}
