import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Suspense } from "react";
import { I18nextProvider } from "react-i18next";

import { createI18n } from "@boilerplate/i18n";

import TasksScreen from "./app/tasks.js";

// Сеть не трогаем: api подделан целиком, но queryOptions/mutationOptions
// возвращают настоящие опции TanStack Query — экран проверяется на тех же
// хуках, что и в приложении. Имена с префиксом "mock" — иначе jest.mock()
// запрещает ссылку на переменную вне своей фабрики.
const mockList = jest.fn();
const mockToggle = jest.fn();

jest.mock("./lib/api.js", () => ({
  api: {
    tasks: {
      list: {
        queryKey: () => ["tasks", "list"],
        queryOptions: () => ({
          queryKey: ["tasks", "list"],
          queryFn: (): unknown => mockList(),
        }),
      },
      create: {
        mutationOptions: (options: object) => ({ mutationFn: jest.fn(), ...options }),
      },
      toggle: {
        mutationOptions: (options: object) => ({
          mutationFn: (input: unknown): unknown => mockToggle(input),
          ...options,
        }),
      },
      remove: {
        mutationOptions: (options: object) => ({ mutationFn: jest.fn(), ...options }),
      },
    },
  },
}));

const now = new Date();

function task(id: string, title: string, done = false) {
  return { id, title, done, createdAt: now, updatedAt: now };
}

// gcTime: Infinity у запросов и мутаций — иначе после размонтирования
// TanStack Query оставляет 5-минутные таймеры сборщика мусора, и процесс
// Jest не завершается сам.
// render асинхронный в @testing-library/react-native 14.
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
          <TasksScreen />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("TasksScreen (apps/mobile/src/app/tasks.tsx)", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockToggle.mockReset();
  });

  it("показывает список задач, полученный через фабрику запросов, и счётчик с русской формой числа", async () => {
    mockList.mockResolvedValue([task("1", "Купить молоко"), task("2", "Позвонить")]);

    await renderScreen();

    expect(await screen.findByText("Купить молоко")).toBeTruthy();
    expect(screen.getByText("Позвонить")).toBeTruthy();
    expect(screen.getByTestId("tasks-count")).toHaveTextContent("2 задачи");
  });

  it("при пустом списке показывает подпись «Задач пока нет»", async () => {
    mockList.mockResolvedValue([]);

    await renderScreen();

    expect(await screen.findByText("Задач пока нет")).toBeTruthy();
  });

  it("нажатие на задачу зовёт toggle с её id", async () => {
    mockList.mockResolvedValue([task("1", "Купить молоко")]);
    mockToggle.mockResolvedValue(task("1", "Купить молоко", true));

    await renderScreen();

    await fireEvent.press(await screen.findByText("Купить молоко"));

    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledWith({ id: "1" });
    });
  });
});
