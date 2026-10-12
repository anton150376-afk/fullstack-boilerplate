# @boilerplate/api-client

Транспорт и утилиты TanStack Query поверх `@boilerplate/contract`.
Подробности — [docs/packages/api-client.md](../../docs/packages/api-client.md).

## Подключение

```ts
import { createApiClient, createTanstackQueryUtils } from "@boilerplate/api-client";

const { client, requestLog } = createApiClient({
  baseUrl: "https://api.example.com",
  tokenStorage, // платформенное: expo-secure-store, что-то другое в вебе
  onUnauthorized: () => signOut(),
});

const notes = await client.notes.list();

const api = createTanstackQueryUtils(client);
useSuspenseQuery(api.notes.list.queryOptions());
```

Своего слоя над `createTanstackQueryUtils` нет — пакет отдаёт готовый
клиент и платформенно-независимую фабрику поверх него, остальное делает
`@orpc/tanstack-query`.
