> **Зачем читать:** как сервер и будущие веб/мобильное приложения вызывают
> API через один транспорт.
> **Кому:** кто пишет запросы к API в любом из приложений.
> **Последняя проверка:** 2026-10-08.

## Что это

`createApiClient()` даёт типизированный клиент `@boilerplate/contract` —
`client.notes.list()`, `client.files.createUploadTicket(...)` и так далее —
и обёртку `createTanstackQueryUtils` из `@orpc/tanstack-query` (реэкспорт,
без собственного слоя поверх — раздел "Фаза 5" задания, пункт 5.3: «своего
слоя поверх не писать»). Платформенные различия (хранилище токена,
`fetch`) передаются снаружи при вызове `createApiClient`, поэтому пакет
одинаково работает в `apps/web` (Фаза 6) и `apps/mobile` (Фаза 7).

Сервер отвечает по OpenAPI-маршрутам контракта (`POST /notes`,
`GET /notes/{id}`, …), поэтому транспорт — `OpenAPILink` из
`@orpc/openapi-client/fetch`, не `RPCLink`: `RPCLink` ожидает единую
RPC-точку, а наш сервер (`apps/server/src/*.controller.ts`,
`@Implement`) сериализует ответы тем же `StandardOpenAPICodec`, что и
генератор `/openapi.json`.

## Пример: от схемы до вызова в интерфейсе

1. Схема и маршрут — `packages/contract/src/notes.contract.ts`:
   ```ts
   get: oc
     .route({ method: "GET", path: "/notes/{id}" })
     .input(z.object({ id: z.string() }))
     .output(noteSchema)
     .errors({ NOT_FOUND: { status: 404, data: z.object({ id: z.string() }) } }),
   ```
2. Реализация — `apps/server/src/notes/notes.controller.ts`,
   `implement(contract.notes.get).handler(...)` (docs/packages/contract.md).
3. Вызов из интерфейса (веб или мобильное, когда они появятся в Фазах 6–7):
   ```ts
   import { createApiClient, createTanstackQueryUtils } from "@boilerplate/api-client";

   const { client } = createApiClient({ baseUrl: API_URL, tokenStorage });
   const api = createTanstackQueryUtils(client);

   const { data: note } = useSuspenseQuery(api.notes.get.queryOptions({ input: { id } }));
   ```
   Тип `note` выводится из `noteSchema` без ручных приведений; опечатка в
   поле или пропущенный `id` — ошибка `tsc`, а не обнаруженный в проде баг.

## Устройство транспорта (`src/transport.ts`)

- **`adapterInterceptors`** (один интерсептор на весь жизненный цикл
  запроса/ответа) — добавляет `Authorization: Bearer <token>` из
  `TokenStorage` перед отправкой, вызывает `onUnauthorized()` при 401
  после ответа, пишет запись в кольцевой буфер при включённом флаге.
  Это тот же механизм `Interceptor<TOptions, TResult>` из `@orpc/shared`,
  которым устроены серверные `onError`/`onStart` у `@orpc/nest`.
- **`fetch`-опция `OpenAPILink`** — отдельно от интерсептора, отвечает
  только за сетевую устойчивость: таймаут через `AbortController` и
  повтор при 5xx/сетевой ошибке (`retries`, по умолчанию 0).
  `request.clone()` обязателен при повторе — тело `Request` читается
  один раз.
- **Ошибки приходят типизированными**: ответ сервера с кодом из
  `contract.errors()` декодируется в `ORPCError` с тем же `code`/`data` —
  проверено `transport.test.ts` на коде `NOT_FOUND`. Ответ без
  определённого кода (как 401 у `notes.list`, не объявляющего `.errors()`)
  всё равно отбраковывается (`rejects`), просто не как типизированная
  контрактная ошибка.

## Хранилище токена

`TokenStorage` — два метода, `getToken`/`setToken`, оба могут быть
асинхронными. `createInMemoryTokenStorage()` — только для тестов и до
появления модуля аутентификации (M1, ROADMAP). Настоящие реализации
(`expo-secure-store` на мобильном, другое в вебе) появляются в Фазах 6–7
и передаются в `createApiClient` снаружи — пакет не решает, где хранить
токен, только как его использовать.

## Кольцевой буфер запросов (задел под Фазу 9)

`enableRequestLog` — `false` по умолчанию во всех окружениях, в том
числе в проде (раздел "Фаза 5" задания, пункт 5.3). Запись содержит
**только** `method`, `path`, `status`, `durationMs`, `requestId` —
заголовки и тела запроса в структуру не входят вовсе, поэтому
`Authorization` и пароль физически не могут туда попасть: это надёжнее,
чем маскирование уже записанного значения. `packages/devtools` (Фаза 9)
читает `requestLog.entries()` для полного контекста багрепорта.

## `fetchHealthReady` (Фаза 8)

Единственная функция пакета, не завязанная на `contract` — `/health/ready`
обычный REST, не oRPC (см. `docs/packages/contract.md`). Прямые `fetch()`
вне `packages/api-client` запрещены линтером `react.js`
(`no-restricted-globals`) — `apps/web/src/routes/admin/system.tsx`
(Фаза 8) берёт её отсюда, а не делает свой запрос.

## Частые ошибки

- Писать собственный слой поверх `createTanstackQueryUtils` — он уже даёт
  `queryKey`/`queryOptions`/`mutationOptions`/`infiniteOptions`, свой
  код здесь — лишняя поверхность для расхождения с контрактом.
- `queryClient.fetchQuery`/`prefetchQuery`/`ensureQueryData` — устаревшие
  (грабля 9 задания), замена — `queryClient.query(opts)`;
  `ensureQueryData` воспроизводится как
  `queryClient.query({ ...opts, staleTime: "static" })`. Поймано линтером
  (`@typescript-eslint/no-deprecated`) при написании `transport.test.ts`.
- Инвалидировать кеш руками собранным ключом вместо
  `api.<domain>.<procedure>.queryKey(...)` — ключи от `createTanstackQueryUtils`
  гарантированно совпадают с тем, что использует `queryOptions`; ключ,
  собранный вручную, может разойтись при любой правке контракта.

## Ссылки

- [README.md пакета](../../packages/api-client/README.md)
- [contract.md](contract.md) — контракт, который этот пакет вызывает.
- `docs/architecture/decisions/ADR-0001-stack.md` — D5 (фабрика запросов).
