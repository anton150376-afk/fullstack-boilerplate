import { Controller, Res } from "@nestjs/common";
import { Implement, implement } from "@orpc/nest";
import type { Response } from "express";

import { contract } from "@boilerplate/contract";

import { AuditLogService } from "./audit-log.service.js";

// Непомеченный @Res() — см. notes.controller.ts: выключает автоответ
// Nest, ImplementInterceptor пишет ответ сам.
@Controller()
export class AuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Implement(contract.auditLog)
  implementAuditLog(@Res() _res: Response) {
    return {
      list: implement(contract.auditLog.list).handler(async ({ input }) => {
        const { items, total } = await this.auditLog.list({
          entity: input.entity,
          actor: input.actor,
          take: input.pageSize,
          skip: input.page * input.pageSize,
        });
        return { items, total };
      }),
    };
  }
}
