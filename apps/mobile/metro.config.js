// Разрешение модулей для монорепозиториев в Metro включено по умолчанию
// с SDK 55 — watchFolders/resolver.nodeModulesPath/extraNodeModules/
// disableHierarchicalLookup не задаются (раздел "Фаза 7" задания, пункт 2):
// документация Expo требует их не трогать, а не настраивать вручную.
const { getDefaultConfig } = require("expo/metro-config");
const { resolve: metroResolve } = require("metro-resolver");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

// Весь монорепозиторий пишет относительные импорты с расширением .js,
// указывающим на настоящий .ts/.tsx (moduleResolution "bundler" — так
// понимают Vite и tsc). Резолвер Metro — нет: он ищет буквальный .js и
// падает на первом же файле из общих пакетов (packages/api-client,
// packages/i18n, ...), не только из apps/mobile (найдено этим же
// запуском `expo export`, см. B-261008-metro-no-js-extension-remap).
// Переписывать расширения во всех пакетах монорепозитория — ломает
// Node ESM у apps/server (там расширение обязательно для рантайма);
// переписывать резолвер Metro — один раз, в одном файле.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isRelativeJs = /^\.\.?\//.test(moduleName) && moduleName.endsWith(".js");
  if (isRelativeJs) {
    try {
      return metroResolve(context, moduleName.replace(/\.js$/, ""), platform);
    } catch {
      // Падает в штатный путь ниже — например, если .js — настоящий файл.
    }
  }
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : metroResolve(context, moduleName, platform);
};

// withUniwindConfig — самая внешняя обёртка (раздел "Фаза 7" задания,
// пункт 3): она сама расширяет transformer/resolver, обёртывание в
// обратном порядке ломает подстановку CSS-классов в бандле.
module.exports = withUniwindConfig(config, {
  cssEntryFile: "./src/global.css",
  dtsFile: "./uniwind-env.d.ts",
});
