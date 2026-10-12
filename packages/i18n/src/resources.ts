import enAdmin from "./locales/en/admin.json" with { type: "json" };
import enCommon from "./locales/en/common.json" with { type: "json" };
import enFiles from "./locales/en/files.json" with { type: "json" };
import enNotes from "./locales/en/notes.json" with { type: "json" };
import enTasks from "./locales/en/tasks.json" with { type: "json" };
import enUi from "./locales/en/ui.json" with { type: "json" };
import ruAdmin from "./locales/ru/admin.json" with { type: "json" };
import ruCommon from "./locales/ru/common.json" with { type: "json" };
import ruFiles from "./locales/ru/files.json" with { type: "json" };
import ruNotes from "./locales/ru/notes.json" with { type: "json" };
import ruTasks from "./locales/ru/tasks.json" with { type: "json" };
import ruUi from "./locales/ru/ui.json" with { type: "json" };

// Плоские каталоги JSON без шага сборки (раздел 2, Фаза 2 задания) — один
// и тот же импорт работает под Vite, под Metro и на сервере. Статический
// импорт оправдан, пока языков два: как только их станет больше, есть
// смысл перейти на `i18next-resources-to-backend` с динамическим импортом
// по языку — в ROADMAP как задел, не делать раньше времени.
export const resources = {
  en: {
    admin: enAdmin,
    common: enCommon,
    files: enFiles,
    notes: enNotes,
    tasks: enTasks,
    ui: enUi,
  },
  ru: {
    admin: ruAdmin,
    common: ruCommon,
    files: ruFiles,
    notes: ruNotes,
    tasks: ruTasks,
    ui: ruUi,
  },
} as const;

export const supportedLanguages = Object.keys(resources) as (keyof typeof resources)[];
export const defaultNamespace = "common";
export const defaultLanguage = "ru";
