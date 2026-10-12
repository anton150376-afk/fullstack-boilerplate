import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuditLogService } from "../audit-log/audit-log.service.js";
import type { TasksRepository } from "./tasks.repository.js";
import { TasksService } from "./tasks.service.js";

function createRepositoryMock(): TasksRepository {
  return {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    setDone: vi.fn(),
    delete: vi.fn(),
  } as unknown as TasksRepository;
}

function createAuditLogMock(): AuditLogService {
  return {
    record: vi.fn(),
  } as unknown as AuditLogService;
}

describe("TasksService", () => {
  let repository: TasksRepository;
  let auditLog: AuditLogService;
  let service: TasksService;

  beforeEach(() => {
    repository = createRepositoryMock();
    auditLog = createAuditLogMock();
    service = new TasksService(repository, auditLog);
  });

  it("findById возвращает задачу, если репозиторий её нашёл", async () => {
    vi.mocked(repository.findById).mockResolvedValue({
      id: "1",
      title: "т",
      done: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(service.findById("1")).resolves.toMatchObject({ id: "1" });
  });

  it("findById бросает NotFoundException, если задачи нет", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);

    await expect(service.findById("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("create создаёт задачу и пишет в журнал действий", async () => {
    vi.mocked(repository.create).mockResolvedValue({
      id: "1",
      title: "т",
      done: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({ title: "т" });

    expect(result.id).toBe("1");
    expect(auditLog.record).toHaveBeenCalledWith("task", "1", "create");
  });

  it("toggle инвертирует done — false становится true", async () => {
    vi.mocked(repository.findById).mockResolvedValue({
      id: "1",
      title: "т",
      done: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(repository.setDone).mockResolvedValue({
      id: "1",
      title: "т",
      done: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.toggle("1");

    expect(repository.setDone).toHaveBeenCalledWith("1", true);
    expect(result.done).toBe(true);
    expect(auditLog.record).toHaveBeenCalledWith("task", "1", "update");
  });

  it("toggle бросает NotFoundException, не вызывая repository.setDone, если задачи нет", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);

    await expect(service.toggle("missing")).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.setDone).not.toHaveBeenCalled();
  });

  it("delete сначала проверяет существование, затем удаляет", async () => {
    vi.mocked(repository.findById).mockResolvedValue({
      id: "1",
      title: "т",
      done: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.delete("1");

    expect(repository.delete).toHaveBeenCalledWith("1");
    expect(auditLog.record).toHaveBeenCalledWith("task", "1", "delete");
  });
});
