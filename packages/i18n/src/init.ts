import i18next, { type i18n as I18nInstance } from "i18next";

import { defaultLanguage, defaultNamespace, resources, supportedLanguages } from "./resources.js";

export interface CreateI18nOptions {
  language?: (typeof supportedLanguages)[number];
}

/**
 * Создаёт независимый экземпляр i18next с уже вшитыми каталогами.
 * Инициализация синхронна: ресурсы переданы напрямую (без backend-плагина),
 * поэтому возвращённый экземпляр готов к использованию сразу — промис
 * `init()` опущен намеренно, а не по недосмотру.
 *
 * Полифилы `Intl.PluralRules`/`Intl.Locale` сюда не импортируются — в Hermes
 * их нет (грабля 26 задания), но нужны они только мобильному приложению.
 * Импортировать `@formatjs/intl-pluralrules` и `@formatjs/intl-locale` из
 * `/polyfill-force` обязана точка входа `apps/mobile`, до вызова этой
 * функции.
 */
export function createI18n(options: CreateI18nOptions = {}): I18nInstance {
  const instance = i18next.createInstance();
  void instance.init({
    lng: options.language ?? defaultLanguage,
    fallbackLng: defaultLanguage,
    defaultNS: defaultNamespace,
    resources,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instance;
}

export { defaultLanguage, defaultNamespace, resources, supportedLanguages };
