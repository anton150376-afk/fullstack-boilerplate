import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

// Запрет импорта внутренностей другого пакета мимо его публичной точки
// входа (package.json#exports). Запрет приложения импортировать другое
// приложение ловит не линтер, а `turbo boundaries` — он видит граф
// зависимостей рабочей области, а не строки импорта.
const boundaries = {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@boilerplate/*/src", "@boilerplate/*/src/*"],
            message:
              "Импортируйте пакет через публичную точку входа (exports в package.json), а не из src/ напрямую.",
          },
        ],
      },
    ],
  },
};

// Сборки и сгенерированный код — не вручную написанный исходник, и у них
// нет своего места в tsconfig.json; линтинг на них либо бесполезен, либо
// падает на projectService (найдено на реальной сборке apps/server —
// eslint дошёл до dist/ и не смог разобрать скомпилированный JS).
const commonIgnores = {
  ignores: ["**/dist/**", "**/build/**", "**/.next/**", "**/.output/**", "**/.turbo/**"],
};

export default tseslint.config(
  commonIgnores,
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // eslint.config.js и подобные JS-конфиги обычно не входят в
          // tsconfig.json пакета — им достаточно синтаксического разбора
          // без типов. *.config.ts (например, vitest.config.ts) — другое
          // дело: его включает в свой tsconfig.json каждый пакет сам, как
          // обычный исходник, иначе получится конфликт "найден и там, и там".
          allowDefaultProject: ["*.config.js", "*.config.mjs"],
        },
      },
    },
  },
  eslintConfigPrettier,
  boundaries,
  {
    rules: {
      // Числа и булевы значения в шаблонных строках читаемы и безопасны —
      // проект логирует счётчики (`${rows.length} пунктов`) повсеместно.
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true },
      ],
      // Ведущее подчёркивание — принятая в проекте пометка "сознательно
      // не используется" (например, при деструктуризации, когда нужно
      // исключить одно поле из объекта).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
