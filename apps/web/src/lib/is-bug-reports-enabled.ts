// Отдельный файл без тяжёлых импортов (не в bug-report.ts) — тот же
// приём, что у shouldRegisterDevBugReports на сервере: проверяется без
// рендера всего корневого маршрута с роутером/i18n/SSR (раздел "Фаза 9"
// задания, критерии приёмки — "кнопка не рендерится").
export function isBugReportsEnabled(value: string | undefined): boolean {
  return value === "true";
}
