import { Inject, Injectable } from "@nestjs/common";
import { HealthIndicatorService } from "@nestjs/terminus";
import type { Redis } from "ioredis";

import { REDIS_CLIENT } from "../../redis/redis.constants.js";

// Готового индикатора Redis в terminus нет (раздел "Фаза 4" задания,
// пункт 6) — пишем свой через HealthIndicatorService, как PrismaHealthIndicator
// устроен внутри самого terminus.
@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  pingCheck<Key extends string>(key: Key) {
    return this.healthIndicatorService
      .check(key)
      .attempt(async () => {
        await this.redis.ping();
      })
      .withTimeout(1000)
      .cacheFor(5000);
  }
}
