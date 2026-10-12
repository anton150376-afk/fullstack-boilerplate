import { Logger } from "@nestjs/common";
import { ORPCError } from "@orpc/nest";

const defaultLogger = new Logger("ORPC");

// oRPC превращает исключение внутри обработчика в обезличенный ответ 500
// ("Internal server error") и само его нигде не записывает. До этого
// логирования сбой не оставлял в журнале сервера ни причины, ни стека:
// живой запуск показал 500 на POST /notes, а в журнале было только
// "request errored" без исходной ошибки. Подключается в app.module.ts через
// onError() прямо в массиве interceptors: там выводятся нужные типы.
//
// Ответы 4xx (проверка входа, типизированные ошибки из контракта) — ожидаемое
// поведение и в журнал как сбой не попадают.
export function logOrpcError(error: unknown, logger: Pick<Logger, "error"> = defaultLogger): void {
  if (error instanceof ORPCError && error.status < 500) {
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  logger.error(
    `Необработанная ошибка обработчика: ${message}`,
    error instanceof Error ? error.stack : undefined,
  );
}
