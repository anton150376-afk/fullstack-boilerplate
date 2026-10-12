> **Зачем читать:** устройство Expo-приложения — маршруты, Uniwind,
> локализация, файлы, веб-экспорт — и грабли SDK 57, которые здесь уже
> наступлены.
> **Кому:** кто пишет интерфейс `apps/mobile`.
> **Последняя проверка:** 2026-10-11.

## Что это

Expo SDK 57, Expo Router, новая архитектура (единственная доступная с
SDK 55). Development build — целевой режим разработки, не Expo Go
(магазинная сборка отстаёт от SDK, документация Expo сама не
рекомендует её для разработки продукта). Маршруты — в `src/app/`, не в
корневом `app/`: так сейчас раскладывает сам `create-expo-app`, Expo
Router определяет `src/app` как корень автоматически, без правки
`app.json`.

Каждый файл в `src/app/` Expo Router считает маршрутом, поэтому тесты
экранов лежат рядом, в `src/` (пример — `src/tasks-screen.test.tsx` для
экрана `src/app/tasks.tsx`, Фаза 12.3), а не в `src/app/`.

## Монорепозиторий: ничего не настраивать руками

С SDK 52 Metro конфигурирует разрешение модулей монорепозитория сам —
`watchFolders`/`resolver.nodeModulesPath`/`resolver.extraNodeModules`/
`resolver.disableHierarchicalLookup` в `metro.config.js` не заданы.
Единственная ручная правка резолвера — не про монорепозиторий, а про
расширения файлов (ниже).

## Файлы типов, которых нет на свежем клоне

`expo-env.d.ts` (типы `process.env.EXPO_PUBLIC_*` через `expo/types`) и
`uniwind-env.d.ts` (типы `className` и темы) Expo и Uniwind создают при
первом запуске Metro. Оба файла в `.gitignore`, поэтому на свежем клоне их
нет, и типизированный ESLint видит `any` вместо типов: `lint` падал с ошибками
`no-unsafe-assignment` в `src/lib/api.ts`, `src/lib/bug-report.ts` и
`src/app/_layout.tsx`.

Задача turbo `generate:types` (`apps/mobile/scripts/generate-types.mjs`)
создаёт оба файла без запуска Metro, а `lint` и `typecheck` зависят от неё.
Руками ничего запускать не нужно: `pnpm gate`, `pnpm lint` и
`pnpm typecheck` сами выполняют шаг при необходимости (около 5 секунд,
результат кешируется). Вручную: `pnpm --filter mobile generate:types`.

`eslint --cache` не учитывает изменения соседних `.d.ts`: если линт падал
из-за отсутствующих файлов типов, удалите `apps/mobile/.eslintcache`.

## Версии под Expo SDK

Версии нативных пакетов должны совпадать с теми, что ждёт установленный
Expo, иначе development build собирается из несовместимых частей.
`npx expo-doctor` в `apps/mobile` проверяет это и должен проходить 21
проверку из 21; расхождения и их причины — в
[architecture/versions.md](../architecture/versions.md). Каталог по умолчанию
не подходит: `pnpm` берёт самые свежие версии, а Expo закрепляет свои.
Новый нативный пакет сначала сверяйте с `expo/bundledNativeModules.json`.

## Uniwind

`metro.config.js` оборачивает конфиг `withUniwindConfig` как САМУЮ
ВНЕШНЮЮ обёртку — она сама расширяет transformer/resolver, обратный
порядок ломает подстановку классов в бандле. `src/global.css`:
`@import "tailwindcss"` → `@import "uniwind"` → `@import
"@boilerplate/tailwind-config/theme.css"` (пакетный импорт, резолвится
через `exports` в `package.json`, как у `apps/web`) → `@source` на
`ui-native`/`ui-core` (путями ОТНОСИТЕЛЬНО этого CSS-файла — `@source`
не резолвит npm-пакеты, как `@import`).

На бесплатной ветке Uniwind нет `hover:`/`group-*` — в общих примитивах
(`ui-core`) они не используются вообще, см.
[ui-native.md](../packages/ui-native.md).

### Типы `className` — генерируются, не коммитятся

`withUniwindConfig({ dtsFile: "./uniwind-env.d.ts" })` создаёт файл при
первом запуске Metro — до этого `pnpm typecheck` не видит `className`
на `View`/`Text`/`Pressable`. В CI/заново клонированном репозитории
генерировать явно, не дожидаясь `expo start`:

```bash
npx uniwind generate-artifacts --css ./src/global.css --dts ./uniwind-env.d.ts
```

`uniwind-env.d.ts` — в `.gitignore`, как `expo-env.d.ts` (ниже) и
`routeTree.gen.ts` у `apps/web`.

### `expo-env.d.ts` — тоже генерируется, и без него `process.env` — `any`

