import { Injectable } from "@nestjs/common";

import type { CreateTaskInput } from "@boilerplate/contract";

import { PrismaService } from "../prisma/prisma.service.js";

// Единственное место, которое обращается к PrismaClient для этого модуля
// (правило server.md: доступ к БД только через репозиторий).
@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.task.findMany({ orderBy: { createdAt: "desc" } });
  }

  findById(id: string) {
    return this.prisma.task.findUnique({ where: { id } });
  }

  create(data: CreateTaskInput) {
    return this.prisma.task.create({ data });
  }

  setDone(id: string, done: boolean) {
    return this.prisma.task.update({ where: { id }, data: { done } });
  }

  delete(id: string) {
    return this.prisma.task.delete({ where: { id } });
  }
}
