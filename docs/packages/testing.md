> **Зачем читать:** какой пресет подключить, как подменить сеть, где взять тестовые данные.
> **Кому:** кто пишет тесты для пакета или приложения (кроме `apps/mobile`).
> **Последняя проверка:** 2026-10-08.

## Что это

Общая тестовая инфраструктура для Vitest: пресеты окружения, фабрики данных,
подмена сети через MSW, матчеры DOM. Исходники — `packages/testing/src/`.

## Состав

| Экспорт          | Для чего                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| `./presets/node` | `environment: "node"` — пакеты, серверный код                                                              |
| `./presets/dom`  | `environment: "jsdom"` + матчеры `@testing-library/jest-dom`                                               |
| `./setup/dom`    | Файл регистрации матчеров (используется `./presets/dom`, можно подключить отдельно)                        |
| `./factories`    | `defineFactory()` — фабрика тестовых данных с автонумерацией и overrides                                   |
| `./mocks`        | `createMockServer()` — обёртка над MSW `setupServer` с жизненным циклом `beforeAll`/`afterEach`/`afterAll` |

## Почему jsdom, а не happy-dom

Решение агента (ADR-0001, раздел "Четыре решения, оставленные агенту"):
`@testing-library/react` и всплывающие слои Base UI (фокус, порталы)
опираются на поведение DOM, которое `jsdom` реализует полнее, чем `happy-dom`.
Для тестов, где важны настоящие фокус и позиционирование слоёв, задание
отдельно требует браузерный режим Vitest с провайдером Playwright — пресет
`dom` его не заменяет, а закрывает обычные компонентные тесты.

## Пресет `dom`: что нужно потребителю

`@boilerplate/testing` не тянет `jsdom` в зависимости потребителя —
Vitest резолвит окружение по имени из `node_modules` вызывающего пакета
(та же причина, по которой `prettier-plugin-tailwindcss` дублируется в
каждом приложении). Добавить `jsdom` в `devDependencies` потребителя —
обязательный шаг, не деталь реализации.

## `createMockServer`: реальный жизненный цикл

```ts
import { createMockServer, http, HttpResponse } from "@boilerplate/testing/mocks";

const server = createMockServer([
  http.get("https://api.example.com/ping", () => HttpResponse.json({ ok: true })),
]);

it("добавляет временный обработчик", () => {
  server.use(http.get("https://api.example.com/temp", () => HttpResponse.text("ok")));
  // ...
});
// обработчик из server.use не переживает следующий тест — resetHandlers в afterEach
```

`onUnhandledFrame: "error"` — необработанный запрос роняет тест, а не уходит
в реальную сеть. **Важно про версию:** в msw 3.x опция называется
`onUnhandledFrame`, а не `onUnhandledRequest` из более старых версий —
переименована и расширена на WebSocket-соединения. Проверено `tsc`, не по
памяти.

## `defineFactory`: тестовые данные без привязки к доменным моделям

```ts
import { defineFactory } from "@boilerplate/testing/factories";

const userFactory = defineFactory((n) => ({ id: `user-${n}`, email: `user-${n}@example.com` }));

userFactory.build({ email: "custom@example.com" });
userFactory.buildList(3);
```

Фабрик для конкретных доменных моделей здесь нет — они появятся рядом с
`packages/contract` (Фаза 5), поверх этого же `defineFactory`.

## Почему React Native не здесь

`apps/mobile` тестируется Jest с пресетом `jest-expo` — единственный путь,
который документирует Expo (решение D7 задания). Настройка Jest живёт в
самом `apps/mobile`, не в этом пакете.

## Частые ошибки

- Забыть добавить `jsdom` в `devDependencies` потребителя пресета `dom`.
- Полагаться на `server.use` между тестами — обработчик сбрасывается
  `afterEach` намеренно, чтобы тесты не зависели от порядка выполнения.

## Ссылки

- [README.md пакета](../../packages/testing/README.md)
