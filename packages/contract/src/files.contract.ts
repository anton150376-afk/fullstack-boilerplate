import { oc } from "@orpc/contract";
import { z } from "zod";

// Зеркало apps/server/src/files/dto/file.schemas.ts и
// FilesService.UploadTicketResponse — контракт описывает форму ответа,
// байты самого файла через API не проходят (раздел "Фаза 4" задания,
// пункт 8; D16 ADR-0001).
export const createUploadTicketInputSchema = z.object({
  contentType: z.string().min(1),
  filename: z.string().min(1).max(255),
});
export type CreateUploadTicketInput = z.infer<typeof createUploadTicketInputSchema>;

export const uploadTicketSchema = z.object({
  fileId: z.string(),
  url: z.string(),
  fields: z.record(z.string(), z.string()),
  expiresAt: z.coerce.date(),
});
export type UploadTicket = z.infer<typeof uploadTicketSchema>;

export const confirmUploadInputSchema = z.object({ id: z.string() });

export const confirmedFileSchema = z.object({
  id: z.string(),
  size: z.number().int().nonnegative(),
  contentType: z.string(),
});
export type ConfirmedFile = z.infer<typeof confirmedFileSchema>;

const confirmErrors = {
  NOT_FOUND: {
    status: 404,
    message: "Запись о файле не найдена",
    data: z.object({ id: z.string() }),
  },
  // Перепроверка размера, типа и факта загрузки (FilesService.confirm) —
  // один код ошибки на все три случая отказа: клиенту важен факт отказа
  // и сообщение, а не разбор по подпричине.
  BAD_REQUEST: {
    status: 400,
    message: "Файл отклонён при подтверждении",
  },
};

export const filesContract = oc.tag("files").router({
  createUploadTicket: oc
    .route({
      method: "POST",
      path: "/files/upload-ticket",
      summary: "Выдать талон на загрузку файла",
    })
    .input(createUploadTicketInputSchema)
    .output(uploadTicketSchema),

  confirm: oc
    .route({
      method: "POST",
      path: "/files/{id}/confirm",
      summary: "Подтвердить загрузку и перепроверить файл",
    })
    .input(confirmUploadInputSchema)
    .output(confirmedFileSchema)
    .errors(confirmErrors),
});
