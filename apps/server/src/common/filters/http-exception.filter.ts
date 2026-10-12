import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { PinoLogger } from "nestjs-pino";

export interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  requestId: string | undefined;
  timestamp: string;
  path: string;
}

// Единый формат ошибки для всего API. Исключение, не являющееся
// HttpException, — это ошибка программиста, а не ожидаемый отказ: наружу
// уходит только "Internal Server Error", подробности — в лог по
// request-id (правило server.md: секреты и персональные данные в лог не
// попадают — это касается и трассировки стека с возможными значениями).
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.id as string | undefined;

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException ? exception.getResponse() : { message: "Internal Server Error" };

    const message =
      typeof body === "string"
        ? body
        : ((body as { message?: string | string[] }).message ?? "Internal Server Error");

    if (!isHttpException) {
      this.logger.error({ err: exception, requestId }, "Необработанное исключение");
    }

    const payload: ErrorResponseBody = {
      statusCode: status,
      error: HttpStatus[status] ?? "Error",
      message,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(payload);
  }
}
