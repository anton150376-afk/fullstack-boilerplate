> **Зачем читать:** как компоненты React Native получают className через
> Uniwind и почему некоторые классы/правила линта из `ui-web` сюда не
> переносятся.
> **Кому:** кто пишет интерфейс `apps/mobile`.
> **Последняя проверка:** 2026-10-08.

## Что это

Компоненты на [Uniwind](https://docs.uniwind.dev/) (Tailwind-бинды для
React Native) — те же варианты из `packages/ui-core`, те же имена и
пропсы, что в `packages/ui-web`. Стилизация остаётся за собственными
примитивами (`Pressable`, `Text`, `View`) — единственная связь с
Uniwind — строки классов, переход на другую RN-реализацию Tailwind не
затронет прикладной код.

Пакет не собирает CSS сам — трансформацию className делает Metro через
`apps/mobile/metro.config.js` (`withUniwindConfig`). `uniwind` здесь —
`devDependency` только для типов (`uniwind-env.d.ts` — копия
сгенерированного в `apps/mobile`, см. ниже), в рантайме пакет его не
импортирует.

## Состав

- `Button` (`src/components/button.tsx`) — `Pressable` + `Text`,
  `buttonVariants` на контейнере, `buttonTextVariants` на тексте.
- `FileUpload` (`src/components/file-upload.tsx`) — классовый API
  `expo-file-system` (`File.pickFileAsync`, `file.upload`), не старый
  `FileSystem.uploadAsync` (устарел) и не псевдо-Blob из
  `{uri,type,name}` (утраивает память на крупных файлах).

## Почему `buttonVariants` не даёт точь-в-точь то же, что в ui-web

`packages/ui-core/src/button-variants.ts` отдаёт только утилиты,
понятные Uniwind на native: `hover:`, `transition-colors`,
`whitespace-nowrap`, `outline-none`, селектор `[&_svg]` — веб-only
понятия Tailwind (на бесплатной ветке Uniwind нет `hover:`/`group-*`,
а `[&_svg]` — не часть куррируемого набора утилит RN-компилятора
вообще). `ui-web/button.tsx` накладывает их отдельным `cva` поверх
общего — см. `docs/BACKLOG.md`,
`B-261008-button-variants-web-only-modifiers`.

На native также нет каскада CSS: цвет текста `<Text>` не наследуется от
родительского `<Pressable>` — поэтому у `buttonTextVariants` есть
отдельный экспорт в `ui-core`, которого `ui-web` не использует (там
цвет наследуется сам).

## Типы: className и Jest

Два отдельных источника аугментации типов, оба нужны явно:

- `className` на `View`/`Text`/`Pressable` — из `uniwind/types`,
  подключается через локальный `uniwind-env.d.ts` (копия того, что
  `apps/mobile` генерирует командой `npx uniwind generate-artifacts`).
- Глобалы Jest (`describe`, `it`, `expect`, `jest`) — автоподключение
  `@types/*` не сработало без явного `"types": ["jest"]` в
  `tsconfig.json`; без этого `jest-expo`'s собственная аугментация
  типов (`declare namespace jest {...}`, только интерфейсы) видна без
  основной `declare var jest: Jest` из `@types/jest`, и TypeScript
  даёт "Cannot use namespace 'jest' as a value".

## Тесты

Jest (`jest-expo` + `@testing-library/react-native`), не Vitest — см.
[docs/guides/testing.md](../guides/testing.md) про границу и причину.
`render`/`fireEvent` в версии 14 асинхронные — без `await render(...)`
`screen.getByRole(...)` в следующей строке падает с «render function
has not been called» (найдено этим же тестом, не по памяти).

## Частые ошибки

- Относительные импорты с расширением `.js` (конвенция всего
  монорепозитория) не резолвятся Metro — чинится в
  `apps/mobile/metro.config.js`, не здесь: пакет не задаёт свой Metro.
- `eslint-plugin-react-native@5.0.0` фатально падает на 6 из 7 правил
  под ESLint 10 (`context.getSourceCode`/`getFilename` удалены) — набор
  правил сужен до одного рабочего (`no-raw-text`) в
  `packages/eslint-config/native.js`.

## Ссылки

- [README.md пакета](../../packages/ui-native/README.md)
- [ui-core.md](ui-core.md) — где живут варианты.
- [ui.md](ui.md) — таблица паритета с `ui-web`.
- [apps/mobile.md](../apps/mobile.md)
- `docs/BACKLOG.md` — находки Фазы 7 по Metro/Uniwind/ESLint.
