import tanstackQuery from "@tanstack/eslint-plugin-query";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

import base from "./base.js";

// Прямые обращения к сети вне packages/api-client запрещены (раздел
// "Фаза 2" задания). Пакет сам снимает запрет для своих файлов отдельной
// записью конфига, когда появится в Фазе 5.
const noDirectNetwork = {
  rules: {
    "no-restricted-globals": [
      "error",
      {
        name: "fetch",
        message:
          "Прямые вызовы fetch вне packages/api-client запрещены — используйте фабрику запросов.",
      },
    ],
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "axios",
            message: "Сетевые запросы — только через packages/api-client.",
          },
        ],
      },
    ],
  },
};

// eslint-plugin-jsx-a11y не поставляет собственных типов (нет .d.ts,
// нет поля "types" в package.json) — без явной аннотации
// jsxA11y.flatConfigs.recommended имеет тип any, и typescript-eslint
// ловит это как "unsafe spread" у любого первого потребителя варианта
// react (найдено на packages/ui-web).
/** @type {import("eslint").Linter.Config} */
const jsxA11yRecommended = jsxA11y.flatConfigs.recommended;

// Итоговый массив аннотирован явно: несколько входов выше (react,
// react-hooks, @tanstack/query) ничего не гарантируют по собственным
// типам, и утечка any из любого из них иначе делает весь экспорт any[]
// у потребителя (раздел "Фаза 6" задания, найдено на packages/ui-web).
/** @type {import("eslint").Linter.Config[]} */
const config = tseslint.config(
  ...base,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat["jsx-runtime"],
  jsxA11yRecommended,
  {
    plugins: {
      "react-hooks": reactHooks,
      "@tanstack/query": tanstackQuery,
    },
    // "detect" падает на этой версии eslint-plugin-react/ESLint 10 flat
    // config (context.getFilename недоступен) — версия берётся из
    // каталога текстом, не автоопределением.
    settings: {
      react: { version: "19.3.0" },
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...tanstackQuery.configs.recommended.rules,
    },
  },
  noDirectNetwork,
);

export default config;
