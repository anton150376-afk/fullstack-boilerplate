import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { describe, expect, it } from "vitest";

import type { Env } from "../src/config/env.schema.js";
import { OpenApiController } from "../src/openapi/openapi.controller.js";

async function createApp(nodeEnv: Env["NODE_ENV"]) {
  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers: [OpenApiController],
    providers: [
      {
        provide: ConfigService,
        useValue: { get: (key: string) => (key === "NODE_ENV" ? nodeEnv : undefined) },
      },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe("GET /openapi.json", () => {
  it("в разработке отдаёт спецификацию, порождённую из packages/contract", async () => {
    const app = await createApp("development");

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get(
      "/openapi.json",
    );
    const body = response.body as { paths?: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(body.paths).toHaveProperty("/notes");
    expect(body.paths).toHaveProperty("/files/upload-ticket");

    await app.close();
  });

  it("в проде маршрута нет вовсе — 404, а не спецификация", async () => {
    const app = await createApp("production");

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get(
      "/openapi.json",
    );

    expect(response.status).toBe(404);

    await app.close();
  });
});
