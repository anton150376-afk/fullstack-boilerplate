import { createI18n } from "@boilerplate/i18n";

// Страховка от тихой ошибки (раздел "Фаза 7" задания, пункт 6 и
// критерии приёмки): без полифилов Hermes не бросает исключение — i18next
// ловит отсутствие Intl.PluralRules само и тихо подставляет dummyRule
// (select: count => count === 1 ? "one" : "other", т.е. английские
// категории). Тест воспроизводит именно это — удаляет
// Intl.PluralRules, показывает, что результат для 5 и 21 становится
// неправильным, затем восстанавливает через полифил те же импорты, что
// apps/mobile/index.ts, и показывает правильный результат. Если убрать
// импорт полифилов из index.ts, этот тест продолжит проходить (он сам
// управляет полифилом) — застрахован сам процесс восстановления, не
// конкретная точка входа; обязательность самих импортов в index.ts —
// проверка типа process.env в docs/apps/mobile.md, здесь — грамматика.
describe("русские множественные формы (files:count)", () => {
  const originalPluralRules = Intl.PluralRules;

  afterEach(() => {
    // Object.assign, не прямое присваивание — Intl.PluralRules типизирован
    // как readonly, прямое присваивание не проходит tsc (TS2540).
    Object.assign(Intl, { PluralRules: originalPluralRules });
  });

  it("без Intl.PluralRules (как в Hermes без полифила) даёт неправильные формы для 5 и 21", () => {
    // @ts-expect-error — симулируем Hermes без Intl.PluralRules.
    delete Intl.PluralRules;

    const i18n = createI18n({ language: "ru" });

    expect(i18n.t("files:count", { count: 5 })).not.toBe("5 файлов");
    expect(i18n.t("files:count", { count: 21 })).not.toBe("21 файл");
  });

  it("с полифилом (как в apps/mobile/index.ts) даёт правильные русские формы", () => {
    // @ts-expect-error — тот же приём: симулируем отсутствие, затем чиним.
    delete Intl.PluralRules;

    // Те же специфайтеры и порядок, что apps/mobile/index.ts — до
    // создания любого экземпляра i18next. require(), не статический
    // import — порядок относительно delete выше важен, а статические
    // импорты поднимаются в начало модуля независимо от места в файле.
    /* eslint-disable @typescript-eslint/no-require-imports */
    require("@formatjs/intl-pluralrules/polyfill-force.js");
    require("@formatjs/intl-pluralrules/locale-data/ru.js");
    /* eslint-enable @typescript-eslint/no-require-imports */

    const i18n = createI18n({ language: "ru" });

    expect(i18n.t("files:count", { count: 1 })).toBe("1 файл");
    expect(i18n.t("files:count", { count: 2 })).toBe("2 файла");
    expect(i18n.t("files:count", { count: 5 })).toBe("5 файлов");
    expect(i18n.t("files:count", { count: 21 })).toBe("21 файл");
  });
});
