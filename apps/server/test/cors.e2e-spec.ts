import { Controller, Get } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { LoggerModule } from "nestjs-pino";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { createCorsOptions } from "../src/common/cors.js";
import { createPinoOptions } from "../src/logger/pino-options.js";

@Controller()
class PingController {
  @Get("ping")
  ping(): { ok: true } {
    return { ok: true };
  }
}

const WEB = "http://localhost:3001";

// Настоящие настройки CORS и логгера в настоящем Nest-приложении, запросы —
// такие, какие шлёт браузер: предварительный OPTIONS с заголовками запроса и
// сам запрос с Origin. До этого теста сервер отвечал на OPTIONS 404 без
// заголовков Access-Control-*, и браузер блокировал все запросы веба к API.
describe("CORS", () => {
  let app: Awaited<ReturnType<typeof createApp>> | undefined;

  async function createApp(origins: string[]) {
    const moduleRef = await Test.createTestingModule({
      imports: [LoggerModule.forRoot({ pinoHttp: createPinoOptions("fatal") })],
      controllers: [PingController],
    }).compile();
    const created = moduleRef.createNestApplication();
    const options = createCorsOptions(origins);
    if (options) {
      created.enableCors(options);
    }
    await created.init();
    return created;
  }

  function http(target: NonNullable<typeof app>) {
    return request(target.getHttpServer() as Parameters<typeof request>[0]);
  }

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("предварительный запрос разрешённого адреса получает заголовки Access-Control-*", async () => {
    app = await createApp([WEB]);

    const response = await http(app)
      .options("/ping")
      .set("Origin", WEB)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(WEB);
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
    expect(response.headers["access-control-allow-headers"]).toBe("content-type");
  });

  it("ответ открывает странице заголовок X-Request-Id", async () => {
    app = await createApp([WEB]);

    const response = await http(app).get("/ping").set("Origin", WEB);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(WEB);
    expect(response.headers["access-control-expose-headers"]).toContain("X-Request-Id");
    expect(response.headers["x-request-id"]).toBeDefined();
  });

  it("чужой адрес не получает Access-Control-Allow-Origin", async () => {
    app = await createApp([WEB]);

    const response = await http(app).get("/ping").set("Origin", "https://evil.example");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("без CORS_ORIGINS заголовков Access-Control-* нет", async () => {
    app = await createApp([]);

    const response = await http(app).get("/ping").set("Origin", WEB);

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
