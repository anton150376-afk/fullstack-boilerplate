import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class FilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  createPending(key: string, contentType: string) {
    return this.prisma.uploadedFile.create({
      data: { key, contentType, status: "PENDING" },
    });
  }

  findById(id: string) {
    return this.prisma.uploadedFile.findUnique({ where: { id } });
  }

  markReady(id: string, size: number, contentType: string) {
    return this.prisma.uploadedFile.update({
      where: { id },
      data: { status: "READY", size, contentType, confirmedAt: new Date() },
    });
  }

  markFailed(id: string) {
    return this.prisma.uploadedFile.update({
      where: { id },
      data: { status: "FAILED" },
    });
  }
}
