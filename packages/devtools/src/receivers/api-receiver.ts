import type { BugReportReceiver } from "../bug-report.js";

// Раздел "Фаза 9" задания, пункт 9.1: приёмник в Postgres — "реализуется,
// если понадобится". Правило 2.2 задания запрещает реализовывать модули
// раньше времени, поэтому заготовка фиксирует только интерфейс: если
// понадобится, здесь появится Prisma-модель и настоящая запись.
export function createApiReceiver(): BugReportReceiver {
  return {
    submit(): Promise<void> {
      return Promise.reject(
        new Error(
          "Приёмник api не реализован: раздел 9.1 задания оставляет его на случай, " +
            "если понадобится запись отчётов в Postgres",
        ),
      );
    },
  };
}
