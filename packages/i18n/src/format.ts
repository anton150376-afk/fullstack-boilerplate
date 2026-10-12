// Тонкие обёртки над Intl — единая точка, через которую веб, мобильное и
// сервер форматируют даты, числа и относительное время. На мобильном
// Hermes не реализует Intl.PluralRules/RelativeTimeFormat/Locale без
// полифила (грабля 26 задания); сами обёртки от этого не зависят —
// зависимость закрывается подключением полифила в точке входа потребителя.

export function formatNumber(
  value: number,
  language: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(language, options).format(value);
}

export function formatDate(
  value: Date | number,
  language: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(language, options).format(value);
}

export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  language: string,
): string {
  return new Intl.RelativeTimeFormat(language, { numeric: "auto" }).format(value, unit);
}
