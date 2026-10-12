import type { LogEntry } from "./bug-report.js";

const MAX_ENTRIES = 200;

export interface LogBuffer {
  entries(): readonly LogEntry[];
  record(level: LogEntry["level"], message: string): void;
  /**
   * Перехватывает console.error/console.warn — единственная часть
   * перехвата, одинаковая на вебе и мобильном (console есть везде).
   * Необработанные исключения и отказы промисов — платформенные API
   * (window.onerror/onunhandledrejection на вебе, ErrorUtils на RN),
   * их ставит вызывающий код (apps/web, apps/mobile), вызывая record()
   * напрямую с уровнем "uncaughtException"/"unhandledRejection"
   * (раздел "Фаза 9" задания, пункт 9.1).
   * @returns функция отключения перехвата.
   */
  installConsoleInterceptor(): () => void;
}

export function createLogBuffer(maxEntries = MAX_ENTRIES): LogBuffer {
  const buffer: LogEntry[] = [];

  function record(level: LogEntry["level"], message: string): void {
    buffer.push({ level, message, timestamp: new Date().toISOString() });
    if (buffer.length > maxEntries) {
      buffer.shift();
    }
  }

  return {
    entries: () => buffer.slice(),
    record,
    installConsoleInterceptor() {
      const originalError = console.error;
      const originalWarn = console.warn;

      console.error = (...args: unknown[]) => {
        record("error", args.map(String).join(" "));
        originalError(...args);
      };
      console.warn = (...args: unknown[]) => {
        record("warn", args.map(String).join(" "));
        originalWarn(...args);
      };

      return () => {
        console.error = originalError;
        console.warn = originalWarn;
      };
    },
  };
}
