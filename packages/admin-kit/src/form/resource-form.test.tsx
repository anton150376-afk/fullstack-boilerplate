import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ResourceForm } from "./resource-form.js";

// Проверка во время выполнения для приведения типа у zodResolver
// (B-261008-zodresolver-generic-schema-param, docs/BACKLOG.md) — tsc
// зелёный не доказывает, что резолвер реально валидирует ту форму, что
// описывает схема; здесь — доказательство рантаймом, не типами.
describe("ResourceForm", () => {
  const schema = z.object({
    title: z.string().min(1, "Заголовок обязателен"),
    body: z.string().meta({ widget: "textarea" }),
  });

  it("отвергает значение, которое отвергает схема, и показывает причину у поля", async () => {
    const onSubmit = vi.fn();
    render(<ResourceForm schema={schema} onSubmit={onSubmit} />);

    // Ввести, затем стереть — не просто fireEvent.change(..., value: "")
    // сразу: контролируемый input уже отображает "" (FieldInput), React
    // не считает "" → "" изменением и не зовёт onChange, поле остаётся
    // "нетронутым" (undefined в react-hook-form), а Zod для undefined
    // даёт свой текст типа ДО проверки .min(1) — не тот, что проверяет
    // этот тест (найдено прогоном, не предположением).
    const titleField = screen.getByLabelText(/^Title/);
    fireEvent.change(titleField, { target: { value: "x" } });
    fireEvent.change(titleField, { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/^Body/), { target: { value: "Текст" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Заголовок обязателен");
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("отправляет значения, прошедшие валидацию", async () => {
    const onSubmit = vi.fn();
    render(<ResourceForm schema={schema} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Заголовок" } });
    fireEvent.change(screen.getByLabelText(/^Body/), { target: { value: "Текст" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    // react-hook-form's handleSubmit передаёт onSubmit вторым аргументом
    // DOM-событие — проверяем только данные, не весь список аргументов.
    await waitFor(() => {
      expect(onSubmit.mock.calls[0]?.[0]).toEqual({ title: "Заголовок", body: "Текст" });
    });
  });

  it("показывает серверную ошибку поля, когда клиентская валидация её не ловит", () => {
    render(
      <ResourceForm
        schema={schema}
        onSubmit={vi.fn()}
        serverErrors={{ title: "Заголовок уже занят" }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Заголовок уже занят");
  });

  // Регрессия (apps/web/src/routes/admin/tasks.tsx, Фаза 12.3 задания):
  // звёздочка обязательного поля не входит в accessible name label'а,
  // иначе getByLabelText/findByLabelText с точным текстом видимой
  // подписи ("Название") молча не находит required-поле.
  it("звёздочка обязательного поля не входит в имя label для accessibility-запросов", () => {
    render(<ResourceForm schema={schema} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
  });
});
