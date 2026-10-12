# @boilerplate/ui-native

Компоненты на Uniwind (React Native), варианты — из `@boilerplate/ui-core`,
те же имена и пропсы, что в `@boilerplate/ui-web`. Подробности —
[docs/packages/ui-native.md](../../docs/packages/ui-native.md).

```tsx
import { Button } from "@boilerplate/ui-native";

<Button variant="secondary" size="sm" onPress={handlePress}>
  Сохранить
</Button>;
```

Тесты — Jest (`jest-expo`), не Vitest: см.
[docs/guides/testing.md](../../docs/guides/testing.md).
