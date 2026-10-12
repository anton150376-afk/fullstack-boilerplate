import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Suspense } from "react";
import { I18nextProvider } from "react-i18next";

import { createI18n } from "@boilerplate/i18n";

import NotesScreen from "./app/index.js";

// Link из expo-router требует контекст навигации, который в этом тесте не нужен:
// проверяется только экран заметок, поэтому ссылка заменена на пассивную обёртку.
jest.mock("expo-router", () => ({
  Link: ({ children }: { children?: unknown }) => children,
}));

// Сеть не трогаем: api подделан целиком, но queryOptions/mutationOptions
// возвращают настоящие опции TanStack Query (тот же приём, что в
// tasks-screen.test.tsx). Имена с префиксом "mock" — иначе jest.mock()
// запрещает ссылку на переменную вне своей фабрики.
const mockList = jest.fn();
const mockCreate = jest.fn();

jest.mock("./lib/api.js", () => ({
  api: {
    notes: {
      list: {
        queryKey: () => ["notes", "list"],
        queryOptions: () => ({
          queryKey: ["notes", "list"],
          queryFn: (): unknown => mockList(),
        }),
      },
      create: {
        mutationOptions: (options: object) => ({
          mutationFn: (input: unknown): unknown => mockCreate(input),
          ...options,
        }),
      },
    },
  },
}));

const now = new Date();

function note(id: string, title: string) {
  return { id, title, body: "", createdAt: now, updatedAt: now };
}

// gcTime: Infinity — иначе после размонтирования TanStack Query оставляет
// 5-минутные таймеры, и процесс Jest не завершается сам.
async function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  return await render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n({ language: "ru" })}>
        <Suspense fallback={null}>
          <NotesScreen />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("NotesScreen (apps/mobile/src/app/index.tsx)", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockCreate.mockReset();
  });

  it("показывает счётчик заметок с русской формой числа", async () => {
    mockList.mockResolvedValue([note("1", "Первая"), note("2", "Вторая")]);

    await renderScreen();

    expect(await screen.findByText("Первая")).toBeTruthy();
    expect(screen.getByTestId("notes-count")).toHaveTextContent("2 заметки");
  });

  // Регресс: после создания заметка уходила на сервер, а список и счётчик
  // оставались прежними до перезапуска приложения — экран не сбрасывал кеш
  // запроса (в вебе сбрасывал). Нашёл ручной прогон на настоящем телефоне.
  it("после создания заметки список и счётчик обновляются без перезапуска", async () => {
    mockList.mockResolvedValueOnce([]).mockResolvedValue([note("1", "Новая заметка")]);
    mockCreate.mockResolvedValue(note("1", "Новая заметка"));

    await renderScreen();
    expect(await screen.findByText("0 заметок")).toBeTruthy();

    await fireEvent.changeText(screen.getByPlaceholderText("Заголовок"), "Новая заметка");
    await fireEvent.press(screen.getByText("Добавить"));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ title: "Новая заметка", body: "" });
    });
    expect(await screen.findByText("Новая заметка")).toBeTruthy();
    expect(screen.getByTestId("notes-count")).toHaveTextContent("1 заметка");
    expect(mockList).toHaveBeenCalledTimes(2);
  });
});
