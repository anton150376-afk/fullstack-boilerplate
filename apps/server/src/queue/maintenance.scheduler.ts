import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, type OnModuleInit } from "@nestjs/common";
import type { Queue } from "bullmq";

import {
  CLEANUP_PENDING_UPLOADS_JOB,
  CLEANUP_SCHEDULER_ID,
  MAINTENANCE_QUEUE,
} from "./queue.constants.js";

@Injectable()
export class MaintenanceScheduler implements OnModuleInit {
  constructor(@InjectQueue(MAINTENANCE_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    // Расписания — только через Job Schedulers (раздел "Фаза 4" задания,
    // пункт 5). upsertJobScheduler идемпотентен по идентификатору
    // планировщика: повторный вызов при каждом рестарте процесса обновляет
    // существующее расписание на месте, не плодит дубликаты. Опции `utc`
    // больше нет — вместо неё `tz` (грабля 23 задания).
    await this.queue.upsertJobScheduler(
      CLEANUP_SCHEDULER_ID,
      { pattern: "0 * * * *", tz: "UTC" },
      { name: CLEANUP_PENDING_UPLOADS_JOB, data: {} },
    );
  }
}
