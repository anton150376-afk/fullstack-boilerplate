import { Module } from "@nestjs/common";

import { AuditLogModule } from "../audit-log/audit-log.module.js";
import { TasksController } from "./tasks.controller.js";
import { TasksRepository } from "./tasks.repository.js";
import { TasksService } from "./tasks.service.js";

@Module({
  imports: [AuditLogModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
})
export class TasksModule {}
