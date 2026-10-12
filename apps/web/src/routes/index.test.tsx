import { QueryClient } from "@tanstack/query-core";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// vi.hoisted — fetch подделан ДО того, как модульный граф маршрутов
// (routeTree → routes/index → lib/api) впервые вызовет createApiClient():
// транспорт захватывает ссылку на fetch один раз при создании клиента
// (packages/api-client/src/transport.ts), обычный vi.stubGlobal в
// beforeEach был бы слишком поздним — модуль уже успел бы захватить
// настоящий fetch к моменту первого импорта.
const { fetchMock } = vi.hoisted(() => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock };
});

// beforeLoad корня читает язык через серверную функцию
// (src/lib/language.ts) — в тесте нет настоящего сервера Start, поэтому
// модуль подделан целиком, чтобы не вызывать реальный createServerFn.
vi.mock("../lib/language.js", () => ({
  getLanguage: () => Promise.resolve("ru"),
  setLanguage: () => Promise.resolve({ language: "ru" }),
  LANGUAGE_COOKIE: "lang",
}));

const { routeTree } = await import("../routeTree.gen.js");

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

// Повторяет src/router.tsx (без HTTP-специфики Start, которой тест не
// касается): setupRouterSsrQueryIntegration — не опция, а обязательный
// шаг, иначе useSuspenseQuery не находит QueryClient (он ставит
// QueryClientProvider через router.options.Wrap, не через переданный
// в createRouter() context — это две разные вещи).
function createTestRouter(initialEntry: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
}

describe("HomePage (/)", () => {
  afterEach(() => {
    fetchMock.mockReset();
  });

  it("рендерит список заметок, полученный через фабрику запросов (api-client)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        {
          id: "1",
          title: "Проверка рендера",
          body: "текст",
          createdAt: "2026-10-08T00:00:00.000Z",
          updatedAt: "2026-10-08T00:00:00.000Z",
        },
      ]),
    );

    render(<RouterProvider router={createTestRouter("/")} />);

    await waitFor(() => {
      expect(screen.getByTestId("notes-list")).toHaveTextContent("Проверка рендера");
    });
    expect(screen.getByTestId("notes-count")).toHaveTextContent("1 заметка");
  });

  it("при ошибке загрузки показывает состояние ошибки маршрута, а не падает молча", async () => {
    fetchMock.mockResolvedValue(new Response("Internal Server Error", { status: 500 }));

    render(<RouterProvider router={createTestRouter("/")} />);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
    });
  });

  it("переключатель языка показывает текущий язык активным", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    render(<RouterProvider router={createTestRouter("/")} />);

    const ruButton = await screen.findByRole("button", { name: "Рус" });
    const enButton = screen.getByRole("button", { name: "Eng" });

    // Активный язык — primary (bg-primary), неактивный — outline (border);
    // src/lib/language.js подделан на "ru" (см. vi.mock выше).
    expect(ruButton.className).toContain("bg-primary");
    expect(enButton.className).toContain("border");
  });
});
