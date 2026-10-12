// Отдельный файл без тяжёлых импортов (не в bug-report.ts, который тянет
// api-client → @orpc/contract — чисто ESM, Jest не умеет require() такое
// без transformIgnorePatterns, найдено этим же тестом). Тот же приём,
// что у shouldRegisterDevBugReports на сервере (раздел "Фаза 9" задания,
// критерии приёмки — "кнопка не рендерится").
export function isBugReportsEnabled(value: string | undefined): boolean {
  return value === "true";
}
