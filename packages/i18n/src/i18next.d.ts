import "i18next";

import type { resources } from "./resources.js";

// Типы ключей перевода выводятся из каталога en — он выступает эталоном
// структуры (русский каталог может содержать дополнительные формы числа,
// но не другие ключи — это проверяет scripts/check-i18n.ts).
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: (typeof resources)["en"];
  }
}
