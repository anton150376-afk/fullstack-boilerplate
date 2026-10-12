import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { bugReportLabels } from "@boilerplate/i18n";
import { BugReportButton, type BugReportFormValues } from "@boilerplate/ui-web";

import {
  buildBugReportContext,
  installBugReportCapture,
  submitBugReport,
} from "../lib/bug-report.js";

// Рендерится только при включённом флаге — решает вызывающий код
// (__root.tsx), сам компонент безусловный (раздел "Фаза 9" задания,
// пункт 9.2).
export function BugReportTrigger() {
  const { t } = useTranslation("ui");
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => installBugReportCapture(router), [router]);

  async function handleSubmit(values: BugReportFormValues): Promise<void> {
    await submitBugReport({
      description: values.description,
      stepsToReproduce: values.stepsToReproduce,
      expectedBehavior: values.expectedBehavior,
      createdAt: new Date().toISOString(),
      context: { ...buildBugReportContext(router, queryClient), screenshot: values.screenshot },
    });
  }

  return <BugReportButton onSubmit={handleSubmit} labels={bugReportLabels(t)} />;
}
