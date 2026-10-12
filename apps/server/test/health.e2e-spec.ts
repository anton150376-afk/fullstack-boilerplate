import type { INestApplication } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { HealthController } from "../src/health/health.controller.js";
import { RedisHealthIndicator } from "../src/health/indicators/redis.health-indicator.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { REDIS_CLIENT } from "../src/redis/redis.constants.js";

// Без реального PostgreSQL/Redis (недоступны на этой машине — см.
// docs/BACKLOG.md, B-261008-no-docker) честную интеграционную проверку
// /health/ready (раздел "Фаза 4" задания, пункт 10: "сервисные контейнеры
// в CI, локально через docker:up") на этой машине не прогнать — она
// остаётся отдельной задачей (`B-261008-docker-unverified`). Здесь —
// другая, более узкая проверка: что сам контроллер и индикаторы верно
// превращают отказ зависимости в 503, а не в 500 или тихий успех. Redis
// подделан намеренно (ping бросает/не бросает), Prisma — минимальной
// заглушкой, достаточной, чтобы `PrismaHealthIndicator.pingDb` не упал
// при разборе ответа (раздел "Фаза 4" задания, пункт 6: исключение внутри
// индикатора даёт 500, а `down` — 503, и это разные случаи, которые легко
// перепутать в собственном индикаторе Redis).
describe("GET /health/live", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        RedisHealthIndicator,
        { provide: REDIS_CLIENT, useValue: {} },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("отвечает 200 и статусом ok, не касаясь внешних зависимостей", async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get(
      "/health/live",
    );
    const body = response.body as { status: string; info?: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "ok" });
    expect(body.info).toHaveProperty("memory_heap");
  });
});

describe("GET /health/ready", () => {
  // PrismaHealthIndicator.pingDb (из @nestjs/terminus) пробует
  // $runCommandRaw первым и падает в $queryRawUnsafe только при ошибке
  // с текстом про MongoDB — заглушка просто успешно резолвит
  // $runCommandRaw, этого достаточно для PostgreSQL-пути.
  const healthyPrisma = { $runCommandRaw: vi.fn().mockResolvedValue({}) };

  async function createApp(redisPing: () => Promise<unknown>): Promise<INestApplication> {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        RedisHealthIndicator,
        { provide: REDIS_CLIENT, useValue: { ping: redisPing } },
        { provide: PrismaService, useValue: healthyPrisma },
      ],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();
    return app;
  }

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("отвечает 503 и статусом redis: down, когда Redis недоступен", async () => {
    const app = await createApp(() => Promise.reject(new Error("connect ECONNREFUSED")));

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get(
      "/health/ready",
    );
    const body = response.body as {
      status: string;
      info?: Record<string, unknown>;
      error?: Record<string, unknown>;
    };

    expect(response.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.error).toHaveProperty("redis");
    expect((body.error?.redis as { status: string } | undefined)?.status).toBe("down");
    // Postgres рабочий — в error не попадает, он должен быть виден только
    // как причина общего отказа через Redis.
    expect(body.info).toHaveProperty("database");

    await app.close();
  });

  it("отвечает 200 и статусом ok, когда обе зависимости отвечают", async () => {
    const app = await createApp(() => Promise.resolve("PONG"));

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get(
      "/health/ready",
    );
    const body = response.body as { status: string; info?: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.info).toHaveProperty("redis");
    expect(body.info).toHaveProperty("database");

    await app.close();
  });
});
