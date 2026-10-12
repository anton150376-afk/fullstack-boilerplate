import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { onError, ORPCModule } from "@orpc/nest";
import { LoggerModule } from "nestjs-pino";

import { AuditLogModule } from "./audit-log/audit-log.module.js";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter.js";
import { logOrpcError } from "./common/orpc-error-logging.js";
import { ConfigModule } from "./config/config.module.js";
import type { Env } from "./config/env.schema.js";
import { DevBugReportsModule } from "./dev-bug-reports/dev-bug-reports.module.js";
import { shouldRegisterDevBugReports } from "./dev-bug-reports/should-register-dev-bug-reports.js";
import { FilesModule } from "./files/files.module.js";
import { HealthModule } from "./health/health.module.js";
import { createPinoOptions } from "./logger/pino-options.js";
import { NotesModule } from "./notes/notes.module.js";
import { OpenApiModule } from "./openapi/openapi.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { QueueModule } from "./queue/queue.module.js";
import { RedisModule } from "./redis/redis.module.js";
import { TasksModule } from "./tasks/tasks.module.js";

@Module({
  imports: [
    ConfigModule,
    // Контракт (packages/contract, Фаза 5) — ORPCModule.forRoot() даёт
    // ImplementInterceptor, который @Implement подключает сам; без него
    // контроллеры с @Implement не могут внедрить ORPC_MODULE_CONFIG_SYMBOL.
    ORPCModule.forRoot({
      interceptors: [
        onError((error) => {
          logOrpcError(error);
        }),
      ],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: createPinoOptions(config.get("LOG_LEVEL", { infer: true })),
      }),
    }),
    PrismaModule,
    RedisModule,
    QueueModule,
    HealthModule,
    AuditLogModule,
    NotesModule,
    TasksModule,
    FilesModule,
    OpenApiModule,
    // В продакшене эндпоинта нет вовсе, а не просто 404 изнутри хендлера
    // (сильнее, чем у OpenApiController) — модуль не регистрируется, если
    // process.env читается здесь прямо, а не через ConfigService: массив
    // imports вычисляется до того, как DI успевает что-то внедрить
    // (раздел "Фаза 9" задания, пункт 9.3). Решение — отдельная чистая
    // функция (should-register-dev-bug-reports.ts), чтобы её проверить
    // без импорта всего AppModule (тот тянет ConfigModule.forRoot(),
    // которому нужны настоящие S3-ключи).
    ...(shouldRegisterDevBugReports(process.env.NODE_ENV) ? [DevBugReportsModule] : []),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
