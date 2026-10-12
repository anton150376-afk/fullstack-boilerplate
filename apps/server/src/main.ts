import "reflect-metadata";

import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module.js";
import { createCorsOptions } from "./common/cors.js";
import { validateEnv, type Env } from "./config/env.schema.js";
import { initTracing } from "./observability/tracing.js";

async function bootstrap(): Promise<void> {
  // До NestFactory.create — провайдер трассировки должен быть
  // зарегистрирован раньше, чем начнёт работать что-либо, что может
  // создавать спаны (раздел "Фаза 4" задания, пункт 9).
  initTracing(validateEnv(process.env));

  // bodyParser: false — иначе глобальный json() от Nest (лимит 100кб по
  // умолчанию у body-parser) срабатывает раньше per-route лимита
  // DevBugReportsModule.configure() и режет легитимный отчёт со
  // скриншотом до того, как заработает собственный, больший лимит
  // (раздел "Фаза 9" задания, пункт 9.3; найдено тестом dev-bug-reports.e2e-spec.ts).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const config = app.get(ConfigService<Env, true>);
  const cors = createCorsOptions(config.get("CORS_ORIGINS", { infer: true }));
  if (cors) {
    app.enableCors(cors);
  }
  const port = config.get("PORT", { infer: true });
  await app.listen(port);
}

void bootstrap();
