# @boilerplate/eslint-config

Flat-конфиги ESLint 10 для монорепозитория. Подробности, состав правил и
известные расхождения пиров — [docs/packages/eslint-config.md](../../docs/packages/eslint-config.md).

## Подключение

```js
// eslint.config.js
import node from "@boilerplate/eslint-config/node";

export default node;
```

| Точка входа | Для чего                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `./base`    | Общая основа: `typescript-eslint` (strict + stylistic, type-aware), границы импортов                    |
| `./node`    | `base` + глобалы Node.js (серверный код)                                                                |
| `./react`   | `base` + hooks, jsx-a11y, `@tanstack/eslint-plugin-query`, запрет прямой сети вне `packages/api-client` |
| `./native`  | `react` + правила React Native                                                                          |
| `./test`    | `base` + `@vitest/eslint-plugin` на `**/*.test.ts(x)`                                                   |
