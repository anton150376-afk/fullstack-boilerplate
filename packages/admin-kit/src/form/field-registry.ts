import type { z } from "zod";

export type FieldWidget = "text" | "textarea" | "number" | "checkbox" | "select";

export interface FieldOverride {
  widget?: FieldWidget;
  label?: string;
  hidden?: boolean;
}

export type FieldOverrideMap = Record<string, Partial<FieldOverride>>;

export interface ResolvedField {
  name: string;
  label: string;
  widget: FieldWidget;
  required: boolean;
  options?: string[];
}

// Граница возможностей (раздел "Фаза 8" задания, пункт 8.1, "честная
// граница"): это читает только ПРЯМЫЕ поля верхнего уровня
// z.object({...}) — .refine()/.superRefine() (межполевые правила без
// метаданных) и вложенные object/array (решения о раскладке) требуют
// overrides или ручной формы, не распознаются автоматически.
function unwrapOptional(schema: z.ZodType): { inner: z.ZodType; required: boolean } {
  const def = (schema as unknown as { def: { type: string; innerType?: z.ZodType } }).def;
  if (def.type === "optional" || def.type === "default") {
    return { inner: def.innerType ?? schema, required: false };
  }
  return { inner: schema, required: true };
}

function widgetForType(schema: z.ZodType): { widget: FieldWidget; options?: string[] } {
  const def = (schema as unknown as { def: { type: string; entries?: Record<string, string> } })
    .def;
  switch (def.type) {
    case "number":
      return { widget: "number" };
    case "boolean":
      return { widget: "checkbox" };
    case "enum":
      return { widget: "select", options: Object.values(def.entries ?? {}) };
    default:
      return { widget: "text" };
  }
}

function labelize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, " $1");
}

export function resolveFields(
  schema: z.ZodObject,
  overrides: FieldOverrideMap = {},
): ResolvedField[] {
  const fields: ResolvedField[] = [];

  for (const [name, rawField] of Object.entries(schema.shape)) {
    const override = overrides[name];
    if (override?.hidden) continue;

    const { inner, required } = unwrapOptional(rawField as z.ZodType);
    const meta = inner.meta() as { widget?: string; options?: string[] } | undefined;
    const resolved = widgetForType(inner);

    fields.push({
      name,
      label: override?.label ?? labelize(name),
      widget: (override?.widget ?? meta?.widget ?? resolved.widget) as FieldWidget,
      required,
      options: meta?.options ?? resolved.options,
    });
  }

  return fields;
}
