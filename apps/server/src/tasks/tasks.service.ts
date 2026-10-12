import { Injectable, NotFoundException } from "@nestjs/common";

import type { CreateTaskInput } from "@boilerplate/contract";

import { AuditLogService } from "../audit-log/audit-log.service.js";
import { TasksRepository } from "./tasks.repository.js";

@Injectable()
export class TasksService {
  constructor(
    private readonly repository: TasksRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  findAll() {
    return this.repository.findAll();
  }

  async findById(id: string) {
    const task = await this.repository.findById(id);
    if (!task) {
      throw new NotFoundException(`Задача ${id} не найдена`);
    }
    return task;
  }

  async create(data: CreateTaskInput) {
    const task = await this.repository.create(data);
    await this.auditLog.record("task", task.id, "create");
    return task;
  }

  async toggle(id: string) {
    const task = await this.findById(id);
    const updated = await this.repository.setDone(id, !task.done);
    await this.auditLog.record("task", id, "update");
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.repository.delete(id);
    await this.auditLog.record("task", id, "delete");
  }
}
