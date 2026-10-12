import { describe, expect, it } from "vitest";

import { createRequestLog } from "./request-log.js";

describe("createRequestLog", () => {
  it("хранит не больше 20 записей — старые вытесняются новыми", () => {
    const log = createRequestLog();

    for (let i = 0; i < 25; i += 1) {
      log.record({
        method: "GET",
        path: `/notes/${i}`,
        status: 200,
        durationMs: 1,
        requestId: String(i),
      });
    }

    const entries = log.entries();
    expect(entries).toHaveLength(20);
    expect(entries[0]?.path).toBe("/notes/5");
    expect(entries.at(-1)?.path).toBe("/notes/24");
  });

  it("запись не несёт ничего, кроме пяти перечисленных полей — токену и паролю негде оказаться", () => {
    const log = createRequestLog();

    log.record({
      method: "POST",
      path: "/notes",
      status: 200,
      durationMs: 12,
      requestId: "abc",
    });

    expect(Object.keys(log.entries()[0] ?? {}).sort()).toEqual(
      ["durationMs", "method", "path", "requestId", "status"].sort(),
    );
  });
});
