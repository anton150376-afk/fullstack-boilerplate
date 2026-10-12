import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import type { Redis } from "ioredis";

import { REDIS_CLIENT } from "../redis/redis.constants.js";
import { MaintenanceProcessor } from "./maintenance.processor.js";
import { MaintenanceScheduler } from "./maintenance.scheduler.js";
import { NotificationsProcessor } from "./notifications.processor.js";
import { NotificationsService } from "./notifications.service.js";
import { MAINTENANCE_QUEUE, NOTIFICATIONS_QUEUE } from "./queue.constants.js";

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [REDIS_CLIENT],
      useFactory: (connection: Redis) => ({ connection }),
    }),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }, { name: MAINTENANCE_QUEUE }),
  ],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    MaintenanceScheduler,
    MaintenanceProcessor,
  ],
  exports: [NotificationsService],
})
export class QueueModule {}
