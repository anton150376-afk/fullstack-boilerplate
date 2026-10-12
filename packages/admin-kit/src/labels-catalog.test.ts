import { describe, expect, it } from "vitest";

import { adminLabels, createI18n } from "@boilerplate/i18n";

import {
  defaultAdminLayoutLabels,
  defaultAuditLogLabels,
  defaultDataTableLabels,
  defaultResourceFormLabels,
  defaultServicePageLabels,
  defaultSystemStatusLabels,
} from "./labels.js";

// Подписи-функции сравниваются по результату на одинаковых аргументах.
function evaluate(labels: object): Record<string, string> {
  return Object.fromEntries(
    Object.entries(labels).map(([key, value]: [string, unknown]) => [
      key,
      typeof value === "function"
        ? String((value as (...args: unknown[]) => unknown)(2, 5, 42))
        : String(value),
    ]),
  );
}

// Русские подписи admin-kit и русский каталог packages/i18n описывают одни
// и те же тексты: правка одной стороны без другой меняла бы язык
// интерфейса у приложения, которое подписи не передаёт.
describe("значения по умолчанию совпадают с русским каталогом", () => {
  const ru = adminLabels(createI18n({ language: "ru" }).getFixedT("ru", "admin"));

  it("DataTable", () => {
    expect(evaluate(ru.table)).toEqual(evaluate(defaultDataTableLabels));
  });

  it("ResourceForm", () => {
    expect(evaluate(ru.form)).toEqual(evaluate(defaultResourceFormLabels));
  });

  it("AdminLayout", () => {
    expect(evaluate(ru.layout)).toEqual(evaluate(defaultAdminLayoutLabels));
  });

  it("служебные страницы", () => {
    expect(evaluate(ru.pages)).toEqual(evaluate(defaultServicePageLabels));
  });

  it("состояние системы", () => {
    expect(evaluate(ru.system)).toEqual(evaluate(defaultSystemStatusLabels));
  });

  it("журнал действий", () => {
    expect(evaluate(ru.audit)).toEqual(evaluate(defaultAuditLogLabels));
  });
});
