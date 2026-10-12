import "dotenv/config";

import { defineConfig, env } from "prisma/config";

// prismaSchemaFolder (раздел "Фаза 4" задания, пункт 4): каждый будущий
// модуль получает свой .prisma-файл в prisma/schema/ при общем журнале
// миграций в prisma/migrations/. В Prisma 7 эта фича уже GA, но
// расположение схемы и миграций задаётся здесь, а не previewFeatures
// (B-261008-prisma-schema-folder-ga в docs/BACKLOG.md).
export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed-demo.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
