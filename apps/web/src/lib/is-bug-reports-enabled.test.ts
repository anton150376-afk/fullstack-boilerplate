import { describe, expect, it } from "vitest";

import { isBugReportsEnabled } from "./is-bug-reports-enabled.js";

// Критерий приёмки Фазы 9: кнопка не рендерится без явного флага —
// проверяем именно это условие, не весь __root.tsx с роутером/SSR.
describe("isBugReportsEnabled", () => {
  it("ложь по умолчанию — undefined, пустая строка, что угодно кроме 'true'", () => {
    expect(isBugReportsEnabled(undefined)).toBe(false);
    expect(isBugReportsEnabled("")).toBe(false);
    expect(isBugReportsEnabled("false")).toBe(false);
    expect(isBugReportsEnabled("1")).toBe(false);
  });

  it("истина только при точном значении 'true'", () => {
    expect(isBugReportsEnabled("true")).toBe(true);
  });
});
