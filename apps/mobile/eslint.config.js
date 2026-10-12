import native from "@boilerplate/eslint-config/native";

export default [
  // routeTree-подобный генерируемый файл у Expo Router — типов маршрутов
  // (.expo/types), не исходник; uniwind-env.d.ts — генерируется Metro
  // (withUniwindConfig/dtsFile) при первом запуске, до него файла нет.
  // metro.config.js — require() и возвращаемые any от сторонних пакетов
  // без типов (metro-resolver) неизбежно дают "unsafe"-находки в типизированном
  // линтере (тот же класс проблемы, что apps/web/server-entry.mjs — Фаза 6).
  // scripts/generate-types.mjs — служебный Node-скрипт вне tsconfig проекта
  // (turbo, задача generate:types).
  // android/ и ios/ — native-проекты, которые генерирует expo prebuild (в .gitignore).
  {
    ignores: [
      ".expo/**",
      "android/**",
      "ios/**",
      "uniwind-env.d.ts",
      "metro.config.js",
      "scripts/**",
    ],
  },
  ...native,
];
