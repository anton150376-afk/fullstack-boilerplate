import { Controller, Get, Req } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Request } from "express";
import { LoggerModule } from "nestjs-pino";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createPinoOptions } from "../src/logger/pino-options.js";

@Controller()
class PingController {
  @Get("ping")
  ping(@Req() req: Request): { id: unknown } {
    return { id: req.id };
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Настоящие настройки логгера (createPinoOptions) в настоящем Nest-приложении:
// каждый запрос обязан получить req.id и заголовок X-Request-Id. Этой связки
// не проверял ни один тест, пока живой запуск сервера не показал 500 на всех
// маршрутах (ERR_HTTP_INVALID_HEADER_VALUE: заголовок ставили до pino-http).
describe("X-Request-Id с настоящими настройками pino", () => {
  let app: Awaited<ReturnType<typeof createApp>> | undefined;

  async function createApp() {
    const moduleRef = await Test.createTestingModule({
      imports: [LoggerModule.forRoot({ pinoHttp: createPinoOptions("fatal") })],
      controllers: [PingController],
    }).compile();
    const created = moduleRef.createNestApplication();
    await created.init();
    return created;
  }

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("запрос получает UUID в req.id и в заголовке ответа, значения совпадают", async () => {
    app = await createApp();

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get(
      "/ping",
    );
    const body = response.body as { id: string };

    expect(response.status).toBe(200);
    expect(response.headers["x-request-id"]).toMatch(UUID);
    expect(body.id).toBe(response.headers["x-request-id"]);
  });

  it("безопасный X-Request-Id клиента возвращается в ответе тем же значением", async () => {
    app = await createApp();

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get("/ping")
      .set("X-Request-Id", "client-trace-42");

    expect(response.headers["x-request-id"]).toBe("client-trace-42");
  });
});
