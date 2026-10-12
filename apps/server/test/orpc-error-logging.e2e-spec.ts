import { NotFoundException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { onError, ORPCModule } from "@orpc/nest";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logOrpcError } from "../src/common/orpc-error-logging.js";
import { TasksController } from "../src/tasks/tasks.controller.js";
import { TasksService } from "../src/tasks/tasks.service.js";

// Подключение как в app.module.ts: onError() в interceptors ORPCModule.
// Без него исключение внутри обработчика давало ответ 500 и ни одной записи
// с причиной в журнале сервера (найдено живым запуском на POST /notes).
describe("Журналирование необработанных ошибок oRPC", () => {
  let app: INestApplication;
  const logger = { error: vi.fn() };
  const tasks = { toggle: vi.fn() };

  beforeEach(async () => {
    logger.error.mockReset();
    tasks.toggle.mockReset();
    const moduleRef = await Test.createTestingModule({
      imports: [
        ORPCModule.forRoot({
          interceptors: [
            onError((error) => {
              logOrpcError(error, logger);
            }),
          ],
        }),
      ],
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: tasks }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("исключение в обработчике: ответ 500 и запись об ошибке с сообщением и стеком", async () => {
    tasks.toggle.mockRejectedValue(new Error("база недоступна"));

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).patch(
      "/tasks/1/toggle",
    );

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalledTimes(1);
    const [message, stack] = logger.error.mock.calls[0] as [string, string];
    expect(message).toContain("база недоступна");
    expect(stack).toContain("Error: база недоступна");
  });

  it("типизированная ошибка NOT_FOUND (404) в журнал как сбой не попадает", async () => {
    tasks.toggle.mockRejectedValue(new NotFoundException("Задача 1 не найдена"));

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).patch(
      "/tasks/1/toggle",
    );

    expect(response.status).toBe(404);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("ошибка проверки входа (400) в журнал как сбой не попадает", async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post("/tasks")
      .send({ title: "" });

    expect(response.status).toBe(400);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
