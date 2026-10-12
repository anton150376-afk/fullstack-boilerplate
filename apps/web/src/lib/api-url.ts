// Адрес API для SSR и для браузера (docs/BACKLOG.md,
// B-261008-web-ssr-vs-browser-api-url). В Docker сервер веба видит API по
// внутреннему имени сервиса (http://server:3000), а браузер — по публичному
// адресу. Публичный адрес вшивается в бандл на этапе сборки
// (VITE_API_URL), внутренний читается из окружения контейнера в рантайме
// (API_INTERNAL_URL) и действует только на сервере.
export interface ApiUrlSources {
  isServer: boolean;
  internalUrl: string | undefined;
  publicUrl: string;
}

export function resolveApiBaseUrl({ isServer, internalUrl, publicUrl }: ApiUrlSources): string {
  if (isServer && internalUrl) return internalUrl;
  return publicUrl;
}

export function getApiBaseUrl(): string {
  // process берётся из globalThis: tsconfig веба подключает только типы
  // vite/client, а в браузере process не определён вовсе.
  const { process } = globalThis as {
    process?: { readonly env: Record<string, string | undefined> };
  };
  return resolveApiBaseUrl({
    isServer: typeof window === "undefined",
    internalUrl: process === undefined ? undefined : process.env.API_INTERNAL_URL,
    publicUrl: import.meta.env.VITE_API_URL,
  });
}
