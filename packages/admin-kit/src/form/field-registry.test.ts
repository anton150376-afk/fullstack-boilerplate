import { describe, expect, it } from "vitest";
import { z } from "zod";

import { resolveFields } from "./field-registry.js";

describe("resolveFields", () => {
  it("выводит widget из типа Zod для text/number/checkbox/select", () => {
    const schema = z.object({
      title: z.string(),
      age: z.number(),
      active: z.boolean(),
      role: z.enum(["admin", "viewer"]),
    });

    const fields = resolveFields(schema);

    expect(fields.find((f) => f.name === "title")?.widget).toBe("text");
    expect(fields.find((f) => f.name === "age")?.widget).toBe("number");
    expect(fields.find((f) => f.name === "active")?.widget).toBe("checkbox");
    expect(fields.find((f) => f.name === "role")?.widget).toEqual("select");
    expect(fields.find((f) => f.name === "role")?.options).toEqual(["admin", "viewer"]);
  });

  it("читает подсказку .meta({ widget }) из контракта — textarea не выводится из типа", () => {
    const schema = z.object({
      body: z.string().meta({ widget: "textarea" }),
    });

    expect(resolveFields(schema)[0]?.widget).toBe("textarea");
  });

  it("необязательное поле (optional) помечается required: false", () => {
    const schema = z.object({ nick: z.string().optional() });

    expect(resolveFields(schema)[0]?.required).toBe(false);
  });

  it("overrides переопределяет widget/label одного поля без переписывания формы", () => {
    const schema = z.object({ body: z.string() });

    const fields = resolveFields(schema, { body: { widget: "textarea", label: "Текст" } });

    expect(fields[0]).toMatchObject({ widget: "textarea", label: "Текст" });
  });

  it("overrides с hidden: true убирает поле из формы совсем", () => {
    const schema = z.object({ title: z.string(), internalNote: z.string() });

    const fields = resolveFields(schema, { internalNote: { hidden: true } });

    expect(fields.map((f) => f.name)).toEqual(["title"]);
  });
});
