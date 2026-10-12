import type { BugReport, BugReportReceiver, ProductionFeedback } from "../bug-report.js";

export interface HttpReceiverConfig {
  /** Базовый адрес сервера — dev-эндпоинт пишет markdown в .bugs/ (раздел "Фаза 9" задания, пункт 9.3). */
  baseUrl: string;
}

// Приёмник на стороне веба/мобильного — единственная причина написать
// его здесь, а не инлайн-fetch в apps/web/apps/mobile: прямые вызовы
// fetch вне packages/api-client запрещены линтом в React-коде
// (packages/eslint-config/react.js, noDirectNetwork), а этот пакет —
// обычный Node-профиль, где fetch не под запретом (как и у
// github-receiver.ts). Эндпоинт существует только при NODE_ENV !==
// "production" (apps/server/src/app.module.ts), поэтому в проде этот
// запрос получает 404 сам по себе — кнопка там и не рендерится (флаг).
export function createHttpBugReportReceiver(config: HttpReceiverConfig): BugReportReceiver {
  return {
    async submit(report: BugReport | ProductionFeedback): Promise<void> {
      const response = await fetch(`${config.baseUrl}/dev/bug-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      if (!response.ok) {
        throw new Error(`Сервер отклонил отчёт (${response.status})`);
      }
    },
  };
}
