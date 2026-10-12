import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";

import { ConfigModule } from "./config/config.module.js";
import type { Env } from "./config/env.schema.js";
import { createPinoOptions } from "./logger/pino-options.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { QueueModule } from "./queue/queue.module.js";
import { RedisModule } from "./redis/redis.module.js";

// Воркер — отдельный процесс без HTTP-адаптера (раздел "Фаза 4" задания,
// пункт 5): только то, что реально нужно обработчикам задач. HealthModule
// и NotesModule (HTTP-контроллеры) сюда не входят — им нечего обслуживать
// без HTTP-сервера.
@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: createPinoOptions(config.get("LOG_LEVEL", { infer: true })),
        microservice: true,
      }),
    }),
    PrismaModule,
    RedisModule,
    QueueModule,
  ],
})
export class WorkerModule {}
