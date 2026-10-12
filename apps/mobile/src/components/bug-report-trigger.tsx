import { useQueryClient } from "@tanstack/react-query";
import { useGlobalSearchParams, usePathname } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { captureScreen } from "react-native-view-shot";

import { bugReportLabels } from "@boilerplate/i18n";
import { BugReportButton, type BugReportFormValues } from "@boilerplate/ui-native";

import {
  buildBugReportContext,
  installBugReportCapture,
  submitBugReport,
} from "../lib/bug-report.js";

// Рендерится только при включённом флаге — решает вызывающий код
// (_layout.tsx), сам компонент безусловный (раздел "Фаза 9" задания,
// пункт 9.2).
export function BugReportTrigger() {
  const { t } = useTranslation("ui");
  const pathname = usePathname();
  const params = useGlobalSearchParams<Record<string, string>>();
  const queryClient = useQueryClient();

  useEffect(() => installBugReportCapture(), []);

  async function captureScreenshot(): Promise<string | undefined> {
    try {
      return await captureScreen({ format: "png", result: "data-uri" });
    } catch {
      // Снимок — необязательная часть отчёта (раздел 9.1 задания); сбой
      // захвата не должен блокировать отправку остального контекста.
      return undefined;
    }
  }

  async function handleSubmit(values: BugReportFormValues): Promise<void> {
    await submitBugReport({
      description: values.description,
      stepsToReproduce: values.stepsToReproduce,
      expectedBehavior: values.expectedBehavior,
      createdAt: new Date().toISOString(),
      context: {
        ...buildBugReportContext({ path: pathname, params }, queryClient),
        screenshot: values.screenshot,
      },
    });
  }

  return (
    <BugReportButton
      onSubmit={handleSubmit}
      captureScreenshot={captureScreenshot}
      labels={bugReportLabels(t)}
    />
  );
}
