import { oc } from "@orpc/contract";
import { z } from "zod";

// Зеркало модели Prisma (apps/server/prisma/schema/note.prisma) — контракт
// описывает форму ответа, а не схему БД, но для показательной сущности
// Фазы 4 они совпадают буквально.
export const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Note = z.infer<typeof noteSchema>;

// .meta({ widget }) — подсказка для конструктора админки (Фаза 8, раздел
// "Фаза 5" задания, пункт 1): само поле ввода в форме уже понятно по типу
// Zod, но ширина текстовой области — нет.
export const createNoteInputSchema = z.object({
  title: z.string().min(1).max(200).meta({ widget: "text" }),
  body: z.string().min(1).meta({ widget: "textarea" }),
});
export type CreateNoteInput = z.infer<typeof createNoteInputSchema>;

export const updateNoteInputSchema = createNoteInputSchema.partial();
export type UpdateNoteInput = z.infer<typeof updateNoteInputSchema>;

// Compact input-structure (по умолчанию, раздел "Фаза 5" задания, пункт
// 5.1): поле id из {id} пути слито в один входной объект с полем out
// query/body — отдельно params/query/body (detailed) здесь не нужны,
// формы простые.
const idInput = z.object({ id: z.string() });

export const notFoundError = {
  NOT_FOUND: {
    status: 404,
    message: "Заметка не найдена",
    data: z.object({ id: z.string() }),
  },
};

export const notesContract = oc.tag("notes").router({
  list: oc
    .route({ method: "GET", path: "/notes", summary: "Список заметок" })
    .output(z.array(noteSchema)),

  get: oc
    .route({ method: "GET", path: "/notes/{id}", summary: "Одна заметка" })
    .input(idInput)
    .output(noteSchema)
    .errors(notFoundError),

  create: oc
    .route({ method: "POST", path: "/notes", summary: "Создать заметку" })
    .input(createNoteInputSchema)
    .output(noteSchema),

  update: oc
    .route({ method: "PATCH", path: "/notes/{id}", summary: "Изменить заметку" })
    .input(idInput.extend(updateNoteInputSchema.shape))
    .output(noteSchema)
    .errors(notFoundError),

  remove: oc
    .route({
      method: "DELETE",
      path: "/notes/{id}",
      summary: "Удалить заметку",
      successStatus: 204,
    })
    .input(idInput)
    .output(z.void())
    .errors(notFoundError),
});
