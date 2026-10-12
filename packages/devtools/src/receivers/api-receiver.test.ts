import { describe, expect, it } from "vitest";

import { createApiReceiver } from "./api-receiver.js";

describe("createApiReceiver", () => {
  it("отклоняет вызов — приёмник не реализован (раздел 9.1 задания)", async () => {
    const receiver = createApiReceiver();

    await expect(
      receiver.submit({
        description: "x",
        route: "/notes",
        buildVersion: "1.0.0",
        createdAt: "2026-10-09T10:00:00.000Z",
      }),
    ).rejects.toThrow(/не реализован/);
  });
});
