import { oc } from "@orpc/contract";
import { z } from "zod";

// Фаза 12.3 задания — сквозная проверка шаблона: отдельная сущность,
// не "Заметки" (та уже снята scripts/init-project.ts), проведённая через
// контракт → сервер → миграция → веб → мобильное → админку → два языка.
// Зеркало модели Prisma (apps/server/prisma/schema/task.prisma).
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Task = z.infer<typeof taskSchema>;

export const createTaskInputSchema = z.object({
  title: z.string().min(1).max(200).meta({ widget: "text" }),
});
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

const idInput = z.object({ id: z.string() });

export const taskNotFoundError = {
  NOT_FOUND: {
    status: 404,
    message: "Задача не найдена",
    data: z.object({ id: z.string() }),
  },
};

export const tasksContract = oc.tag("tasks").router({
  list: oc
    .route({ method: "GET", path: "/tasks", summary: "Список задач" })
    .output(z.array(taskSchema)),

  create: oc
    .route({ method: "POST", path: "/tasks", summary: "Создать задачу" })
    .input(createTaskInputSchema)
    .output(taskSchema),

  // Переключатель, не общий update — у задачи кроме названия изменяется
  // только отметка "сделано", отдельного экрана редактирования нет ни в
  // вебе, ни в мобильном.
  toggle: oc
    .route({ method: "PATCH", path: "/tasks/{id}/toggle", summary: "Переключить «сделано»" })
    .input(idInput)
    .output(taskSchema)
    .errors(taskNotFoundError),

  remove: oc
    .route({
      method: "DELETE",
      path: "/tasks/{id}",
      summary: "Удалить задачу",
      successStatus: 204,
    })
    .input(idInput)
    .output(z.void())
    .errors(taskNotFoundError),
});
