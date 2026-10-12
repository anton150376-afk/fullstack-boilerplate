import { QueryClient } from "@tanstack/query-core";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Та же причина, что src/routes/index.test.tsx: fetch подделан ДО того,
// как граф маршрутов впервые создаст api-client.
const { fetchMock } = vi.hoisted(() => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock };
});

vi.mock("../../lib/language.js", () => ({
  getLanguage: () => Promise.resolve("ru"),
  setLanguage: () => Promise.resolve({ language: "ru" }),
  LANGUAGE_COOKIE: "lang",
}));

const { routeTree } = await import("../../routeTree.gen.js");

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

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

describe("AdminTasksPage (/admin/tasks)", () => {
  afterEach(() => {
    fetchMock.mockReset();
  });

  it("рендерит список задач, полученный через фабрику запросов (api-client)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        {
          id: "1",
          title: "Проверка рендера",
          done: false,
          createdAt: "2026-10-09T00:00:00.000Z",
          updatedAt: "2026-10-09T00:00:00.000Z",
        },
      ]),
    );

    render(<RouterProvider router={createTestRouter("/admin/tasks")} />);

    await waitFor(() => {
      expect(screen.getByText("Проверка рендера")).toBeInTheDocument();
    });
  });

  it("показывает форму создания после нажатия «Добавить» и отправляет POST при сабмите", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    render(<RouterProvider router={createTestRouter("/admin/tasks")} />);

    const addButton = await screen.findByRole("button", { name: "Добавить" });
    fireEvent.click(addButton);

    const input = await screen.findByLabelText("Название");
    expect(input).toBeInTheDocument();
  });
});
