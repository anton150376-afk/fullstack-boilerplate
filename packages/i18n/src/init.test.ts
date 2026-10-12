import { describe, expect, it } from "vitest";

import { createI18n } from "./init.js";

describe("createI18n", () => {
  it("резолвит русские формы числа по CLDR-правилам (_one/_few/_many/_other)", () => {
    const i18n = createI18n({ language: "ru" });

    expect(i18n.t("files:count", { count: 1 })).toBe("1 файл");
    expect(i18n.t("files:count", { count: 2 })).toBe("2 файла");
    expect(i18n.t("files:count", { count: 5 })).toBe("5 файлов");
    expect(i18n.t("files:count", { count: 21 })).toBe("21 файл");
    expect(i18n.t("files:count", { count: 0 })).toBe("0 файлов");
  });

  it("английский каталог использует только _one/_other", () => {
    const i18n = createI18n({ language: "en" });

    expect(i18n.t("files:count", { count: 1 })).toBe("1 file");
    expect(i18n.t("files:count", { count: 2 })).toBe("2 files");
    expect(i18n.t("files:count", { count: 21 })).toBe("21 files");
  });

  it("падает обратно на defaultLanguage для неизвестного языка", () => {
    const i18n = createI18n({ language: "fr" as never });

    expect(i18n.t("common:navNotes")).toBe("Заметки");
  });
});
