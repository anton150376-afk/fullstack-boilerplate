import { describe, expect, it } from "vitest";

import { createTaskInputSchema, tasksContract } from "./tasks.contract.js";

describe("tasksContract — маршруты", () => {
  it("у каждой процедуры есть явный path и method (без них @Implement в apps/server бросает ошибку)", () => {
    for (const [name, procedure] of Object.entries(tasksContract)) {
      const route = procedure["~orpc"].route;

      expect(route.method, `${name}.method`).toBeDefined();
      expect(route.path, `${name}.path`).toBeDefined();
    }
  });

  it("toggle/remove используют {id} в пути — compact input-structure сливает путь со входом", () => {
    expect(tasksContract.toggle["~orpc"].route.path).toBe("/tasks/{id}/toggle");
    expect(tasksContract.remove["~orpc"].route.path).toBe("/tasks/{id}");
  });

  it("remove отвечает 204 без тела", () => {
    expect(tasksContract.remove["~orpc"].route.successStatus).toBe(204);
  });
});

describe("createTaskInputSchema — валидация", () => {
  it("принимает валидный вход", () => {
    const result = createTaskInputSchema.safeParse({ title: "Купить молоко" });

    expect(result.success).toBe(true);
  });

  it("отклоняет пустой title", () => {
    const result = createTaskInputSchema.safeParse({ title: "" });

    expect(result.success).toBe(false);
  });

  it("widget из .meta() виден конструктору админки (Фаза 8)", () => {
    expect(createTaskInputSchema.shape.title.meta()).toMatchObject({ widget: "text" });
  });
});
