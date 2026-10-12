# @boilerplate/prettier-config

Общие настройки Prettier и сортировка импортов. Подробности —
[docs/packages/prettier-config.md](../../docs/packages/prettier-config.md).

## Подключение

```js
// prettier.config.mjs
import base from "@boilerplate/prettier-config";

export default base;
```

Плагин `prettier-plugin-tailwindcss` сюда не входит — он подключается
отдельно в каждом приложении со своим CSS-входом (`apps/web`, `apps/mobile`),
потому что один общий конфиг два входа описать не может.
