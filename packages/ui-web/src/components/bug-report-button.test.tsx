import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BugReportButton } from "./bug-report-button.js";

async function openForm(label = "Сообщить о проблеме"): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: label }));
  await waitFor(() => {
    expect(screen.getByLabelText(/Описание/)).toBeInTheDocument();
  });
}

describe("BugReportButton", () => {
  it("открывает форму и отправляет три поля через onSubmit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BugReportButton onSubmit={onSubmit} />);

    await openForm();

    fireEvent.change(screen.getByLabelText(/Описание/), {
      target: { value: "Кнопка не работает" },
    });
    fireEvent.change(screen.getByLabelText(/Шаги воспроизведения/), {
      target: { value: "1. Открыть" },
    });
    fireEvent.change(screen.getByLabelText(/Ожидаемое поведение/), {
      target: { value: "Должно работать" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        description: "Кнопка не работает",
        stepsToReproduce: "1. Открыть",
        expectedBehavior: "Должно работать",
        screenshot: undefined,
      });
    });
    await waitFor(() => {
      expect(screen.getByText("Отчёт отправлен, спасибо!")).toBeInTheDocument();
    });
  });

  it("показывает ошибку и не закрывает форму, если onSubmit отклонил промис", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Сервер недоступен"));
    render(<BugReportButton onSubmit={onSubmit} />);

    await openForm();
    fireEvent.change(screen.getByLabelText(/Описание/), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Сервер недоступен");
    });
  });

  it("читает выбранный файл как data URL и передаёт его в onSubmit как screenshot", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BugReportButton onSubmit={onSubmit} />);

    await openForm();
    fireEvent.change(screen.getByLabelText(/Описание/), { target: { value: "x" } });

    const file = new File(["снимок"], "shot.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Приложить снимок экрана"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText("Снимок приложен")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    const call = onSubmit.mock.calls[0]?.[0] as { screenshot?: string };
    expect(call.screenshot).toMatch(/^data:image\/png;base64,/);
  });

  it("подписи из пропса labels заменяют русские, незаданные остаются русскими", async () => {
    render(
      <BugReportButton
        onSubmit={vi.fn()}
        labels={{ title: "Report a problem", description: "Description", submit: "Send" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Report a problem" }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Шаги воспроизведения/)).toBeInTheDocument();
  });
});
