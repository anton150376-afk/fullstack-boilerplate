import { Injectable, NotFoundException } from "@nestjs/common";

import type { CreateNoteInput, UpdateNoteInput } from "@boilerplate/contract";

import { AuditLogService } from "../audit-log/audit-log.service.js";
import { NotificationsService } from "../queue/notifications.service.js";
import { NotesRepository } from "./notes.repository.js";

@Injectable()
export class NotesService {
  constructor(
    private readonly repository: NotesRepository,
    private readonly notifications: NotificationsService,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll() {
    return this.repository.findAll();
  }

  async findById(id: string) {
    const note = await this.repository.findById(id);
    if (!note) {
      throw new NotFoundException(`Заметка ${id} не найдена`);
    }
    return note;
  }

  async create(data: CreateNoteInput) {
    const note = await this.repository.create(data);
    // Побочный эффект идёт в очередь, а не выполняется синхронно в
    // обработчике запроса — обработка идемпотентна на стороне воркера
    // (NotificationsProcessor), повтор безопасен.
    await this.notifications.notifyNoteCreated(note.id);
    await this.auditLog.record("note", note.id, "create");
    return note;
  }

  async update(id: string, data: UpdateNoteInput) {
    await this.findById(id);
    const note = await this.repository.update(id, data);
    await this.auditLog.record("note", id, "update");
    return note;
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.repository.delete(id);
    await this.auditLog.record("note", id, "delete");
  }
}
