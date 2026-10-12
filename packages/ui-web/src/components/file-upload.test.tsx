import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FileUpload } from "./file-upload.js";

// jsdom не выполняет настоящих сетевых запросов — XMLHttpRequest
// подделан, чтобы управлять ответом "хранилища" вручную (успех/отказ)
// и проверить, что компонент реагирует на load/error так же, как
// реагировал бы на настоящий S3-совместимый сервер.
class FakeXHR {
  static lastInstance: FakeXHR | undefined;
  status = 200;
  responseText = "";
  upload = { addEventListener: vi.fn() };
  open = vi.fn();
  send = vi.fn();
  private readonly listeners: { load: (() => void)[]; error: (() => void)[] } = {
    load: [],
    error: [],
  };

  constructor() {
    FakeXHR.lastInstance = this;
  }

  addEventListener(event: "load" | "error", callback: () => void): void {
    this.listeners[event].push(callback);
  }

  emitLoad(): void {
    for (const callback of this.listeners.load) callback();
  }
}

describe("FileUpload", () => {
  beforeEach(() => {
    FakeXHR.lastInstance = undefined;
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("запрашивает талон, грузит файл подписанной формой и подтверждает", async () => {
    const requestTicket = vi.fn().mockResolvedValue({
      fileId: "file-1",
      url: "https://storage.example.test",
      fields: { key: "uploads/a.png" },
    });
    const confirmUpload = vi
      .fn()
      .mockResolvedValue({ id: "file-1", size: 10, contentType: "image/png" });
    const onUploaded = vi.fn();

    render(
      <FileUpload
        requestTicket={requestTicket}
        confirmUpload={confirmUpload}
        onUploaded={onUploaded}
      />,
    );

    const file = new File(["hello"], "a.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Файл для загрузки"), { target: { files: [file] } });

    await waitFor(() => {
      expect(requestTicket).toHaveBeenCalledWith(file);
    });
    await waitFor(() => {
      expect(FakeXHR.lastInstance).toBeDefined();
    });

    FakeXHR.lastInstance?.emitLoad();

    await waitFor(() => {
      expect(confirmUpload).toHaveBeenCalledWith("file-1");
    });
    expect(onUploaded).toHaveBeenCalledWith({ id: "file-1", size: 10, contentType: "image/png" });
  });

  it("показывает внятную ошибку, если хранилище отклонило файл по размеру, и не подтверждает", async () => {
    const requestTicket = vi.fn().mockResolvedValue({
      fileId: "file-1",
      url: "https://storage.example.test",
      fields: {},
    });
    const confirmUpload = vi.fn();

    render(<FileUpload requestTicket={requestTicket} confirmUpload={confirmUpload} />);

    const file = new File(["x"], "big.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Файл для загрузки"), { target: { files: [file] } });

    await waitFor(() => {
      expect(FakeXHR.lastInstance).toBeDefined();
    });

    const xhr = FakeXHR.lastInstance;
    if (!xhr) throw new Error("ожидался экземпляр FakeXHR");
    xhr.status = 400;
    xhr.responseText = "<Error><Code>EntityTooLarge</Code></Error>";
    xhr.emitLoad();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("допустимый размер");
    });
    expect(confirmUpload).not.toHaveBeenCalled();
  });

  it("подписи из пропса labels заменяют русские: поле и текст ошибки хранилища", async () => {
    const requestTicket = vi.fn().mockResolvedValue({
      fileId: "file-1",
      url: "https://storage.example.test",
      fields: {},
    });

    render(
      <FileUpload
        requestTicket={requestTicket}
        confirmUpload={vi.fn()}
        labels={{ fileInput: "File to upload", tooLarge: "File is too large" }}
      />,
    );

    const file = new File(["x"], "big.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("File to upload"), { target: { files: [file] } });

    await waitFor(() => {
      expect(FakeXHR.lastInstance).toBeDefined();
    });
    const xhr = FakeXHR.lastInstance;
    if (!xhr) throw new Error("ожидался экземпляр FakeXHR");
    xhr.status = 413;
    xhr.emitLoad();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("File is too large");
    });
  });
});
