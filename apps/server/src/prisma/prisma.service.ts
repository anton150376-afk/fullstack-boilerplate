import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";

import type { Env } from "../config/env.schema.js";
import { PrismaClient } from "../generated/prisma/client.js";

// Доступ к данным — только через репозитории конкретных модулей
// (правило server.md); этот сервис — единственное место, которое знает
// про PrismaClient и адаптер подключения.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    const adapter = new PrismaPg({
      connectionString: config.get("DATABASE_URL", { infer: true }),
    });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
