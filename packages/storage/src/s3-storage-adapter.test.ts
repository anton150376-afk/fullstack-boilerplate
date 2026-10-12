import { NotFound, S3Client } from "@aws-sdk/client-s3";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createS3StorageAdapter, createS3StorageAdapterFromClient } from "./s3-storage-adapter.js";
import type { StorageAdapter } from "./types.js";

const CONFIG = {
  endpoint: "http://localhost:3900",
  region: "garage",
  bucket: "app-files",
  accessKeyId: "test-key",
  secretAccessKey: "test-secret",
};

// createUploadTicket и getDownloadUrl подписывают запрос локальной
// криптографией (HMAC по учётным данным) — для этого не нужно реального
// сетевого обращения к хранилищу, поэтому их тестирует настоящий вызов
// фабрики, не мок.
describe("createS3StorageAdapter", () => {
  let adapter: StorageAdapter;

  beforeEach(() => {
    adapter = createS3StorageAdapter(CONFIG);
  });

  describe("createUploadTicket", () => {
    it("возвращает подписанную форму с условием на размер и тип содержимого", async () => {
      const ticket = await adapter.createUploadTicket({
        key: "uploads/report.pdf",
        contentType: "application/pdf",
        maxBytes: 10 * 1024 * 1024,
      });

      expect(ticket.url).toContain(CONFIG.endpoint);
      expect(ticket.fields).toHaveProperty("key", "uploads/report.pdf");
      expect(ticket.fields).toHaveProperty("Content-Type", "application/pdf");
      expect(ticket.fields).toHaveProperty("Policy");
      expect(ticket.fields).toHaveProperty("X-Amz-Signature");
      expect(ticket.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("политика в подписи отличается для разных maxBytes — размер действительно ограничен подписью, не только кодом", async () => {
      const small = await adapter.createUploadTicket({
        key: "uploads/a.pdf",
        contentType: "application/pdf",
        maxBytes: 1024,
      });
      const large = await adapter.createUploadTicket({
        key: "uploads/a.pdf",
        contentType: "application/pdf",
        maxBytes: 1024 * 1024 * 1024,
      });

      expect(small.fields.Policy).not.toBe(large.fields.Policy);
    });
  });

  describe("getDownloadUrl", () => {
    it("возвращает подписанный URL на тот же бакет и ключ", async () => {
      const url = await adapter.getDownloadUrl("uploads/report.pdf", 60);

      expect(url).toContain(CONFIG.endpoint);
      expect(url).toContain("uploads/report.pdf");
      expect(url).toContain("X-Amz-Expires=60");
    });
  });
});

// head() и delete() делают настоящий сетевой вызов (client.send) — здесь
// клиент подменяется, чтобы проверить обработку результата без реального
// хранилища (createS3StorageAdapterFromClient существует отдельно от
// createS3StorageAdapter именно для этого случая).
describe("createS3StorageAdapterFromClient", () => {
  function createClientMock(sendImpl: (command: unknown) => unknown): S3Client {
    return { send: vi.fn(sendImpl) } as unknown as S3Client;
  }

  describe("head", () => {
    it("возвращает размер и тип, если объект существует", async () => {
      const client = createClientMock(() =>
        Promise.resolve({ ContentLength: 1024, ContentType: "application/pdf" }),
      );
      const adapter = createS3StorageAdapterFromClient(client, { bucket: "app-files" });

      await expect(adapter.head("uploads/report.pdf")).resolves.toEqual({
        size: 1024,
        contentType: "application/pdf",
      });
    });

    it("возвращает null, если HeadObject бросает NotFound", async () => {
      const client = createClientMock(() =>
        Promise.reject(new NotFound({ message: "not found", $metadata: {} })),
      );
      const adapter = createS3StorageAdapterFromClient(client, { bucket: "app-files" });

      await expect(adapter.head("missing")).resolves.toBeNull();
    });

    it("пробрасывает любую другую ошибку", async () => {
      const client = createClientMock(() => Promise.reject(new Error("сеть недоступна")));
      const adapter = createS3StorageAdapterFromClient(client, { bucket: "app-files" });

      await expect(adapter.head("uploads/report.pdf")).rejects.toThrow("сеть недоступна");
    });
  });

  describe("delete", () => {
    it("вызывает DeleteObjectCommand с нужным ключом", async () => {
      const send = vi.fn().mockResolvedValue({});
      const client = { send } as unknown as S3Client;
      const adapter = createS3StorageAdapterFromClient(client, { bucket: "app-files" });

      await adapter.delete("uploads/report.pdf");

      expect(send).toHaveBeenCalledTimes(1);
      const command = send.mock.calls[0]?.[0] as { input: { Bucket: string; Key: string } };
      expect(command.input).toEqual({ Bucket: "app-files", Key: "uploads/report.pdf" });
    });
  });
});

// Контейнер: сервер видит хранилище как http://garage:3900, браузер — как
// http://localhost:3900. Подписанные URL уходят браузеру, поэтому строятся
// из publicEndpoint; запросы самого сервера (head, delete) — из endpoint.
describe("publicEndpoint", () => {
  const INTERNAL = "http://garage:3900";
  const PUBLIC = "http://localhost:3900";

  it("URL формы загрузки и ссылка на скачивание строятся из публичного адреса", async () => {
    const adapter = createS3StorageAdapter({
      ...CONFIG,
      endpoint: INTERNAL,
      publicEndpoint: PUBLIC,
    });

    const ticket = await adapter.createUploadTicket({
      key: "uploads/a.pdf",
      contentType: "application/pdf",
      maxBytes: 1024,
    });
    const download = await adapter.getDownloadUrl("uploads/a.pdf", 60);

    expect(ticket.url.startsWith(PUBLIC)).toBe(true);
    expect(download.startsWith(PUBLIC)).toBe(true);
    expect(`${ticket.url}${download}`).not.toContain("garage:3900");
    expect(download).toContain("X-Amz-Signature");
  });

  it("без publicEndpoint URL строятся из endpoint", async () => {
    const adapter = createS3StorageAdapter({ ...CONFIG, endpoint: INTERNAL });

    const download = await adapter.getDownloadUrl("uploads/a.pdf");

    expect(download.startsWith(INTERNAL)).toBe(true);
  });

  it("head и delete идут через внутренний клиент, публичный остаётся только для подписи", async () => {
    const internal = new S3Client({
      endpoint: INTERNAL,
      region: CONFIG.region,
      forcePathStyle: true,
      credentials: { accessKeyId: "k", secretAccessKey: "s" },
    });
    const publicClient = new S3Client({
      endpoint: PUBLIC,
      region: CONFIG.region,
      forcePathStyle: true,
      credentials: { accessKeyId: "k", secretAccessKey: "s" },
    });
    const internalSend = vi
      .spyOn(internal, "send")
      .mockResolvedValue({ ContentLength: 5, ContentType: "text/plain" } as never);
    const publicSend = vi.spyOn(publicClient, "send");
    const adapter = createS3StorageAdapterFromClient(internal, CONFIG, publicClient);

    await adapter.head("uploads/a.txt");
    await adapter.delete("uploads/a.txt");
    const download = await adapter.getDownloadUrl("uploads/a.txt");

    expect(internalSend).toHaveBeenCalledTimes(2);
    expect(publicSend).not.toHaveBeenCalled();
    expect(download.startsWith(PUBLIC)).toBe(true);
  });
});
