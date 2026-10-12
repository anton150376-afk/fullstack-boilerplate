# @boilerplate/admin-kit

Переносимый конструктор административных экранов — таблица, форма,
макет, права, служебные страницы и журнал действий из одной Zod-схемы.
Подробности — [docs/packages/admin-kit.md](../../docs/packages/admin-kit.md).

```tsx
import { DataTable, defineResource, ResourceForm } from "@boilerplate/admin-kit";

const noteResource = defineResource({
  name: "note",
  label: "Заметки",
  columns: [{ accessorKey: "title", header: "Заголовок" }],
  createSchema: createNoteInputSchema, // из @boilerplate/contract
});
```

Не знает про `@boilerplate/contract`/`api-client` напрямую — вызовы
передаёт вызывающий код (`apps/web`).
