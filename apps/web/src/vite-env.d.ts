/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Вычисляется vite.config.ts через git rev-parse, не читается из .env. */
  readonly VITE_GIT_SHA: string;
  /** Вычисляется vite.config.ts из npm_package_version, не читается из .env. */
  readonly VITE_BUILD_VERSION: string;
  readonly VITE_ENABLE_BUG_REPORTS: string;
}
