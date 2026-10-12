import { z } from "zod";

// z.coerce.boolean() вызывает Boolean(value) — для строки "false" это
// true, потому что любая непустая строка истинна в JS. Для переменных
// окружения (где значение всегда строка) нужен настоящий разбор "true"/
// "false", а не приведение типа.
const booleanFromEnv = z.preprocess(
  (value) => (typeof value === "string" ? value.toLowerCase() === "true" : value),
  z.boolean(),
);

// Пустая строка в .env (`NAME=`) означает «не задано»: z.url() и z.string().min(1) её
// отвергают. В .env.example необязательные переменные стоят пустыми, и без этого сервер из
// скопированного .env не стартовал (найдено запуском контейнеров в CI).
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

// Источник страницы — схема, хост и порт без пути и без слэша в конце: именно так
// браузер присылает заголовок Origin и сравнивает его со списком CORS.
function isOrigin(value: string): boolean {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
}

// Падение при старте с внятным сообщением, если переменная отсутствует
// или не того формата (раздел "Фаза 4" задания, пункт 2). Все переменные
// здесь обязаны быть и в .env.example, и в docs/operations/env-vars.md —
// pnpm check:env это проверяет.
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  // Адреса веба и приложений, которым браузер разрешает обращаться к API
  // (CORS), через запятую. Пусто — CORS выключен (веб и API на одном адресе).
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin !== ""),
    )
    .pipe(
      z.array(
        z.string().refine(isOrigin, {
          message:
            "ожидается адрес источника без пути и слэша в конце, например http://localhost:3001",
        }),
      ),
    ),

  DATABASE_URL: z.url(),

  REDIS_URL: z.url(),

  S3_ENDPOINT: z.url(),
  // Адрес хранилища для клиента (браузер, приложение): в него попадают URL
  // подписанной формы и ссылки на скачивание. Не задан — используется
  // S3_ENDPOINT. В Docker сервер видит хранилище как http://garage:3900,
  // браузер — как http://localhost:3900 (docs/guides/docker.md).
  S3_PUBLIC_ENDPOINT: z.preprocess(emptyToUndefined, z.url().optional()),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleanFromEnv.default(true),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // Шов трассировки (раздел "Фаза 4" задания, пункт 9; D12, ADR-0001) —
  // по умолчанию выключен: автоинструментации и экспортёры OpenTelemetry
  // ещё 0.x, основа закладывает только стабильное ядро.
  OTEL_ENABLED: booleanFromEnv.default(false),

  // Приёмник багрепорта (раздел "Фаза 9" задания, пункт 9.1) — модуль
  // /dev/bug-reports регистрируется только при NODE_ENV !== "production"
  // (apps/server/src/app.module.ts), этот выбор на что-то дополнительное
  // влияет только внутри dev/test окружений.
  BUG_REPORT_RECEIVER: z.enum(["file", "github", "api"]).default("file"),
  BUG_REPORT_GITHUB_OWNER: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  BUG_REPORT_GITHUB_REPO: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  BUG_REPORT_GITHUB_TOKEN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Некорректные переменные окружения:\n${issues}`);
  }
  const env = result.data;
  // z.enum не умеет "обязательно, если соседнее поле равно X" — проверка
  // руками здесь же, чтобы сломанная конфигурация github-приёмника падала
  // при старте, а не при первой отправке отчёта.
  if (
    env.BUG_REPORT_RECEIVER === "github" &&
    (!env.BUG_REPORT_GITHUB_OWNER || !env.BUG_REPORT_GITHUB_REPO || !env.BUG_REPORT_GITHUB_TOKEN)
  ) {
    throw new Error(
      "BUG_REPORT_RECEIVER=github требует BUG_REPORT_GITHUB_OWNER, " +
        "BUG_REPORT_GITHUB_REPO и BUG_REPORT_GITHUB_TOKEN",
    );
  }
  return env;
}
