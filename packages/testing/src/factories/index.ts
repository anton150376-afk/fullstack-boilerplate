// Фабрика тестовых данных общего назначения. Привязанных к доменным моделям
// фабрик здесь нет: сами модели появятся вместе с packages/contract
// (Фаза 5) — тогда у них будут свои фабрики поверх defineFactory, в
// соответствующем пакете, а не здесь.

export interface Factory<T> {
  build(overrides?: Partial<T>): T;
  buildList(count: number, overrides?: Partial<T>): T[];
}

/**
 * `defaults` получает порядковый номер вызова (с 1) — удобно для
 * детерминированных, но различимых полей (`email: \`user-${n}@example.com\``).
 */
export function defineFactory<T>(defaults: (sequence: number) => T): Factory<T> {
  let sequence = 0;

  const build = (overrides: Partial<T> = {}): T => {
    sequence += 1;
    return { ...defaults(sequence), ...overrides };
  };

  const buildList = (count: number, overrides: Partial<T> = {}): T[] =>
    Array.from({ length: count }, () => build(overrides));

  return { build, buildList };
}
