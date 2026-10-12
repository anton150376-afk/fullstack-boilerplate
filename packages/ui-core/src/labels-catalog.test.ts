import { describe, expect, it } from "vitest";

import { bugReportLabels, createI18n, fileUploadLabels } from "@boilerplate/i18n";

import { defaultBugReportLabels, defaultFileUploadLabels } from "./labels.js";

// Подписи-функции сравниваются по результату на одинаковых аргументах:
// сами функции разные (одна в каталоге, другая в ui-core).
function evaluate(labels: object): Record<string, string> {
  return Object.fromEntries(
    Object.entries(labels).map(([key, value]: [string, unknown]) => [
      key,
      typeof value === "function" ? String((value as (n: number) => unknown)(502)) : String(value),
    ]),
  );
}

// Русские подписи в ui-core и русский каталог packages/i18n описывают одни
// и те же тексты. Тест ловит расхождение: правка одной стороны без другой
// меняла бы язык интерфейса у приложения, которое подписи не передаёт.
describe("значения по умолчанию совпадают с русским каталогом", () => {
  const t = createI18n({ language: "ru" }).getFixedT("ru", "ui");

  it("BugReportButton", () => {
    expect(evaluate(bugReportLabels(t))).toEqual(evaluate(defaultBugReportLabels));
  });

  it("FileUpload", () => {
    expect(evaluate(fileUploadLabels(t))).toEqual(evaluate(defaultFileUploadLabels));
  });
});
