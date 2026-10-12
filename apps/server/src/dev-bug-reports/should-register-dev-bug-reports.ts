// Вынесено из app.module.ts в отдельную чистую функцию, чтобы проверить
// правило регистрации без импорта всего AppModule — тот тянет
// ConfigModule.forRoot() (апп.module.ts импортирует его статически),
// который на этой машине падает без настоящих S3-ключей (раздел "Фаза 9"
// задания, пункт 9.3 — маршрута в проде нет вовсе, проверка этого правила
// не должна зависеть от того, поднят ли реальный S3/Postgres/Redis).
export function shouldRegisterDevBugReports(nodeEnv: string | undefined): boolean {
  return nodeEnv !== "production";
}
