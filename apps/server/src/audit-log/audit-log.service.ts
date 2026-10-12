import { Injectable } from "@nestjs/common";

import { AuditLogRepository, type ListAuditEntriesInput } from "./audit-log.repository.js";

// Заглушка актора "system" (раздел "Фаза 8" задания, пункт 8.6) — без
// модуля аутентификации (M1, ROADMAP) настоящего "кто" взять негде.
// Полноценная привязка к пользователю — отдельный пункт ROADMAP.
const STUB_ACTOR = "system";

@Injectable()
export class AuditLogService {
  constructor(private readonly repository: AuditLogRepository) {}

  record(entity: string, entityId: string, action: string) {
    return this.repository.record({ actor: STUB_ACTOR, entity, entityId, action });
  }

  list(input: ListAuditEntriesInput) {
    return this.repository.list(input);
  }
}
