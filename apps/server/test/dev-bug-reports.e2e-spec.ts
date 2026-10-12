import { randomUUID } from "node:crypto";
import { readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";

import { Global, Module, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import type { Env } from "../src/config/env.schema.js";
import {
  BUGS_DIRECTORY,
  MAX_BUG_REPORT_BYTES,
} from "../src/dev-bug-reports/dev-bug-reports.constants.js";
import { DevBugReportsModule } from "../src/dev-bug-reports/dev-bug-reports.module.js";

function createFakeConfig(overrides: Partial<Env> = {}) {
  const values: Partial<Env> = { BUG_REPORT_RECEIVER: "file", ...overrides };
  return { get: (key: string) => values[key as keyof Env] };
}

// DevBugReportsModule целиком, не только контроллер/сервис напрямую (как
// у notes.e2e-spec.ts) — лимит размера тела навешен в configure() самого
// модуля, прямой список controllers/providers его бы не задействовал.
// ConfigService в проде приходит из @nestjs/config с isGlobal: true
// (apps/server/src/config/config.module.ts) — здесь тот же механизм
// глобального модуля, только с подставным значением, без .env.
async function createApp(config: ReturnType<typeof createFakeConfig>): Promise<INestApplication> {
  @Global()
  @Module({
    providers: [{ provide: ConfigService, useValue: config }],
    exports: [ConfigService],
  })
  class FakeConfigModule {}

  const moduleRef = await Test.createTestingModule({
    imports: [FakeConfigModule, DevBugReportsModule],
  }).compile();

  // bodyParser: false — иначе глобальный json() с лимитом body-parser по
  // умолчанию (100кб) срабатывает раньше per-route лимита из
  // DevBugReportsModule.configure() (тот же приём, что в main.ts).
  const app = moduleRef.createNestApplication({ bodyParser: false });
  await app.init();
  return app;
}

function validReport(requestId: string, screenshot?: string) {
  return {
    description: "Кнопка не работает\nAuthorization: Bearer leaked-secret-xyz",
    stepsToReproduce: "1. Открыть /notes\n2. Нажать «Сохранить»",
    expectedBehavior: "Заметка сохраняется",
    createdAt: new Date().toISOString(),
    context: {
      route: { path: "/notes", params: {} },
      build: { version: "1.0.0", gitSha: "abc1234" },
      environment: "test",
      platform: {
        os: "web",
        osVersion: "",
        device: "desktop",
        screen: { width: 1024, height: 768 },
        locale: "ru-RU",
      },
      requestLog: [{ method: "POST", path: "/notes", status: 500, durationMs: 42, requestId }],
      logs: [],
      actionTrail: [],
      queries: [],
      ...(screenshot ? { screenshot } : {}),
    },
  };
}

async function filesBefore(): Promise<Set<string>> {
  try {
    return new Set(await readdir(BUGS_DIRECTORY));
  } catch {
    return new Set();
  }
}

describe("POST /dev/bug-reports", () => {
  let app: INestApplication;
  const writtenFiles: string[] = [];

  afterEach(async () => {
    await app.close();
    for (const file of writtenFiles) {
      await rm(join(BUGS_DIRECTORY, file), { force: true });
    }
    writtenFiles.length = 0;
  });

  it("пишет markdown-файл с request-id сломанного запроса — по нему находятся серверные логи", async () => {
    app = await createApp(createFakeConfig());
    const before = await filesBefore();
    const requestId = randomUUID();

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post("/dev/bug-reports")
      .send(validReport(requestId));

    expect(response.status).toBe(204);

    const after = await readdir(BUGS_DIRECTORY);
    const newFiles = after.filter((name) => !before.has(name));
    expect(newFiles).toHaveLength(1);
    writtenFiles.push(...newFiles);

    const filename = newFiles[0];
    if (!filename) {
      throw new Error("ожидался ровно один новый файл отчёта");
    }
    const content = await readFile(join(BUGS_DIRECTORY, filename), "utf8");
    expect(content).toContain(requestId);
    expect(content).toContain("/notes");
  });

  it("маскирует секрет из описания — Authorization/токен не попадают в файл", async () => {
    app = await createApp(createFakeConfig());
    const before = await filesBefore();

    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post("/dev/bug-reports")
      .send(validReport(randomUUID()));

    const after = await readdir(BUGS_DIRECTORY);
    const newFiles = after.filter((name) => !before.has(name));
    writtenFiles.push(...newFiles);

    const filename = newFiles[0];
    if (!filename) {
      throw new Error("ожидался ровно один новый файл отчёта");
    }
    const content = await readFile(join(BUGS_DIRECTORY, filename), "utf8");
    expect(content).not.toContain("leaked-secret-xyz");
    expect(content).toContain("Bearer [masked]");
  });

  it("отклоняет невалидное тело — 400, без файла на диске", async () => {
    app = await createApp(createFakeConfig());
    const before = await filesBefore();

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post("/dev/bug-reports")
      .send({ description: "" });

    expect(response.status).toBe(400);
    expect(await readdir(BUGS_DIRECTORY)).toEqual([...before]);
  });

  it("отклоняет тело крупнее лимита — заведомо раздутый снимок экрана", async () => {
    app = await createApp(createFakeConfig());

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post("/dev/bug-reports")
      .send(validReport(randomUUID(), "a".repeat(MAX_BUG_REPORT_BYTES + 1024)));

    expect(response.status).toBe(413);
  });

  // Тело за 100кб (дефолт body-parser) проходит — лимит действительно
  // свой (MAX_BUG_REPORT_BYTES), а не унаследован от глобального дефолта,
  // который этот тест и поймал бы, если бы per-route json() не работал
  // (найдено этим же тестом: main.ts получил bodyParser: false).
  it("принимает тело заметно крупнее 100кб, но в пределах лимита", async () => {
    app = await createApp(createFakeConfig());
    const before = await filesBefore();

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post("/dev/bug-reports")
      .send(validReport(randomUUID(), "a".repeat(1024 * 1024)));

    expect(response.status).toBe(204);
    const after = await readdir(BUGS_DIRECTORY);
    writtenFiles.push(...after.filter((name) => !before.has(name)));
  });
});
