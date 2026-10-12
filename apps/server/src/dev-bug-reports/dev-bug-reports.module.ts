import { Module, type MiddlewareConsumer, type NestModule } from "@nestjs/common";
import { json } from "express";

import { MAX_BUG_REPORT_BYTES } from "./dev-bug-reports.constants.js";
import { DevBugReportsController } from "./dev-bug-reports.controller.js";
import { DevBugReportsService } from "./dev-bug-reports.service.js";

@Module({
  controllers: [DevBugReportsController],
  providers: [DevBugReportsService],
})
export class DevBugReportsModule implements NestModule {
  // Лимит именно на этот маршрут, не глобальный: отчёт со скриншотом
  // крупнее обычного JSON-тела остального API (раздел "Фаза 9" задания,
  // пункт 9.3 — "размер отчёта ограничен").
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(json({ limit: MAX_BUG_REPORT_BYTES })).forRoutes(DevBugReportsController);
  }
}
