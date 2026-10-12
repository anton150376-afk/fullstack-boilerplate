import { describe, expect, it } from "vitest";

import { createMockServer, http, HttpResponse } from "./index.js";

describe("createMockServer", () => {
  const server = createMockServer([
    http.get("https://api.example.test/ping", () => HttpResponse.json({ ok: true })),
  ]);

  it("перехватывает запрос по заранее заданному обработчику", async () => {
    const response = await fetch("https://api.example.test/ping");
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  it("server.use добавляет обработчик, который не переживает следующий тест", async () => {
    server.use(http.get("https://api.example.test/temp", () => HttpResponse.text("temporary")));

    const response = await fetch("https://api.example.test/temp");
    expect(await response.text()).toBe("temporary");
  });

  it("обработчик из предыдущего теста сброшен afterEach", async () => {
    await expect(fetch("https://api.example.test/temp")).rejects.toThrow();
  });
});
