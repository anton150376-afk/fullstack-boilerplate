import reactNative from "eslint-plugin-react-native";

import react from "./react.js";

export default [
  ...react,
  {
    plugins: {
      "react-native": reactNative,
    },
    languageOptions: {
      globals: reactNative.environments?.["react-native"]?.globals ?? {},
    },
    rules: {
      // Не весь reactNative.configs.all.rules: 6 из 7 правил плагина
      // зовут context.getSourceCode()/context.getFilename() — оба
      // удалены в ESLint 10 flat config, падение "is not a function" на
      // любом файле, не предупреждение (найдено реальным прогоном
      // `pnpm --filter mobile lint`, не по памяти). Рабочим остался
      // только no-raw-text, он и включён явно.
      // Отключённые (no-color-literals, no-inline-styles,
      // no-single-element-style-arrays, no-unused-styles, sort-styles,
      // split-platform-components) — пять из шести про
      // StyleSheet.create()/style={{}}, которых в проекте нет вообще
      // (стили — Uniwind className), потери сигнала здесь нет
      // (B-261008-rn-lint-components-crash).
      // Button (packages/ui-native) сам оборачивает children в <Text> —
      // правило не видит внутрь чужих компонентов, skip добавляет имя
      // явно, а не притворяется, что проблемы не было.
      "react-native/no-raw-text": ["error", { skip: ["Button"] }],
    },
  },
];
