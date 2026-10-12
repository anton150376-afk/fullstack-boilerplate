import { defineProject } from "vitest/config";

import { domPreset } from "@boilerplate/testing/presets/dom";

export default defineProject({
  test: {
    ...domPreset,
    name: "web",
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
    // Адрес API задан здесь, а не берётся из корневого .env: Vitest читает .env
    // из корня репозитория, и без него (свежий клон, CI) import.meta.env.VITE_API_URL
    // пуст, а new URL("") роняет рендер страниц с "Invalid URL" (найдено первым
    // запуском CI на GitHub; локально и в чистой копии с .env это не воспроизводится).
    env: { VITE_API_URL: "http://localhost:3000" },
  },
});
