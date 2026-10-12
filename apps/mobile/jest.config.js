/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  // 5 секунд по умолчанию не хватает: под полным гейтом параллельно идут tsc,
  // ESLint, Vitest и Jest, а первый прогон Jest в новом каталоге (свежий клон)
  // компилирует Babel-ом дерево react-native прямо внутри первого теста файла
  // и занимает до 90 секунд (B-261008-openapi-test-flaky-under-load).
  testTimeout: 120000,
  roots: ["<rootDir>/src"],
  // Исходники (включая общие пакеты типа @boilerplate/i18n) импортируют
  // друг друга с расширением .js — резолвер Jest не отображает .js на
  // .ts/.tsx сам, снимаем расширение вручную (тот же приём, что
  // packages/ui-native/jest.config.js).
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  // jest-expo's default (see jest-preset.js) не транспилирует @formatjs —
  // чистый ESM-пакет (polyfill-force.js), нужен тесту на русские формы
  // множественного числа (src/i18n-ru-plurals.test.ts). Полный список
  // переопределяет, не добавляет (Jest не мёрджит массивы опций с
  // пресетом) — оставлен тот же набор, что в jest-expo, плюс @formatjs.
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@formatjs))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
};
