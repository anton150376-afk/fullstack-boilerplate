import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";

export interface RecordAuditEntryInput {
  actor: string;
  entity: string;
  entityId: string;
  action: string;
}

export interface ListAuditEntriesInput {
  entity?: string;
  actor?: string;
  take: number;
  skip: number;
}

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  record(data: RecordAuditEntryInput) {
    return this.prisma.auditLogEntry.create({ data });
  }

  async list({ entity, actor, take, skip }: ListAuditEntriesInput) {
    const where = {
      ...(entity ? { entity } : {}),
      ...(actor ? { actor } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLogEntry.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        take,
        skip,
      }),
      this.prisma.auditLogEntry.count({ where }),
    ]);
    return { items, total };
  }
}