Expo CLI создаёт этот файл сам при первом запуске
(`/// <reference types="expo/types" />`, две строки, редактировать не
нужно). Без него `process.env.EXPO_PUBLIC_API_URL` типизируется в
`any`, а не `string | undefined` — расширение `NodeJS.Process` под
Metro (`expo/types/metro-require.d.ts`) подключается только отсюда.
Если файла нет — создать вручную по тому же двухстрочному шаблону, не
ждать, что `@types/node` сам всё решит (не решает).

## Монорепозиторий: резолвер Metro не понимает `.js`-расширения

Весь монорепозиторий пишет относительные импорты с расширением `.js`,
указывающим на настоящий `.ts`/`.tsx` (`moduleResolution: "bundler"` —
так понимают Vite и `tsc`). Резолвер Metro — нет: ищет буквальный
`.js`-файл и падает при первой же попытке бандлинга, причём не только
на файлах `apps/mobile`, а на любом файле ЛЮБОГО общего пакета в
графе зависимостей (`packages/api-client`, `packages/i18n`, ...).
Переписать расширения во всех пакетах — сломало бы Node ESM у
`apps/server` (там расширение обязательно для рантайма). Решение — в
`metro.config.js`: `resolver.resolveRequest` оборачивает исходный,
для относительных импортов с `.js` сначала пробует резолвить без
расширения через `metro-resolver`'s `resolve()`, при неудаче — откат
на штатное поведение. Подробности и альтернативы, которые не сработали
— `docs/BACKLOG.md`, `B-261008-metro-no-js-extension-remap`.

## Локализация и полифилы — тихая ошибка, если забыть

`@boilerplate/i18n` — тот же пакет, что у `apps/web`/`apps/server`.
Язык определяется `expo-localization` (`getLocales()[0].languageCode`),
сохранённый выбор (`expo-secure-store`) — приоритет перед системной
локалью (`src/lib/language.ts`).

**Hermes на этой версии не содержит `Intl.PluralRules`.** Без полифила
i18next не падает — он молча разрешает только английские формы
множественного числа, то есть русская грамматика становится
неправильной незаметно, без единого сообщения об ошибке. Полифилы
импортируются из точки входа приложения (`index.ts`, не
`expo-router/entry` напрямую — `package.json`'s `"main"` переопределён
на `./index.ts`), **до** `expo-router/entry`:

```ts
import "@formatjs/intl-locale/polyfill-force.js";
import "@formatjs/intl-pluralrules/polyfill-force.js";
import "@formatjs/intl-pluralrules/locale-data/en.js";
import "@formatjs/intl-pluralrules/locale-data/ru.js";
import "expo-router/entry";
```

Точные специфайтеры — `/polyfill-force.js` (с расширением: так объявлен
`"exports"` в `package.json` пакетов `@formatjs/*`, без расширения не
резолвится).

## Данные

Тот же `@boilerplate/api-client`, что у `apps/web`. Токен —
`expo-secure-store` (`src/lib/token-storage.ts`), не AsyncStorage и не
MMKV без шифрования. `EXPO_PUBLIC_API_URL` — единственный способ
Metro вшить переменную окружения в клиентский бандл
(`babel-preset-expo`), аналог `VITE_API_URL` у `apps/web` (тот же
открытый вопрос SSR/браузер здесь не применим — мобильное приложение
всегда «браузер», серверного адреса для внутренней сети нет).

TanStack Query настроен под мобильные условия
(`src/lib/query-client.ts`): `onlineManager` через `expo-network`
(явное чтение начального состояния сети — без этого запрос считается
online до первого события, даже если сеть выключена с самого старта),
`focusManager` через `AppState`, но только на native — на вебе
`react-native-web` сам эмулирует `AppState` через
`document.visibilityState`, подключение здесь поверх него удваивало
бы события, а не добавляло недостающее.

## Файлы

`FileUpload` (`packages/ui-native`) — новый классовый API
`expo-file-system`: `File.pickFileAsync()` (системный пикер,
встроенный в сам `expo-file-system`, отдельный `expo-document-picker`
не нужен) и `file.upload()` (подписанная форма POST, те же поля
`ticket.fields`, что у `apps/web`). Псевдо-Blob из `{uri,type,name}`
не собирается и файлы в base64 не читаются — расход памяти утраивается
и крупные медиафайлы валят приложение. Старый `FileSystem.uploadAsync`
не используется — объявлен устаревшим.

## Сборка и запуск на телефоне (Android, Windows)

Проверено 2026-10-12 на Windows 11 и телефоне с Android 16 (arm64). iOS на Windows не собрать:
нужен Mac с Xcode или облачная сборка EAS.

Нужны JDK 17, Android SDK (платформы 35 и 36, build-tools, NDK 27.1, CMake 3.22; Android Studio не
обязательна), `adb` из `platform-tools`, телефон с включённой «Отладкой по USB». Эмулятору нужна
виртуализация, физический телефон обходится без неё.

```bash
cd apps/mobile
npx expo prebuild --platform android --no-install        # создаёт android/ (в .gitignore)
cd android && ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a   # только arm64: втрое быстрее
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:3000 tcp:3000 && adb reverse tcp:8081 tcp:8081   # телефон видит localhost компьютера
EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start         # Metro; затем открыть приложение на телефоне
```

