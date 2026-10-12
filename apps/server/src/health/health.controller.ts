import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from "@nestjs/terminus";

import { PrismaService } from "../prisma/prisma.service.js";
import { RedisHealthIndicator } from "./indicators/redis.health-indicator.js";

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  // Только процесс: отзывчивость и потолок памяти. Никаких внешних
  // зависимостей здесь — короткий сбой Postgres не должен перезапускать
  // все инстансы (раздел "Фаза 4" задания, пункт 6).
  @Get("live")
  @HealthCheck()
  live() {
    return this.health.check([() => this.memory.checkHeap("memory_heap", 300 * 1024 * 1024)]);
  }

  // PostgreSQL и Redis. .cacheFor() на индикаторах не бьёт трафиком
  // проверок по зависимостям при частом опросе.
  @Get("ready")
  @HealthCheck()
  ready() {
    return this.health.check([
      () =>
        this.prismaIndicator.pingCheck("database", this.prisma).withTimeout(1000).cacheFor(5000),
      () => this.redisIndicator.pingCheck("redis"),
    ]);
  }
}
