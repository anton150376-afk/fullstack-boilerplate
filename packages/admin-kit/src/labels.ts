// Подписи компонентов конструктора админки. Пакет не знает про react-i18next
// (правило ui.md): приложение передаёт переведённые подписи пропсом `labels`,
// а значения по умолчанию — русские, их же проверяют тесты пакета.
// Подписи, зависящие от чисел, заданы функциями: форма числа у каждого
// языка своя, и собрать её из частей строки нельзя.
import { resolveLabels } from "@boilerplate/ui-core";

export { resolveLabels };

export interface DataTableLabels {
  empty: string;
  loading: string;
  loadFailed: string;
  previous: string;
  next: string;
  /** Номер страницы (с 1), число страниц и общее число строк. */
  page: (page: number, pageCount: number, rowCount: number) => string;
}

export const defaultDataTableLabels: DataTableLabels = {
  empty: "Нет данных",
  loading: "Загрузка…",
  loadFailed: "Не удалось загрузить данные",
  previous: "Назад",
  next: "Далее",
  page: (page, pageCount, rowCount) => `Страница ${page} из ${pageCount} — всего ${rowCount}`,
};

export interface ResourceFormLabels {
  submit: string;
}

export const defaultResourceFormLabels: ResourceFormLabels = {
  submit: "Сохранить",
};

export interface AdminLayoutLabels {
  /** Имя области навигации для скринридера. */
  navigation: string;
  systemStatus: string;
}

export const defaultAdminLayoutLabels: AdminLayoutLabels = {
  navigation: "Админка",
  systemStatus: "Состояние системы",
};

export interface ServicePageLabels {
  forbiddenTitle: string;
  forbiddenMessage: string;
  notFoundTitle: string;
  loginTitle: string;
  email: string;
  password: string;
  login: string;
}

export const defaultServicePageLabels: ServicePageLabels = {
  forbiddenTitle: "403 — Доступ запрещён",
  forbiddenMessage: "У вас нет прав для просмотра этой страницы.",
  notFoundTitle: "404 — Страница не найдена",
  loginTitle: "Вход",
  email: "Email",
  password: "Пароль",
  login: "Войти",
};

export interface SystemStatusLabels {
  title: string;
  buildVersion: (version: string) => string;
  loading: string;
  loadFailed: string;
}

export const defaultSystemStatusLabels: SystemStatusLabels = {
  title: "Состояние системы",
  buildVersion: (version) => `Версия сборки: ${version}`,
  loading: "Загрузка…",
  loadFailed: "Не удалось получить состояние",
};

export interface AuditLogLabels {
  when: string;
  actor: string;
  entity: string;
  id: string;
  action: string;
  empty: string;
  /** Язык форматирования даты в колонке «Когда». */
  locale: string;
}

export const defaultAuditLogLabels: AuditLogLabels = {
  when: "Когда",
  actor: "Кто",
  entity: "Сущность",
  id: "ID",
  action: "Действие",
  empty: "Журнал пуст",
  locale: "ru-RU",
};
