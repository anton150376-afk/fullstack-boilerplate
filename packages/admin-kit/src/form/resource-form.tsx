import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { Button } from "@boilerplate/ui-web";

import { defaultResourceFormLabels } from "../labels.js";
import { resolveFields, type FieldOverrideMap } from "./field-registry.js";

export type { FieldOverrideMap } from "./field-registry.js";

// TValues выводится из TSchema, не берётся отдельным свободным
// параметром — иначе zodResolver(schema) (привязанный к TSchema) и
// useForm<TValues> не совпадают по типу ни при каком использовании
// (найдено tsc, не по памяти).
export interface ResourceFormProps<TSchema extends z.ZodObject> {
  schema: TSchema;
  overrides?: FieldOverrideMap;
  defaultValues?: Partial<z.infer<TSchema>>;
  onSubmit: (values: z.infer<TSchema>) => void | Promise<void>;
  /** Отказ сервера после отправки — та же причина, что и у клиентской валидации. */
  serverErrors?: Record<string, string>;
  submitLabel?: string;
  pending?: boolean;
}

// Та же схема, что валидирует на сервере (раздел "Фаза 8" задания,
// пункт 8.3) — resolveFields читает её форму для разметки,
// zodResolver — для самой валидации при отправке.
export function ResourceForm<TSchema extends z.ZodObject>({
  schema,
  overrides,
  defaultValues,
  onSubmit,
  serverErrors,
  submitLabel = defaultResourceFormLabels.submit,
  pending = false,
}: ResourceFormProps<TSchema>) {
  const fields = resolveFields(schema, overrides);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<TSchema>>({
    // Приведение типа — схема передаётся через TSchema (общий параметр
    // с дефолтным, "рыхлым" ограничением), zodResolver не может
    // унифицировать вывод типа настолько абстрактного параметра с
    // конкретным z.infer<TSchema> (найдено tsc); во время выполнения
    // zodResolver(schema) валидирует именно ту форму, что описывает
    // переданная схема — приведение отражает реальность, не обходит её.
    resolver: zodResolver(schema) as unknown as Resolver<z.infer<TSchema>>,
    defaultValues: defaultValues as never,
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
    >
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col gap-1">
          <span className="flex gap-1">
            {/* Звёздочка — вне <label>: getByLabelText/findByLabelText
                из @testing-library/dom сверяют весь textContent самого
                label'а буквально, ARIA (aria-hidden и т.п.) они не
                учитывают, поэтому "Название *" внутри label не находится
                запросом на видимый текст подписи "Название" — найдено
                прогоном нового admin-экрана (apps/web/src/routes/admin/
                tasks.tsx, Фаза 12.3 задания), не по памяти. */}
            <label htmlFor={field.name} className="text-sm font-medium text-foreground">
              {field.label}
            </label>
            {field.required && <span className="text-destructive">*</span>}
          </span>
          <Controller
            name={field.name as never}
            control={control}
            render={({ field: controllerField }) => (
              <FieldInput field={field} controllerField={controllerField} />
            )}
          />
          {(() => {
            const clientMessage = errors[field.name]?.message;
            const message =
              typeof clientMessage === "string" ? clientMessage : serverErrors?.[field.name];
            return (
              message && (
                <p role="alert" className="text-sm text-destructive">
                  {message}
                </p>
              )
            );
          })()}
        </div>
      ))}
      <Button type="submit" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}

interface ControllerFieldProps {
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  name: string;
}

function FieldInput({
  field,
  controllerField,
}: {
  field: ReturnType<typeof resolveFields>[number];
  controllerField: ControllerFieldProps;
}) {
  const baseClassName = "rounded-md border border-border bg-background px-3 py-2 text-foreground";

  if (field.widget === "textarea") {
    return (
      <textarea
        id={field.name}
        className={baseClassName}
        value={(controllerField.value ?? "") as string}
        onChange={(event) => {
          controllerField.onChange(event.target.value);
        }}
        onBlur={controllerField.onBlur}
      />
    );
  }

  if (field.widget === "checkbox") {
    return (
      <input
        id={field.name}
        type="checkbox"
        checked={Boolean(controllerField.value)}
        onChange={(event) => {
          controllerField.onChange(event.target.checked);
        }}
        onBlur={controllerField.onBlur}
      />
    );
  }

  if (field.widget === "select") {
    return (
      <select
        id={field.name}
        className={baseClassName}
        value={(controllerField.value ?? "") as string}
        onChange={(event) => {
          controllerField.onChange(event.target.value);
        }}
        onBlur={controllerField.onBlur}
      >
        {field.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      id={field.name}
      type={field.widget === "number" ? "number" : "text"}
      className={baseClassName}
      value={(controllerField.value ?? "") as string | number}
      onChange={(event) => {
        controllerField.onChange(
          field.widget === "number" ? event.target.valueAsNumber : event.target.value,
        );
      }}
      onBlur={controllerField.onBlur}
    />
  );
}
