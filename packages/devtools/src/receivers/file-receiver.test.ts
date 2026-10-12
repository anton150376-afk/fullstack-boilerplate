import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { BugReport } from "../bug-report.js";
import { createFileReceiver } from "./file-receiver.js";

function createReport(overrides: Partial<BugReport> = {}): BugReport {
  return {
    description: "Кнопка не работает",
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

describe("createFileReceiver", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "bug-reports-"));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("пишет markdown-файл с содержимым отчёта в заданный каталог", async () => {
    const receiver = createFileReceiver({ directory });

    await receiver.submit(createReport());

    const files = await readdir(directory);
    expect(files).toHaveLength(1);
    const [filename] = files;
    if (!filename) {
      throw new Error("ожидался ровно один файл отчёта");
    }
    const content = await readFile(join(directory, filename), "utf8");
    expect(content).toContain("Кнопка не работает");
  });

  it("имя файла не берётся из отчёта — два отчёта не перезаписывают друг друга", async () => {
    const receiver = createFileReceiver({ directory });

    await receiver.submit(createReport({ description: "Первый" }));
    await receiver.submit(createReport({ description: "Второй" }));

    const files = await readdir(directory);
    expect(files).toHaveLength(2);
  });
});
