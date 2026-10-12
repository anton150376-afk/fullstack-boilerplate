import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { BugReportButton } from "./bug-report-button.js";

async function openForm(
  captureScreenshot: jest.Mock,
  label = "Сообщить о проблеме",
): Promise<void> {
  await fireEvent.press(screen.getByRole("button", { name: label }));
  await waitFor(() => {
    expect(captureScreenshot).toHaveBeenCalled();
  });
  await waitFor(() => {
    expect(screen.getByLabelText("Описание")).toBeTruthy();
  });
}

// Таймаут поднят с дефолтных 5000мс — тест делает несколько реальных
// проходов render/fireEvent/waitFor подряд и ловил лишний таймаут только
// под полной параллельной нагрузкой pnpm gate:full (не в одиночном
// прогоне, не логика) — тот же класс, что B-261008-openapi-test-flaky-under-load
// в docs/BACKLOG.md.
describe("BugReportButton", () => {
  it("делает снимок автоматически перед открытием формы и отправляет его через onSubmit", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const captureScreenshot = jest.fn().mockResolvedValue("data:image/png;base64,abc");

    await render(<BugReportButton onSubmit={onSubmit} captureScreenshot={captureScreenshot} />);
    await openForm(captureScreenshot);

    await fireEvent.changeText(screen.getByLabelText("Описание"), "Кнопка не работает");
    await fireEvent.changeText(screen.getByLabelText("Шаги воспроизведения"), "1. Открыть");
    await fireEvent.changeText(screen.getByLabelText("Ожидаемое поведение"), "Должно работать");
    await fireEvent.press(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        description: "Кнопка не работает",
        stepsToReproduce: "1. Открыть",
        expectedBehavior: "Должно работать",
        screenshot: "data:image/png;base64,abc",
      });
    });
    await waitFor(() => {
      expect(screen.getByText("Отчёт отправлен, спасибо!")).toBeTruthy();
    });
  }, 20000);

  it("показывает ошибку, если onSubmit отклонил промис", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error("Сервер недоступен"));
    const captureScreenshot = jest.fn().mockResolvedValue(undefined);

    await render(<BugReportButton onSubmit={onSubmit} captureScreenshot={captureScreenshot} />);
    await openForm(captureScreenshot);

    await fireEvent.changeText(screen.getByLabelText("Описание"), "x");
    await fireEvent.press(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
  }, 20000);

  it("подписи из пропса labels заменяют русские, незаданные остаются русскими", async () => {
    const captureScreenshot = jest.fn().mockResolvedValue(undefined);

    await render(
      <BugReportButton
        onSubmit={jest.fn()}
        captureScreenshot={captureScreenshot}
        labels={{ title: "Report a problem", description: "Description", submit: "Send" }}
      />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Report a problem" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Description")).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Send" })).toBeTruthy();
    expect(screen.getByLabelText("Шаги воспроизведения")).toBeTruthy();
  }, 20000);
});
