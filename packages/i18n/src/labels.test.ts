import { describe, expect, it } from "vitest";

import { createI18n } from "./init.js";
import { adminLabels, bugReportLabels, fileUploadLabels } from "./labels.js";

// i18next возвращает сам ключ, если перевода нет. Лист подписи, похожий
// на путь ключа ("table.empty"), значит: ключ в каталоге этого языка
// забыт или опечатан.
const KEY_PATH = /^[a-z][A-Za-z]*(\.[A-Za-z]+)+$/;

function leaves(value: unknown, path = ""): { path: string; text: string }[] {
  if (typeof value === "string") return [{ path, text: value }];
  if (typeof value === "function") {
    const result = (value as (...args: unknown[]) => unknown)(2, 5, 42);
    return typeof result === "string" ? [{ path, text: result }] : [];
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, inner]) =>
      leaves(inner, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

describe.each(["ru", "en"] as const)("подписи компонентов, язык %s", (language) => {
  const i18n = createI18n({ language });
  const all = {
    admin: adminLabels(i18n.getFixedT(language, "admin")),
    bugReport: bugReportLabels(i18n.getFixedT(language, "ui")),
    upload: fileUploadLabels(i18n.getFixedT(language, "ui")),
  };

  it("каждая подпись переведена: ни одна не осталась ключом каталога", () => {
    const missing = leaves(all).filter(({ text }) => KEY_PATH.test(text) || text.length === 0);

    expect(missing).toEqual([]);
  });

  it("подписи с числами подставляют значения", () => {
    expect(all.admin.table.page(2, 5, 42)).toContain("42");
    expect(all.admin.system.buildVersion("1.2.3")).toContain("1.2.3");
    expect(all.upload.rejectedWithCode(502)).toContain("502");
  });
});

describe("языки не перепутаны", () => {
  it("русский и английский дают разные тексты", () => {
    const ru = adminLabels(createI18n({ language: "ru" }).getFixedT("ru", "admin"));
    const en = adminLabels(createI18n({ language: "en" }).getFixedT("en", "admin"));

    expect(ru.table.empty).toBe("Нет данных");
    expect(en.table.empty).toBe("No data");
    expect(ru.audit.locale).toBe("ru-RU");
    expect(en.audit.locale).toBe("en-US");
  });
});
