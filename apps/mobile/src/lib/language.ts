import { getLocales } from "expo-localization";
import { getItemAsync, setItemAsync } from "expo-secure-store";

import { defaultLanguage, supportedLanguages } from "@boilerplate/i18n";

const KEY = "language";

function isSupported(code: string): code is (typeof supportedLanguages)[number] {
  return (supportedLanguages as readonly string[]).includes(code);
}

// Сохранённый выбор — приоритет перед системной локалью (раздел "Фаза 7"
// задания, пункт 6: "язык определять через expo-localization с
// сохранением выбора"). expo-secure-store — не самое очевидное место для
// несекретного значения, но лишнего хранилища (AsyncStorage) ради одной
// строки не добавляем — см. docs/apps/mobile.md.
export async function getInitialLanguage(): Promise<(typeof supportedLanguages)[number]> {
  const saved = await getItemAsync(KEY);
  if (saved && isSupported(saved)) {
    return saved;
  }

  // getLocales() гарантированно отдаёт непустой массив (тип — кортеж
  // [Locale, ...Locale[]]) — [0] не nullable, опциональная цепочка лишняя.
  const deviceCode = getLocales()[0].languageCode;
  if (deviceCode && isSupported(deviceCode)) {
    return deviceCode;
  }

  return defaultLanguage;
}

export function saveLanguage(language: (typeof supportedLanguages)[number]): Promise<void> {
  return setItemAsync(KEY, language);
}
