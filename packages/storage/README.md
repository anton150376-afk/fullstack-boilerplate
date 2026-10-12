# @boilerplate/storage

Адаптер S3-совместимого хранилища на четыре метода. Подробности —
[docs/packages/storage.md](../../docs/packages/storage.md).

## Подключение

```ts
import { createS3StorageAdapter } from "@boilerplate/storage";

const storage = createS3StorageAdapter({
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION!,
  bucket: process.env.S3_BUCKET!,
  accessKeyId: process.env.S3_ACCESS_KEY_ID!,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
});

const ticket = await storage.createUploadTicket({
  key: "uploads/report.pdf",
  contentType: "application/pdf",
  maxBytes: 10 * 1024 * 1024,
});
```

Только подписанные формы POST — подписанный PUT не ограничивает размер
загрузки (грабля 30 задания).
