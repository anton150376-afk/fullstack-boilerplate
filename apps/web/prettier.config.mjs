import base from "@boilerplate/prettier-config";

// Свой конфиг на апку (грабля 19 задания): плагину Tailwind нужен
// tailwindStylesheet, а один корневой конфиг не описал бы два CSS-входа
// (apps/web и apps/mobile).
/** @type {import("prettier").Config} */
export default {
  ...base,
  plugins: [...base.plugins, "prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/styles/app.css",
};
