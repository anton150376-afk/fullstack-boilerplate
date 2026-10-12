import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductionFeedback } from "../bug-report.js";
import { createHttpBugReportReceiver } from "./http-receiver.js";

describe("createHttpBugReportReceiver", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("отправляет отчёт POST-ом на <baseUrl>/dev/bug-reports", async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 204 }));
    const receiver = createHttpBugReportReceiver({ baseUrl: "https://api.example.test" });
    const feedback: ProductionFeedback = {
      description: "x",
      route: "/notes",
      buildVersion: "1.0.0",
      createdAt: "2026-10-09T10:00:00.000Z",
    };

    await receiver.submit(feedback);

    const [url, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.test/dev/bug-reports");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(feedback);
  });

  it("бросает ошибку, если сервер отклонил запрос", async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 404 }));
    const receiver = createHttpBugReportReceiver({ baseUrl: "https://api.example.test" });

    await expect(
      receiver.submit({
        description: "x",
        route: "/notes",
        buildVersion: "1.0.0",
        createdAt: "2026-10-09T10:00:00.000Z",
      }),
    ).rejects.toThrow("404");
  });
});
