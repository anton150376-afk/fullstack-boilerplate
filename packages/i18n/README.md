# @boilerplate/i18n

Локализация для веба, мобильного и сервера из одного места. Подробности —
[docs/packages/i18n.md](../../docs/packages/i18n.md), пошаговая инструкция —
[docs/guides/i18n.md](../../docs/guides/i18n.md).

## Подключение

```ts
import { createI18n, formatDate } from "@boilerplate/i18n";

const i18n = createI18n({ language: "ru" });
i18n.t("files:count", { count: 2 }); // "2 файла"
```

Полифилы `Intl.PluralRules`/`Intl.Locale` сюда не входят — их подключает
точка входа `apps/mobile` (Hermes их не реализует).
