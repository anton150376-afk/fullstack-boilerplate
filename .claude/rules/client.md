---
paths:
  - "packages/api-client/**"
  - "apps/web/**"
  - "apps/mobile/**"
---

# Клиент API

- Обращения к серверу — только через `packages/api-client`. Прямой
  `fetch`/`axios` в компоненте запрещён и ловится линтером
  (`packages/eslint-config/react.js`).
- Ключи кеша TanStack Query порождаются `createTanstackQueryUtils` из
  описания маршрута контракта — не собирать руками (`["users", id]` и
  подобное).
- Мутация обязана объявлять, какие ключи инвалидировать; инвалидация
  выполняется централизованно в `api-client`, не в каждом вызывающем коде.
- Устаревшие императивные методы TanStack Query (`ensureQueryData`,
  `fetchQuery`, `prefetchQuery`, `routerWithQueryClient`) не появляются в
  новом коде — замена: `queryClient.query(opts)`.
- Хранилище токена — платформенное (не хардкодить `localStorage` в общем
  коде): веб и мобильное передают его в конфигурацию клиента снаружи.
- Подробнее — `docs/packages/api-client.md` (появится в Фазе 5).
