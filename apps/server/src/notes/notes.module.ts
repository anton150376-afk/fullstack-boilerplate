import { Module } from "@nestjs/common";

import { AuditLogModule } from "../audit-log/audit-log.module.js";
import { QueueModule } from "../queue/queue.module.js";
import { NotesController } from "./notes.controller.js";
import { NotesRepository } from "./notes.repository.js";
import { NotesService } from "./notes.service.js";

@Module({
  imports: [QueueModule, AuditLogModule],
  controllers: [NotesController],
  providers: [NotesService, NotesRepository],
})
export class NotesModule {}
