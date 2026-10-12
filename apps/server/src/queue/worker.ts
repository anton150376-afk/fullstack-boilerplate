import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";

import { validateEnv } from "../config/env.schema.js";
import { initTracing } from "../observability/tracing.js";
import { WorkerModule } from "../worker.module.js";

async function bootstrap(): Promise<void> {
  // Тот же шов, что у HTTP-процесса (src/main.ts) — воркер отдельный
  // процесс (раздел "Фаза 4" задания, пункт 5) со своими записями pino,
  // которым тоже нужны traceId/spanId при включённой трассировке.
  initTracing(validateEnv(process.env));

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
}

void bootstrap();
