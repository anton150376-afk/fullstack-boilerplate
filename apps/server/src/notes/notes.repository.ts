import { Injectable } from "@nestjs/common";

import type { CreateNoteInput, UpdateNoteInput } from "@boilerplate/contract";

import { PrismaService } from "../prisma/prisma.service.js";

// Единственное место, которое обращается к PrismaClient для этого модуля
// (правило server.md: доступ к БД только через репозиторий).
@Injectable()
export class NotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.note.findMany({ orderBy: { createdAt: "desc" } });
  }

  findById(id: string) {
    return this.prisma.note.findUnique({ where: { id } });
  }

  create(data: CreateNoteInput) {
    return this.prisma.note.create({ data });
  }

  update(id: string, data: UpdateNoteInput) {
    return this.prisma.note.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.note.delete({ where: { id } });
  }
}
