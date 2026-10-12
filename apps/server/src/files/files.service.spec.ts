import { BadRequestException, NotFoundException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StorageAdapter } from "@boilerplate/storage";

import type { FilesRepository } from "./files.repository.js";
import { FilesService } from "./files.service.js";

// Сигнатура GIF89a — настоящая проверка file-type, не мок: detectRealContentType
// должен распознать картинку по байтам, даже если хранилище или клиент
// заявляли что-то другое. (PNG не подходит для этого теста — у file-type 22
// детектор PNG разбирает структуру чанков IHDR/IDAT, а не только 8-байтную
// подпись, так что одной подписи недостаточно.)
const GIF_SIGNATURE = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);

function createStorageMock(): StorageAdapter {
  return {
    createUploadTicket: vi.fn(),
    getDownloadUrl: vi.fn().mockResolvedValue("https://storage.example.test/signed"),
    head: vi.fn(),
    delete: vi.fn(),
  };
}

function createRepositoryMock(): FilesRepository {
  return {
    createPending: vi.fn(),
    findById: vi.fn(),
    markReady: vi.fn(),
    markFailed: vi.fn(),
  } as unknown as FilesRepository;
}

function mockFetchResponse(body: Buffer): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      arrayBuffer: () =>
        Promise.resolve(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)),
    }),
  );
}

describe("FilesService.createUploadTicket", () => {
  it("создаёт запись PENDING и возвращает талон с её id", async () => {
    const storage = createStorageMock();
    const repository = createRepositoryMock();
    vi.mocked(repository.createPending).mockResolvedValue({
      id: "file-1",
      key: "uploads/abc.png",
    } as never);
    vi.mocked(storage.createUploadTicket).mockResolvedValue({
      url: "https://storage.example.test",
      fields: { key: "uploads/abc.png" },
      expiresAt: new Date(),
    });

    const service = new FilesService(repository, storage);
    const result = await service.createUploadTicket({
      contentType: "image/png",
      filename: "photo.png",
    });

    expect(result.fileId).toBe("file-1");
    expect(repository.createPending).toHaveBeenCalledWith(
      expect.stringContaining("uploads/"),
      "image/png",
    );
  });
});

describe("FilesService.confirm", () => {
  let storage: StorageAdapter;
  let repository: FilesRepository;
  let service: FilesService;

  beforeEach(() => {
    storage = createStorageMock();
    repository = createRepositoryMock();
    service = new FilesService(repository, storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("бросает NotFoundException, если записи нет", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);

    await expect(service.confirm("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("помечает FAILED и бросает ошибку, если storage.head не нашёл объект (загрузка не завершена)", async () => {
    vi.mocked(repository.findById).mockResolvedValue({
      id: "file-1",
      key: "uploads/abc.png",
    } as never);
    vi.mocked(storage.head).mockResolvedValue(null);

    await expect(service.confirm("file-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.markFailed).toHaveBeenCalledWith("file-1");
  });

  it("помечает FAILED и бросает ошибку, если реальный размер превышает MAX_UPLOAD_BYTES", async () => {
    vi.mocked(repository.findById).mockResolvedValue({
      id: "file-1",
      key: "uploads/abc.png",
    } as never);
    // Заявленному клиентом размеру не доверяем — здесь проверяется то,
    // что реально сообщило хранилище через storage.head() (раздел "Фаза 4"
    // задания, пункт 8). 21 МБ — выше MAX_UPLOAD_BYTES (20 МБ).
    vi.mocked(storage.head).mockResolvedValue({
      size: 21 * 1024 * 1024,
      contentType: "application/octet-stream",
    });

    await expect(service.confirm("file-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.markFailed).toHaveBeenCalledWith("file-1");
    // Размер превышен — определять настоящий тип по сигнатуре уже не нужно.
    expect(storage.getDownloadUrl).not.toHaveBeenCalled();
  });

  it("распознаёт реальный тип по сигнатуре и переводит запись в READY", async () => {
    vi.mocked(repository.findById).mockResolvedValue({
      id: "file-1",
      key: "uploads/abc.png",
    } as never);
    vi.mocked(storage.head).mockResolvedValue({
      size: 2048,
      contentType: "application/octet-stream",
    });
    mockFetchResponse(GIF_SIGNATURE);
    vi.mocked(repository.markReady).mockResolvedValue({ id: "file-1" } as never);

    const result = await service.confirm("file-1");

    expect(result.contentType).toBe("image/gif");
    expect(repository.markReady).toHaveBeenCalledWith("file-1", 2048, "image/gif");
  });

  it("отклоняет файл, если заявленный тип не совпадает с сигнатурой (спуфинг типа)", async () => {
    vi.mocked(repository.findById).mockResolvedValue({
      id: "file-1",
      key: "uploads/fake.png",
    } as never);
    vi.mocked(storage.head).mockResolvedValue({ size: 10, contentType: "image/png" });
    // Клиент заявил PNG, но реальные байты — обычный текст без сигнатуры
    // ни одного известного формата.
    mockFetchResponse(Buffer.from("not a real image file content"));

    await expect(service.confirm("file-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.markFailed).toHaveBeenCalledWith("file-1");
  });
});
