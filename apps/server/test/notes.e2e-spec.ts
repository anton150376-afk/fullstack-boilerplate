import { NotFoundException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ORPCModule } from "@orpc/nest";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotesController } from "../src/notes/notes.controller.js";
import { NotesService } from "../src/notes/notes.service.js";

// Без реального PostgreSQL (см. docs/BACKLOG.md, B-261008-no-docker)
// NotesRepository не вызвать честно — NotesService подделан. Это всё
// равно настоящая проверка маршрутизации контракта: HTTP → Nest →
// @Implement/ImplementInterceptor → обработчик → обратно в HTTP-ответ,
// то есть ровно то, что добавляет Фаза 5 (раздел "Фаза 5" задания,
// критерий приёмки про поломку сборки — отдельно проверено typecheck'ом,
// здесь — поведение во время выполнения).
describe("Notes через контракт (apps/server/src/notes/notes.controller.ts)", () => {
  let app: INestApplication;
  let notes: { [K in keyof NotesService]: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    notes = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ORPCModule.forRoot({})],
      controllers: [NotesController],
      providers: [{ provide: NotesService, useValue: notes }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET /notes отдаёт список из NotesService.findAll", async () => {
    notes.findAll.mockResolvedValue([
      { id: "1", title: "т", body: "б", createdAt: new Date(), updatedAt: new Date() },
    ]);

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get(
      "/notes",
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect((response.body as [{ id: string }])[0].id).toBe("1");
  });

  it("POST /notes валидирует вход контрактом — отклоняет пустой title до вызова сервиса", async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post("/notes")
      .send({ title: "", body: "б" });

    expect(response.status).toBe(400);
    expect(notes.create).not.toHaveBeenCalled();
  });

  it("POST /notes с валидным телом создаёт заметку через NotesService.create", async () => {
    notes.create.mockResolvedValue({
      id: "1",
      title: "т",
      body: "б",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post("/notes")
      .send({ title: "т", body: "б" });

    expect(response.status).toBe(200);
    expect(notes.create).toHaveBeenCalledWith({ title: "т", body: "б" });
    expect((response.body as { id: string }).id).toBe("1");
  });

  it("GET /notes/:id при NotFoundException из сервиса отвечает 404 и телом contract.errors.NOT_FOUND", async () => {
    notes.findById.mockRejectedValue(new NotFoundException("Заметка missing не найдена"));

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get(
      "/notes/missing",
    );
    const body = response.body as { code: string; status: number; data?: { id: string } };

    expect(response.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.data).toEqual({ id: "missing" });
  });

  it("PATCH /notes/:id передаёt в сервис только поля без id", async () => {
    notes.update.mockResolvedValue({
      id: "1",
      title: "новое",
      body: "б",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch("/notes/1")
      .send({ title: "новое" });

    expect(response.status).toBe(200);
    expect(notes.update).toHaveBeenCalledWith("1", { title: "новое" });
  });

  it("DELETE /notes/:id отвечает 204 без тела", async () => {
    notes.delete.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).delete(
      "/notes/1",
    );

    expect(response.status).toBe(204);
    expect(notes.delete).toHaveBeenCalledWith("1");
  });
});
