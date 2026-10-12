import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import type { Job } from "bullmq";

import { PrismaService } from "../prisma/prisma.service.js";
import type { NoteCreatedPayload } from "./notifications.service.js";
import { NOTIFICATIONS_QUEUE } from "./queue.constants.js";

@Injectable()
@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<NoteCreatedPayload>): Promise<void> {
    const idempotencyKey = job.id;
    if (!idempotencyKey) {
      // jobId всегда задан явно при постановке задачи (NotificationsService) —
      // отсутствие здесь означает ошибку в коде, который её поставил.
      throw new Error("Задача без jobId — идемпотентность не гарантирована");
    }

    this.logger.log(`Обработка ${job.name} (jobId=${job.id}, noteId=${job.data.noteId})`);

    const already = await this.prisma.processedJob.findUnique({ where: { idempotencyKey } });
    if (already) {
      this.logger.log(`Задача ${job.id} уже обработана — побочный эффект не повторяется`);
      return;
    }

    // Побочный эффект (в реальном проекте — вызов внешнего сервиса
    // уведомлений) и ключ идемпотентности пишутся в одной транзакции:
    // либо применились оба, либо ни один (раздел "Фаза 4" задания, пункт 5).
    await this.prisma.$transaction(async (tx) => {
      await tx.processedJob.create({ data: { idempotencyKey, jobName: job.name } });
    });

    this.logger.log(`Задача ${job.id} обработана`);
  }
}
