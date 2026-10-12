import { describe, expect, it } from "vitest";

import { createNoteInputSchema, notesContract, updateNoteInputSchema } from "./notes.contract.js";

describe("notesContract — маршруты", () => {
  it("у каждой процедуры есть явный path и method (без них @Implement в apps/server бросает ошибку)", () => {
    for (const [name, procedure] of Object.entries(notesContract)) {
      const route = procedure["~orpc"].route;

      expect(route.method, `${name}.method`).toBeDefined();
      expect(route.path, `${name}.path`).toBeDefined();
    }
  });

  it("get/update/remove используют {id} в пути — compact input-structure сливает путь со входом", () => {
    expect(notesContract.get["~orpc"].route.path).toBe("/notes/{id}");
    expect(notesContract.update["~orpc"].route.path).toBe("/notes/{id}");
    expect(notesContract.remove["~orpc"].route.path).toBe("/notes/{id}");
  });

  it("remove отвечает 204 без тела", () => {
    expect(notesContract.remove["~orpc"].route.successStatus).toBe(204);
  });
});

describe("createNoteInputSchema / updateNoteInputSchema — валидация", () => {
  it("принимает валидный вход", () => {
    const result = createNoteInputSchema.safeParse({ title: "Заметка", body: "Текст" });

    expect(result.success).toBe(true);
  });

  it("отклоняет пустой title", () => {
    const result = createNoteInputSchema.safeParse({ title: "", body: "Текст" });

    expect(result.success).toBe(false);
  });

  it("widget из .meta() виден конструктору админки (Фаза 8)", () => {
    expect(createNoteInputSchema.shape.body.meta()).toMatchObject({ widget: "textarea" });
  });

  it("update допускает частичный вход (оба поля опциональны)", () => {
    const result = updateNoteInputSchema.safeParse({});

    expect(result.success).toBe(true);
  });
});
