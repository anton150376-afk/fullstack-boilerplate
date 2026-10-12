import type { QueryClient } from "@tanstack/query-core";
import type { AnyRouter } from "@tanstack/react-router";

import {
  createActionTrail,
  createHttpBugReportReceiver,
  createLogBuffer,
  snapshotQueryCache,
  type BugReport,
  type BugReportContext,
} from "@boilerplate/devtools";

import { requestLog } from "./api.js";

// Синглтоны на модуль, не на рендер — буферы переживают навигацию между
// маршрутами (раздел "Фаза 9" задания, пункт 9.1).
export const logBuffer = createLogBuffer();
export const actionTrail = createActionTrail();

let installed = false;

// Перехват console.error/warn — из ядра (packages/devtools); необработанные
// исключения и отказы промисов — платформенный API, на вебе это
// window.addEventListener("error"/"unhandledrejection") (раздел 9.1 задания).
// Трейл нажатий — только атрибут data-testid, не значение поля
// ("Значения полей не записываются" — то же правило).
export function installBugReportCapture(router: AnyRouter): () => void {
  if (installed) {
    return () => undefined;
  }
  installed = true;

  const uninstallConsole = logBuffer.installConsoleInterceptor();

  function handleError(event: ErrorEvent): void {
    logBuffer.record("uncaughtException", event.message);
  }
  function handleRejection(event: PromiseRejectionEvent): void {
    logBuffer.record("unhandledRejection", String(event.reason));
  }
  function handleClick(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target.closest("[data-testid]") : null;
    const testId = target?.getAttribute("data-testid");
    if (testId) {
      actionTrail.record("press", testId);
    }
  }

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);
  window.addEventListener("click", handleClick, { capture: true });
  const unsubscribeRouter = router.subscribe("onResolved", (event) => {
    actionTrail.record("navigation", event.toLocation.pathname);
  });

  return () => {
    installed = false;
    uninstallConsole();
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
    window.removeEventListener("click", handleClick, { capture: true });
    unsubscribeRouter();
  };
}

export function buildBugReportContext(
  router: AnyRouter,
  queryClient: QueryClient,
): Omit<BugReportContext, "screenshot"> {
  const lastMatch = router.state.matches.at(-1);
  return {
    route: {
      path: router.state.location.pathname,
      params: Object.fromEntries(
        Object.entries(lastMatch?.params ?? {}).map(([key, value]) => [key, String(value)]),
      ),
    },
    build: {
      version: import.meta.env.VITE_BUILD_VERSION,
      gitSha: import.meta.env.VITE_GIT_SHA,
    },
    environment: import.meta.env.MODE,
    platform: {
      os: "web",
      osVersion: "",
      device: navigator.userAgent,
      screen: { width: window.screen.width, height: window.screen.height },
      locale: navigator.language,
    },
    requestLog: requestLog.entries(),
    logs: logBuffer.entries(),
    actionTrail: actionTrail.entries(),
    queries: snapshotQueryCache(queryClient),
  };
}

// createHttpBugReportReceiver — не инлайн-fetch: прямые вызовы fetch вне
// packages/api-client запрещены линтом в React-коде (noDirectNetwork,
// packages/eslint-config/react.js); devtools — обычный Node-профиль,
// где fetch не под запретом. Эндпоинт существует только при NODE_ENV !==
// "production" (apps/server/src/app.module.ts), поэтому в проде этот
// запрос естественно получает 404 — кнопка там и не рендерится (флаг
// VITE_ENABLE_BUG_REPORTS), но даже отправленный вручную запрос ничего
// не находит.
const httpReceiver = createHttpBugReportReceiver({ baseUrl: import.meta.env.VITE_API_URL });

export function submitBugReport(report: BugReport): Promise<void> {
  return httpReceiver.submit(report);
}
