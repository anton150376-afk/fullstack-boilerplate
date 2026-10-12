import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { FileUpload } from "./file-upload.js";

// expo-file-system не бегает по настоящей сети в тестах — File подделан
// целиком: pickFileAsync (статика) и upload (метод экземпляра). Имена
// переменных начинаются с "mock" — иначе jest.mock() запрещает ссылку
// на переменную вне своей фабрики (hoisting guard).
const mockUpload = jest.fn();
const fakeFile = { name: "a.png", upload: mockUpload };
const mockPickFileAsync = jest.fn();

jest.mock("expo-file-system", () => ({
  File: { pickFileAsync: (...args: unknown[]): unknown => mockPickFileAsync(...args) },
  UploadType: { MULTIPART: 1 },
}));

describe("FileUpload", () => {
  beforeEach(() => {
    mockUpload.mockReset();
    mockPickFileAsync.mockReset();
  });

  it("запрашивает талон, грузит файл подписанной формой и подтверждает", async () => {
    mockPickFileAsync.mockResolvedValue({ result: fakeFile, canceled: false });
    mockUpload.mockResolvedValue({ body: "", status: 200, headers: {} });
    const requestTicket = jest.fn().mockResolvedValue({
      fileId: "file-1",
      url: "https://storage.example.test",
      fields: { key: "uploads/a.png" },
    });
    const confirmUpload = jest
      .fn()
      .mockResolvedValue({ id: "file-1", size: 10, contentType: "image/png" });
    const onUploaded = jest.fn();

    await render(
      <FileUpload
        requestTicket={requestTicket}
        confirmUpload={confirmUpload}
        onUploaded={onUploaded}
      />,
    );

    await fireEvent.press(screen.getByRole("button"));

    await waitFor(() => {
      expect(requestTicket).toHaveBeenCalledWith(fakeFile);
    });
    expect(mockUpload).toHaveBeenCalledWith(
      "https://storage.example.test",
      expect.objectContaining({ fieldName: "file", parameters: { key: "uploads/a.png" } }),
    );
    await waitFor(() => {
      expect(confirmUpload).toHaveBeenCalledWith("file-1");
    });
    expect(onUploaded).toHaveBeenCalledWith({ id: "file-1", size: 10, contentType: "image/png" });
  });

  it("не запрашивает талон, если пикер отменён", async () => {
    mockPickFileAsync.mockResolvedValue({ result: null, canceled: true });
    const requestTicket = jest.fn();

    await render(<FileUpload requestTicket={requestTicket} confirmUpload={jest.fn()} />);

    await fireEvent.press(screen.getByRole("button"));

    await waitFor(() => {
      expect(mockPickFileAsync).toHaveBeenCalled();
    });
    expect(requestTicket).not.toHaveBeenCalled();
  });

  it("показывает внятную ошибку, если загрузка упала, и не подтверждает", async () => {
    mockPickFileAsync.mockResolvedValue({ result: fakeFile, canceled: false });
    mockUpload.mockRejectedValue(new Error("Хранилище отклонило загрузку (код 400)"));
    const requestTicket = jest.fn().mockResolvedValue({
      fileId: "file-1",
      url: "https://storage.example.test",
      fields: {},
    });
    const confirmUpload = jest.fn();

    await render(<FileUpload requestTicket={requestTicket} confirmUpload={confirmUpload} />);

    await fireEvent.press(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect(confirmUpload).not.toHaveBeenCalled();
  });

  it("подпись кнопки выбора файла берётся из пропса labels", async () => {
    await render(
      <FileUpload
        requestTicket={jest.fn()}
        confirmUpload={jest.fn()}
        labels={{ pickFile: "Choose file" }}
      />,
    );

    expect(screen.getByText("Choose file")).toBeTruthy();
  });
});
