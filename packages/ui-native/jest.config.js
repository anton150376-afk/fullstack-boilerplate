// "jest-expo/universal" гоняет один файл четырьмя проектами (web, node,
// ios, android) — нужно только там, где есть платформенные .ios/.android/
// .web файлы. У наших компонентов таких нет, обычный "jest-expo" (RN/iOS
// профиль через react-test-renderer) достаточен и в 4 раза быстрее.
/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  // 5 секунд по умолчанию не хватает: под полным гейтом параллельно идут tsc,
  // ESLint, Vitest и Jest, а первый прогон Jest в новом каталоге (свежий клон)
  // компилирует Babel-ом дерево react-native прямо внутри первого теста файла
  // и занимает до 90 секунд (B-261008-openapi-test-flaky-under-load).
  testTimeout: 120000,
  roots: ["<rootDir>/src"],
  // Исходники импортируют друг друга с расширением .js (verbatimModuleSyntax
  // + moduleResolution "bundler", как везде в проекте) — в отличие от Vite,
  // резолвер Jest не отображает .js на .ts/.tsx сам, снимаем расширение
  // вручную, чтобы Jest сам нашёл настоящий файл по moduleFileExtensions.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
