import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";

import { defaultLanguage, supportedLanguages } from "@boilerplate/i18n";

// Язык по cookie, не по сегменту пути (раздел "Фаза 6" задания, пункт 7):
// при серверном рендеринге cookie читается серверной функцией, и не
// приходится протаскивать параметр языка через каждый маршрут.
export const LANGUAGE_COOKIE = "lang";
const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function isSupportedLanguage(
  value: string | undefined,
): value is (typeof supportedLanguages)[number] {
  return (supportedLanguages as readonly string[]).includes(value ?? "");
}

export const getLanguage = createServerFn({ method: "GET" }).handler(() => {
  const cookie = getCookie(LANGUAGE_COOKIE);
  return isSupportedLanguage(cookie) ? cookie : defaultLanguage;
});

export const setLanguage = createServerFn({ method: "POST" })
  .validator((language: string) => language)
  .handler(({ data }) => {
    setCookie(LANGUAGE_COOKIE, data, { path: "/", maxAge: LANGUAGE_COOKIE_MAX_AGE });
    return { language: data };
  });
