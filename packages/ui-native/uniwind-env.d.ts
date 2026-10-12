// Копия apps/mobile/uniwind-env.d.ts (CLI "uniwind generate-artifacts" не
// запускался здесь отдельно — у пакета своего CSS-входа нет, темы те же,
// что у приложения, которое его потребляет). Только для типов className
// на компонентах RN при tsc — сборку делает apps/mobile/metro.config.js.
/// <reference types="uniwind/types" />

declare module "uniwind" {
  export interface UniwindConfig {
    themes: readonly ["light", "dark"];
  }
}

export {};
