import type { QueryClient } from "@tanstack/query-core";
import * as Localization from "expo-localization";
import { Dimensions, Platform, type ErrorUtils } from "react-native";

import {
  createActionTrail,
  createHttpBugReportReceiver,
  createLogBuffer,
  snapshotQueryCache,
  type BugReport,
  type BugReportContext,
} from "@boilerplate/devtools";

import { requestLog } from "./api.js";

// Синглтоны на модуль, не на рендер — буферы переживают переходы между
// экранами (раздел "Фаза 9" задания, пункт 9.1).
export const logBuffer = createLogBuffer();
export const actionTrail = createActionTrail();

let installed = false;

// Перехват console.error/warn — из ядра; необработанные исключения —
// платформенный API, на RN это ErrorUtils (раздел 9.1 задания). Отказы
// промисов на RN не имеют единого глобального события уровня платформы
// (в отличие от window.onunhandledrejection на вебе) — не перехватываются
// здесь. Трейл действий (навигация/нажатия) на мобильном не собирается
// автоматически в этой фазе: у Expo Router нет готового общего шины
// событий навигации, а автосбор нажатий потребовал бы оборачивать каждый
// интерактивный элемент — actionTrail.entries() в контексте всегда "[]",
// это намеренно, не недосмотр (requestLog/logs — главное, что отличает
// отчёт от «не работает кнопка», раздел "Фаза 9" задания, цель).
export function installBugReportCapture(): () => void {
  if (installed) {
    return () => undefined;
  }
  installed = true;

  const uninstallConsole = logBuffer.installConsoleInterceptor();

  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtils }).ErrorUtils;
  const previousHandler = errorUtils?.getGlobalHandler();
  errorUtils?.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    logBuffer.record("uncaughtException", error instanceof Error ? error.message : String(error));
    previousHandler?.(error, isFatal);
  });

  return () => {
    installed = false;
    uninstallConsole();
    if (previousHandler) {
      errorUtils?.setGlobalHandler(previousHandler);
    }
  };
}

export function buildBugReportContext(
  route: { path: string; params: Record<string, string> },
  queryClient: QueryClient,
): Omit<BugReportContext, "screenshot"> {
  const { width, height } = Dimensions.get("window");
  return {
    route,
    build: {
      version: process.env.EXPO_PUBLIC_BUILD_VERSION ?? "0.0.0",
      gitSha: process.env.EXPO_PUBLIC_GIT_SHA ?? "unknown",
    },
    environment: process.env.NODE_ENV,
    platform: {
      os: Platform.OS,
      osVersion: String(Platform.Version),
      device: Platform.OS,
      screen: { width, height },
      locale: Localization.getLocales()[0].languageTag,
    },
    requestLog: requestLog.entries(),
    logs: logBuffer.entries(),
    actionTrail: actionTrail.entries(),
    queries: snapshotQueryCache(queryClient),
  };
}

// createHttpBugReportReceiver — изоморфный приёмник из packages/devtools,
// тот же, что у apps/web (раздел "Фаза 9" задания, пункт 9.3). Эндпоинт
// существует только при NODE_ENV !== "production", поэтому в проде этот
// запрос получает 404 сам по себе — кнопка там и не рендерится (флаг
// EXPO_PUBLIC_ENABLE_BUG_REPORTS).
const httpReceiver = createHttpBugReportReceiver({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
});

export function submitBugReport(report: BugReport): Promise<void> {
  return httpReceiver.submit(report);
}
