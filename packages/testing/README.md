# @boilerplate/testing

Пресеты Vitest, фабрики тестовых данных, утилиты подмены сети. Подробности —
[docs/packages/testing.md](../../docs/packages/testing.md).

## Подключение

```ts
// vitest.config.ts пакета
import { defineProject } from "vitest/config";

import { nodePreset } from "@boilerplate/testing/presets/node";

export default defineProject({ test: { ...nodePreset, name: "my-package" } });
```

Для DOM-тестов — `@boilerplate/testing/presets/dom` (jsdom + матчеры
`@testing-library/jest-dom`). Потребителю нужен собственный devDependency на
`jsdom` — Vitest резолвит окружение по имени из `node_modules` потребителя.

Пресетов для React Native здесь нет: `apps/mobile` тестируется Jest и держит
свою настройку у себя (решение D7 задания).
