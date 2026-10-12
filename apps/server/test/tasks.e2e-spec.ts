import { NotFoundException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ORPCModule } from "@orpc/nest";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TasksController } from "../src/tasks/tasks.controller.js";
import { TasksService } from "../src/tasks/tasks.service.js";

// Без реального PostgreSQL (см. docs/BACKLOG.md, B-261008-no-docker)
// TasksRepository не вызвать честно — TasksService подделан, как и у
// notes.e2e-spec.ts. Проверяется маршрутизация контракта: HTTP → Nest →
// @Implement/ImplementInterceptor → обработчик → обратно в HTTP-ответ.
describe("Tasks через контракт (apps/server/src/tasks/tasks.controller.ts)", () => {
  let app: INestApplication;
  let tasks: { [K in keyof TasksService]: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    tasks = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      toggle: vi.fn(),
      delete: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ORPCModule.forRoot({})],
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: tasks }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET /tasks отдаёт список из TasksService.findAll", async () => {
    tasks.findAll.mockResolvedValue([
      { id: "1", title: "т", done: false, createdAt: new Date(), updatedAt: new Date() },
    ]);

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get(
      "/tasks",
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect((response.body as [{ id: string }])[0].id).toBe("1");
  });

  it("POST /tasks валидирует вход контрактом — отклоняет пустой title до вызова сервиса", async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post("/tasks")
      .send({ title: "" });

    expect(response.status).toBe(400);
    expect(tasks.create).not.toHaveBeenCalled();
  });

  it("POST /tasks с валидным телом создаёт задачу через TasksService.create", async () => {
    tasks.create.mockResolvedValue({
      id: "1",
      title: "т",
      done: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post("/tasks")
      .send({ title: "т" });

    expect(response.status).toBe(200);
    expect(tasks.create).toHaveBeenCalledWith({ title: "т" });
    expect((response.body as { id: string }).id).toBe("1");
  });

  it("PATCH /tasks/:id/toggle при NotFoundException из сервиса отвечает 404 и телом contract.errors.NOT_FOUND", async () => {
    tasks.toggle.mockRejectedValue(new NotFoundException("Задача missing не найдена"));

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).patch(
      "/tasks/missing/toggle",
    );
    const body = response.body as { code: string; status: number; data?: { id: string } };

    expect(response.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.data).toEqual({ id: "missing" });
  });

  it("PATCH /tasks/:id/toggle переключает done через TasksService.toggle", async () => {
    tasks.toggle.mockResolvedValue({
      id: "1",
      title: "т",
      done: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).patch(
      "/tasks/1/toggle",
    );

    expect(response.status).toBe(200);
    expect(tasks.toggle).toHaveBeenCalledWith("1");
    expect((response.body as { done: boolean }).done).toBe(true);
  });

  it("DELETE /tasks/:id отвечает 204 без тела", async () => {
    tasks.delete.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).delete(
      "/tasks/1",
    );

    expect(response.status).toBe(204);
    expect(tasks.delete).toHaveBeenCalledWith("1");
  });
});
