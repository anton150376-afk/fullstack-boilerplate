import { describe, expect, it } from "vitest";

import { shouldRegisterDevBugReports } from "./should-register-dev-bug-reports.js";

describe("shouldRegisterDevBugReports", () => {
  it("ложь в production — маршрута /dev/bug-reports нет вовсе", () => {
    expect(shouldRegisterDevBugReports("production")).toBe(false);
  });

  it("истина в development, test и при отсутствующей переменной", () => {
    expect(shouldRegisterDevBugReports("development")).toBe(true);
    expect(shouldRegisterDevBugReports("test")).toBe(true);
    expect(shouldRegisterDevBugReports(undefined)).toBe(true);
  });
});
