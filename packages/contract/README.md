# @boilerplate/contract

Контракт API на oRPC v1 + Zod 4 — источник правды для сервера и обоих
клиентских пакетов. Подробности —
[docs/packages/contract.md](../../docs/packages/contract.md).

## Подключение

```ts
import { contract } from "@boilerplate/contract";

contract.notes.list;
contract.files.createUploadTicket;
```

Типы выводятся из Zod-схем — рукописных дублей нет. Новый домен — новый
файл `*.contract.ts` и запись в `src/index.ts`, существующие домены не
трогаются.
