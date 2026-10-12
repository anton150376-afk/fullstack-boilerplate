import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import type { Job } from "bullmq";

import { PrismaService } from "../prisma/prisma.service.js";
import {
  CLEANUP_PENDING_UPLOADS_JOB,
  MAINTENANCE_QUEUE,
  PENDING_UPLOAD_MAX_AGE_MS,
} from "./queue.constants.js";

@Injectable()
@Processor(MAINTENANCE_QUEUE)
export class MaintenanceProcessor extends WorkerHost {
  private readonly logger = new Logger(MaintenanceProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== CLEANUP_PENDING_UPLOADS_JOB) {
      this.logger.warn(`Неизвестное имя задачи в очереди ${MAINTENANCE_QUEUE}: ${job.name}`);
      return;
    }

    const cutoff = new Date(Date.now() - PENDING_UPLOAD_MAX_AGE_MS);
    const result = await this.prisma.uploadedFile.updateMany({
      where: { status: "PENDING", createdAt: { lt: cutoff } },
      data: { status: "FAILED" },
    });

    this.logger.log(`Уборка брошенных загрузок: помечено FAILED — ${result.count}`);
  }
}
