import { Controller, Get, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { OpenAPI } from "@orpc/contract";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

import { contract } from "@boilerplate/contract";

import type { Env } from "../config/env.schema.js";

// zod4-подпуть обязателен (раздел "Фаза 5" задания, пункт 5.1): корневой
// "@orpc/zod" без "/zod4" читает типы из "zod/v3" и не поймёт схемы Zod 4
// из packages/contract — расхождение найдено разбором исходников пакета,
// не по документации.
const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

let specPromise: Promise<OpenAPI.Document> | undefined;

function getSpec(): Promise<OpenAPI.Document> {
  specPromise ??= generator.generate(contract, {
    info: { title: "Boilerplate API", version: "0.0.0" },
  });
  return specPromise;
}

@Controller()
export class OpenApiController {
  constructor(private readonly config: ConfigService<Env, true>) {}

  // Публикуется только в разработке (раздел "Фаза 5" задания, пункт 5.1):
  // в проде маршрута нет вовсе, а не просто "не документирован".
  @Get("openapi.json")
  async getSpec(): Promise<OpenAPI.Document> {
    if (this.config.get("NODE_ENV", { infer: true }) === "production") {
      throw new NotFoundException();
    }
    return getSpec();
  }
}