Debug-сборка берёт JavaScript из Metro, поэтому Metro и API (`pnpm --filter server dev` или собранный
сервер) должны работать, а `adb reverse` — действовать (он сбрасывается при перезапуске `adb`). Первая
сборка Gradle занимает 15–20 минут, JavaScript — ещё 1–2.

Подвохи этого пути (все найдены реальной сборкой):

- **Длина пути на Windows.** CMake раскладывает объектные файлы по зеркалу абсолютного пути исходника, и
  в папке вроде `C:\Users\...\Desktop\<репозиторий>` с раскладкой pnpm
  (`node_modules/.pnpm/<пакет>@<версия>_<хеш>/...`) путь выходит за 250 символов:
  `ninja: error: manifest 'build.ninja' still dirty`. Собирайте из короткого каталога (`C:\bp`) и поставьте
  зависимости плоской раскладкой: `nodeLinker: hoisted` в локальном `pnpm-workspace.yaml` этой копии (в
  репозиторий не коммитится).
- **Metro без слежения за файлами.** `CI=1` отключает watch: правки файлов не доходят до телефона, Metro
  отвечает «Unable to resolve module» на новые файлы. Запускайте `expo start` без `CI`.
- **Экран телефона.** Если он погас, `screencap` отдаёт чёрный кадр, а нажатия уходят на экран блокировки.
  Перед любым `adb shell input` проверяйте, что на переднем плане наше приложение
  (`adb shell dumpsys window | grep mCurrentFocus`), и берите координаты элементов из `uiautomator dump`, а не
  из головы: нажатия «вслепую» попадают в чужие приложения.

Запуск на устройстве нашёл два дефекта, которых не видел Jest: экран приходил пустым (нет
`import "../global.css"` в `src/app/_layout.tsx`, без него Uniwind не применяет `className`) и список
заметок не обновлялся после создания (`src/app/index.tsx` не сбрасывал кеш запроса). Оба исправлены и
закрыты тестами (`src/root-layout.test.ts`, `src/notes-screen.test.tsx`).

## Веб-развёртка

`pnpm --filter mobile build:web` (`expo export -p web`) — статическая
веб-сборка в `dist/`, раздаётся `serve` (не Node-обработчик fetch — тут
нет SSR). Docker — профиль `mobile-web` в `docker-compose.yml`,
отдельный от `web` (`apps/web` — продуктовая веб-поверхность, веб-сборка
мобильного — вторичная, для быстрой выдачи того же интерфейса в
браузере; серверный рендеринг Expo для веба — в альфа-состоянии, в
основу не закладывается).

## Тесты

Jest, не Vitest — единственное сознательное отступление, подробности и
причина — [docs/guides/testing.md](../guides/testing.md).

## Багрепорт

Плавающая кнопка `BugReportTrigger` (`src/components/bug-report-trigger.tsx`)
рендерится в `src/app/_layout.tsx` только при `EXPO_PUBLIC_ENABLE_BUG_REPORTS=true`.
Снимок экрана — автоматический, `captureScreen` из `react-native-view-shot`
(в отличие от веба, где снимок приложен вручную). `git SHA`/версия
сборки у Metro не вычисляются сами (нет аналога `vite.config.ts`'s
`define`) — задаются переменными `EXPO_PUBLIC_GIT_SHA`/`EXPO_PUBLIC_BUILD_VERSION`
вручную в CI, по умолчанию `"unknown"`/`"0.0.0"`. Трейл действий
(навигация/нажатия) на мобильном не собирается автоматически в этой
фазе — у Expo Router нет готовой общей шины событий навигации;
`requestLog`/`logs` остаются главным источником контекста. Подробности
— `docs/guides/bug-reports.md`.

## Частые ошибки

- `eslint-plugin-react-native@5.0.0` (последний релиз) фатально падает
  на 6 из 7 правил под ESLint 10 (`context.getSourceCode`/`getFilename`
  удалены) — набор сужен до одного рабочего (`no-raw-text`) в
  `packages/eslint-config/native.js`.
- `metro.config.js` и `jest.config.js` исключены из типизированного
  линтера (`eslint.config.js`'s `ignores`) — `require()` без типов
  неизбежно даёт «unsafe»-находки, тот же класс проблемы, что у
  `apps/web/server-entry.mjs`.
- Полный список со статусом закрытия — `docs/BACKLOG.md`, записи с
  пометкой «Фаза 7».

## Ссылки

- [README.md приложения](../../apps/mobile/README.md)
- [ui-native.md](../packages/ui-native.md)
- [ui.md](../packages/ui.md) — таблица паритета с `ui-web`.
- [testing.md](../guides/testing.md)
- [web.md](web.md) — продуктовая веб-поверхность (сравнение ролей).
- `docs/BACKLOG.md` — находки Фазы 7.
