/** @type {import("prettier").Config} */
export const base = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  proseWrap: "preserve",
  plugins: ["@ianvs/prettier-plugin-sort-imports"],
  importOrder: [
    "<BUILTIN_MODULES>",
    "",
    "<THIRD_PARTY_MODULES>",
    "",
    "^@boilerplate/(.*)$",
    "",
    "^[./]",
  ],
  importOrderTypeScriptVersion: "6.0.3",
  // По умолчанию плагин понимает только ["typescript", "jsx"] — на файле с
  // декоратором (@Injectable(), @Controller() — весь apps/server на Nest)
  // разбор молча прерывается, и сортировка импортов в этом файле просто не
  // применяется, без явной ошибки гейта. decorators-legacy — тот же синтаксис
  // декораторов, что official-пример плагина для Angular, и тот же, что даёт
  // experimentalDecorators в TypeScript.
  importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
};

export default base;
