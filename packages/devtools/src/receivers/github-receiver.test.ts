import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BugReport } from "../bug-report.js";
import { createGithubReceiver } from "./github-receiver.js";

function createReport(overrides: Partial<BugReport> = {}): BugReport {
  return {
    description: "Кнопка не работает\nВторая строка описания",
    stepsToReproduce: "1. Открыть /notes",
    expectedBehavior: "Заметка появляется",
    createdAt: "2026-10-09T10:00:00.000Z",
    context: {
      route: { path: "/notes", params: {} },
      build: { version: "1.2.3", gitSha: "abc1234" },
      environment: "development",
      platform: {
        os: "web",
        osVersion: "",
        device: "desktop",
        screen: { width: 1920, height: 1080 },
        locale: "ru-RU",
      },
      requestLog: [],
      logs: [],
      actionTrail: [],
      queries: [],
    },
    ...overrides,
  };
}

describe("createGithubReceiver", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("создаёт issue с заголовком по первой строке описания и метками по умолчанию", async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 201 }));
    const receiver = createGithubReceiver({ owner: "acme", repo: "app", token: "ghp_test" });

    await receiver.submit(createReport());

    const [url, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/acme/app/issues");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer ghp_test" });
    const body = JSON.parse(init.body as string) as {
      title: string;
      labels: string[];
      body: string;
    };
    expect(body.title).toBe("Кнопка не работает");
    expect(body.labels).toEqual(["bug-report"]);
    expect(body.body).toContain("Вторая строка описания");
  });

  it("бросает ошибку, если GitHub API отвечает не 2xx", async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response("not found", { status: 404 }));
    const receiver = createGithubReceiver({ owner: "acme", repo: "app", token: "ghp_test" });

    await expect(receiver.submit(createReport())).rejects.toThrow("404");
  });
});
