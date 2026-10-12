import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";

import type { Env } from "../config/env.schema.js";
import { REDIS_CLIENT } from "./redis.constants.js";

// Один клиент ioredis на процесс, общий для health-проверки и очередей —
// не плодить отдельные подключения на каждого потребителя.
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new Redis(config.get("REDIS_URL", { infer: true }), {
          maxRetriesPerRequest: null,
        }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
