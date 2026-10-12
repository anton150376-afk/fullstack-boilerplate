import { BadRequestException, NotFoundException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ORPCModule } from "@orpc/nest";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FilesController } from "../src/files/files.controller.js";
import { FilesService } from "../src/files/files.service.js";

// Тот же подход, что в notes.e2e-spec.ts: FilesService подделан (его
// собственное unit-покрытие — files.service.spec.ts, против подделанного
// хранилища и репозитория), здесь проверяется только маршрутизация
// контракта через HTTP.
describe("Files через контракт (apps/server/src/files/files.controller.ts)", () => {
  let app: INestApplication;
  let files: { [K in keyof FilesService]: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    files = {
      createUploadTicket: vi.fn(),
      confirm: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ORPCModule.forRoot({})],
      controllers: [FilesController],
      providers: [{ provide: FilesService, useValue: files }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("POST /files/upload-ticket отдаёт талон от FilesService.createUploadTicket", async () => {
    const expiresAt = new Date("2026-10-08T12:00:00.000Z");
    files.createUploadTicket.mockResolvedValue({
      fileId: "file-1",
      url: "https://storage.example.test",
      fields: { key: "uploads/abc.png" },
      expiresAt,
    });

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post("/files/upload-ticket")
      .send({ contentType: "image/png", filename: "photo.png" });

    expect(response.status).toBe(200);
    expect(files.createUploadTicket).toHaveBeenCalledWith({
      contentType: "image/png",
      filename: "photo.png",
    });
    expect((response.body as { fileId: string }).fileId).toBe("file-1");
  });

  it("POST /files/upload-ticket отклоняет пустой filename контрактом, не вызывая сервис", async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post("/files/upload-ticket")
      .send({ contentType: "image/png", filename: "" });

    expect(response.status).toBe(400);
    expect(files.createUploadTicket).not.toHaveBeenCalled();
  });

  it("POST /files/:id/confirm при NotFoundException отвечает 404 с contract.errors.NOT_FOUND", async () => {
    files.confirm.mockRejectedValue(new NotFoundException("Запись о файле file-1 не найдена"));

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).post(
      "/files/file-1/confirm",
    );
    const body = response.body as { code: string; data?: { id: string } };

    expect(response.status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
    expect(body.data).toEqual({ id: "file-1" });
  });

  it("POST /files/:id/confirm при BadRequestException (отказ хранилища) отвечает 400", async () => {
    files.confirm.mockRejectedValue(new BadRequestException("Файл превышает допустимый размер"));

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).post(
      "/files/file-1/confirm",
    );
    const body = response.body as { code: string };

    expect(response.status).toBe(400);
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("POST /files/:id/confirm при успехе отдаёт подтверждённый файл", async () => {
    files.confirm.mockResolvedValue({ id: "file-1", size: 2048, contentType: "image/gif" });

    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).post(
      "/files/file-1/confirm",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: "file-1", size: 2048, contentType: "image/gif" });
  });
});
