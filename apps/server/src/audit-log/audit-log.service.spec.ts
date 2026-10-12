import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuditLogRepository } from "./audit-log.repository.js";
import { AuditLogService } from "./audit-log.service.js";

function createRepositoryMock(): AuditLogRepository {
  return {
    record: vi.fn(),
    list: vi.fn(),
  } as unknown as AuditLogRepository;
}

describe("AuditLogService", () => {
  let repository: AuditLogRepository;
  let service: AuditLogService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new AuditLogService(repository);
  });

  it("record пишет заглушку актора 'system' — настоящего пользователя взять негде до M1", async () => {
    await service.record("note", "1", "create");

    expect(repository.record).toHaveBeenCalledWith({
      actor: "system",
      entity: "note",
      entityId: "1",
      action: "create",
    });
  });

  it("list передаёт пагинацию репозиторию как есть", async () => {
    vi.mocked(repository.list).mockResolvedValue({ items: [], total: 0 });

    await service.list({ entity: "note", take: 20, skip: 0 });

    expect(repository.list).toHaveBeenCalledWith({ entity: "note", take: 20, skip: 0 });
  });
});
