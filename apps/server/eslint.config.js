import node from "@boilerplate/eslint-config/node";
import test from "@boilerplate/eslint-config/test";

export default [
  // Код, сгенерированный Prisma (prisma generate) — не наш исходник.
  { ignores: ["src/generated/**"] },
  ...node,
  ...test,
  {
    rules: {
      // Параметры-свойства конструктора — основной способ внедрения
      // зависимостей в Nest; strict-правило typescript-eslint о
      // предпочтении обычных свойств здесь контрпродуктивно.
      "@typescript-eslint/parameter-properties": "off",
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },
];
