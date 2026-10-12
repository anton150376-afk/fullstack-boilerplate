// Подписи общих компонентов ui-web и ui-native. Компоненты не знают про
// react-i18next (правило ui.md: пакеты не привязаны к приложению): подписи
// приходят пропсом `labels`, а значения по умолчанию — русские, они же
// проверяются существующими тестами. Типы и значения лежат здесь, а не в
// каждом из двух пакетов, чтобы у веба и мобильного набор ключей совпадал
// по построению (паритет, docs/packages/ui.md).

export interface BugReportLabels {
  /** Текст плавающей кнопки и заголовок формы; проп `label` компонента имеет приоритет. */
  title: string;
  success: string;
  description: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  /** Только ui-web: поле выбора файла со снимком. */
  attachScreenshot: string;
  /** Только ui-web: снимок выбран вручную. */
  screenshotAttached: string;
  /** Только ui-native: снимок сделан автоматически. */
  screenshotAttachedAuto: string;
  cancel: string;
  submit: string;
  submitFailed: string;
}

export const defaultBugReportLabels: BugReportLabels = {
  title: "Сообщить о проблеме",
  success: "Отчёт отправлен, спасибо!",
  description: "Описание",
  stepsToReproduce: "Шаги воспроизведения",
  expectedBehavior: "Ожидаемое поведение",
  attachScreenshot: "Приложить снимок экрана",
  screenshotAttached: "Снимок приложен",
  screenshotAttachedAuto: "Снимок экрана приложен автоматически",
  cancel: "Отмена",
  submit: "Отправить",
  submitFailed: "Не удалось отправить отчёт",
};

export interface FileUploadLabels {
  /** Только ui-web: подпись поля выбора файла. */
  fileInput: string;
  /** Только ui-native: кнопка вызова системного пикера. */
  pickFile: string;
  progress: string;
  confirming: string;
  uploadFailed: string;
  /** Только ui-web: хранилище не ответило. */
  networkUnavailable: string;
  /** Только ui-web: ответ хранилища 413. */
  tooLarge: string;
  /** Только ui-web: ответ хранилища 400. */
  rejected: string;
  /** Только ui-web: прочие коды ответа хранилища. */
  rejectedWithCode: (status: number) => string;
}

export const defaultFileUploadLabels: FileUploadLabels = {
  fileInput: "Файл для загрузки",
  pickFile: "Выбрать файл",
  progress: "Прогресс загрузки",
  confirming: "Подтверждение…",
  uploadFailed: "Загрузка не удалась",
  networkUnavailable: "Сеть недоступна — хранилище не ответило",
  tooLarge: "Файл превышает допустимый размер",
  rejected: "Хранилище отклонило файл — проверьте тип и размер",
  rejectedWithCode: (status) => `Хранилище отклонило загрузку (код ${status})`,
};

/** Подписи из пропса поверх значений по умолчанию; незаданные ключи остаются русскими. */
export function resolveLabels<T extends object>(defaults: T, overrides?: Partial<T>): T {
  return { ...defaults, ...overrides };
}
