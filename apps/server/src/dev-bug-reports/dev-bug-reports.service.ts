import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { BugReport, BugReportReceiver, ProductionFeedback } from "@boilerplate/devtools";
import {
  createApiReceiver,
  createFileReceiver,
  createGithubReceiver,
  type GithubReceiverConfig,
} from "@boilerplate/devtools/receivers";

import type { Env } from "../config/env.schema.js";
import { BUGS_DIRECTORY } from "./dev-bug-reports.constants.js";
import type { BugReportRequest } from "./dev-bug-reports.dto.js";

@Injectable()
export class DevBugReportsService {
  private readonly receiver: BugReportReceiver;

  constructor(config: ConfigService<Env, true>) {
    this.receiver = createReceiver(config);
  }

  submit(report: BugReportRequest): Promise<void> {
    return this.receiver.submit(toDomainReport(report));
  }
}

// zod .optional() делает ключ необязательным (`requestId?:`), а
// RequestLogEntry в @boilerplate/api-client объявляет его обязательным
// ключом со значением string | undefined — разные формы одного и того
// же на уровне типов. Явный литерал ниже даёт нужную форму без приведения
// типов: присваивание ключу в литерале всегда делает его обязательным,
// независимо от типа значения.
function toDomainReport(report: BugReportRequest): BugReport | ProductionFeedback {
  if (!("context" in report)) {
    return report;
  }
  return {
    ...report,
    context: {
      ...report.context,
      requestLog: report.context.requestLog.map((entry) => ({
        method: entry.method,
        path: entry.path,
        status: entry.status,
        durationMs: entry.durationMs,
        requestId: entry.requestId,
      })),
    },
  };
}

function createReceiver(config: ConfigService<Env, true>): BugReportReceiver {
  const kind = config.get("BUG_REPORT_RECEIVER", { infer: true });
  switch (kind) {
    case "github":
      return createGithubReceiver(requireGithubConfig(config));
    case "api":
      return createApiReceiver();
    case "file":
      return createFileReceiver({ directory: BUGS_DIRECTORY });
  }
}

function requireGithubConfig(config: ConfigService<Env, true>): GithubReceiverConfig {
  const owner = config.get("BUG_REPORT_GITHUB_OWNER", { infer: true });
  const repo = config.get("BUG_REPORT_GITHUB_REPO", { infer: true });
  const token = config.get("BUG_REPORT_GITHUB_TOKEN", { infer: true });
  if (!owner || !repo || !token) {
    // validateEnv (apps/server/src/config/env.schema.ts) не даёт серверу
    // стартовать в этом состоянии — сюда дорога только при обходе DI.
    throw new Error("BUG_REPORT_RECEIVER=github без полной конфигурации GitHub");
  }
  return { owner, repo, token };
}
