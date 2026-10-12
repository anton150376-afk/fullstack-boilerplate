// Маскирование — в ядре, не в вызывающем коде (раздел "Фаза 9" задания,
// пункт 9.1): вторая линия защиты. Первая — форма данных сама (у
// RequestLogEntry/ActionTrailEntry физически нет поля для заголовков,
// тел запроса и значений полей формы, раздел "Фаза 5/9" задания). Эта
// функция нужна там, где секрет МОЖЕТ просочиться текстом — сообщение
// console.error, вставившее токен в строку ошибки, не структурой.
const SENSITIVE_KEY_PATTERN = /^(authorization|token|password|secret|api[-_]?key|cookie)$/i;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._-]+/gi;
const MASK = "[masked]";

function maskString(value: string): string {
  return value.replace(BEARER_PATTERN, `Bearer ${MASK}`);
}

/**
 * Рекурсивно обходит значение и маскирует:
 * - значения по ключам из SENSITIVE_KEY_PATTERN (authorization, token, password, ...);
 * - подстроки вида "Bearer <токен>" внутри произвольного текста (например, в сообщении лога).
 */
export function maskSecrets(value: unknown, seen = new WeakSet()): unknown {
  if (typeof value === "string") {
    return maskString(value);
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return value;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => maskSecrets(item, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY_PATTERN.test(key) ? MASK : maskSecrets(entry, seen);
  }
  return result;
}
