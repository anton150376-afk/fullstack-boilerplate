import type { ActionTrailEntry } from "./bug-report.js";

const MAX_ENTRIES = 30;

export interface ActionTrail {
  entries(): readonly ActionTrailEntry[];
  record(type: ActionTrailEntry["type"], label: string): void;
}

// Значения полей не записываются (раздел "Фаза 9" задания, пункт 9.1) —
// не политика вызывающего кода, а форма данных: record() принимает
// только type и label (имя маршрута, data-testid/accessibilityLabel,
// имя формы), а не произвольный объект, где могло бы оказаться
// значение поля ввода.
export function createActionTrail(maxEntries = MAX_ENTRIES): ActionTrail {
  const buffer: ActionTrailEntry[] = [];

  return {
    entries: () => buffer.slice(),
    record(type, label) {
      buffer.push({ type, label, timestamp: new Date().toISOString() });
      if (buffer.length > maxEntries) {
        buffer.shift();
      }
    },
  };
}
