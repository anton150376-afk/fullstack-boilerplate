import type { BrowserContext } from "@playwright/test";

// Язык интерфейса задаётся cookie `lang` (apps/web/src/lib/language.ts):
// фиксируем его, чтобы подписи в тестах не зависели от настроек машины.
export async function setLanguage(
  context: BrowserContext,
  baseURL: string | undefined,
  language: "ru" | "en",
): Promise<void> {
  await context.addCookies([
    { name: "lang", value: language, url: baseURL ?? "http://localhost:3001" },
  ]);
}

export const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
