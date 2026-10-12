import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuditLogService } from "../audit-log/audit-log.service.js";
import type { NotificationsService } from "../queue/notifications.service.js";
import type { NotesRepository } from "./notes.repository.js";
import { NotesService } from "./notes.service.js";

function createRepositoryMock(): NotesRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as NotesRepository;
}

function createNotificationsMock(): NotificationsService {
  return {
    notifyNoteCreated: vi.fn(),
  } as unknown as NotificationsService;
}

function createAuditLogMock(): AuditLogService {
  return {
    record: vi.fn(),
  } as unknown as AuditLogService;
}

describe("NotesService", () => {
  let repository: NotesRepository;
  let notifications: NotificationsService;
  let auditLog: AuditLogService;
  let service: NotesService;

  beforeEach(() => {
    repository = createRepositoryMock();
    notifications = createNotificationsMock();
    auditLog = createAuditLogMock();
    service = new NotesService(repository, notifications, auditLog);
  });

  it("findById возвращает заметку, если репозиторий её нашёл", async () => {
    vi.mocked(repository.findById).mockResolvedValue({
      id: "1",
      title: "т",
      body: "б",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(service.findById("1")).resolves.toMatchObject({ id: "1" });
  });

  it("findById бросает NotFoundException, если заметки нет", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);

    await expect(service.findById("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("create создаёт заметку и ставит уведомление о её создании в очередь", async () => {
    vi.mocked(repository.create).mockResolvedValue({
      id: "1",
      title: "т",
      body: "б",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({ title: "т", body: "б" });

    expect(result.id).toBe("1");
    expect(notifications.notifyNoteCreated).toHaveBeenCalledWith("1");
    expect(auditLog.record).toHaveBeenCalledWith("note", "1", "create");
  });

  it("update сначала проверяет существование, затем обновляет", async () => {
    vi.mocked(repository.findById).mockResolvedValue({
      id: "1",
      title: "старое",
      body: "б",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(repository.update).mockResolvedValue({
      id: "1",
      title: "новое",
      body: "б",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.update("1", { title: "новое" });

    expect(repository.findById).toHaveBeenCalledWith("1");
    expect(repository.update).toHaveBeenCalledWith("1", { title: "новое" });
    expect(result.title).toBe("новое");
    expect(auditLog.record).toHaveBeenCalledWith("note", "1", "update");
  });

  it("update бросает NotFoundException, не вызывая repository.update, если заметки нет", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);

    await expect(service.update("missing", { title: "x" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("delete сначала проверяет существование, затем удаляет", async () => {
    vi.mocked(repository.findById).mockResolvedValue({
      id: "1",
      title: "т",
      body: "б",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.delete("1");

    expect(repository.delete).toHaveBeenCalledWith("1");
    expect(auditLog.record).toHaveBeenCalledWith("note", "1", "delete");
  });
});
