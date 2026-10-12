import { readdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

import { setLanguage } from "./helpers.js";

// Каталог, куда файловый приёмник сервера кладёт отчёты (BUGS_DIRECTORY в
// apps/server/src/dev-bug-reports/dev-bug-reports.constants.ts): .bugs/ в
// корне репозитория. Тест читает его напрямую, поэтому сервер должен работать
// на этой же машине.
const BUGS_DIRECTORY = resolve(import.meta.dirname, "../../../.bugs");

test.beforeEach(async ({ context, baseURL }) => {
  await setLanguage(context, baseURL, "ru");
});

async function findReport(marker: string): Promise<{ path: string; text: string } | undefined> {
  const names = await readdir(BUGS_DIRECTORY).catch(() => [] as string[]);
  for (const name of names) {
    const path = resolve(BUGS_DIRECTORY, name);
    const text = await readFile(path, "utf8");
    if (text.includes(marker)) {
      return { path, text };
    }
  }
  return undefined;
}

// Цепочка багрепорта (Фаза 9) целиком, в настоящем браузере: запрос к API
// получает X-Request-Id → страница видит заголовок (для этого сервер обязан
// открыть его через CORS) → кнопка «Сообщить о проблеме» отправляет отчёт →
// сервер записывает файл, в котором тот же идентификатор.
test("багрепорт: отчёт попадает на сервер и содержит request-id запроса к API", async ({
  page,
}) => {
  const marker = `e2e-отчёт-${String(Date.now())}`;
  const title = `e2e задача ${String(Date.now())}`;

  await page.goto("/admin/tasks");
  await expect(page.getByRole("heading", { name: "Задачи" })).toBeVisible();

  // Запрос к API, идентификатор которого должен оказаться в отчёте.
  const created = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().endsWith("/tasks"),
  );
  await page.getByRole("button", { name: "Добавить" }).click();
  await page.getByLabel("Название").fill(title);
  await page.getByRole("button", { name: "Сохранить" }).click();
  const requestId = (await created).headers()["x-request-id"];
  expect(requestId).toBeTruthy();
  await expect(page.getByRole("row", { name: new RegExp(title) })).toBeVisible();

  await page.getByRole("button", { name: "Сообщить о проблеме" }).click();
  await page.getByLabel("Описание").fill(marker);
  await page.getByRole("button", { name: "Отправить" }).click();
  await expect(page.getByText("Отчёт отправлен, спасибо!")).toBeVisible();

  const report = await findReport(marker);
  expect(report, "файл отчёта не появился в .bugs/").toBeDefined();
  try {
    expect(report?.text).toContain("/admin/tasks");
    expect(report?.text).toContain(requestId);
  } finally {
    if (report) {
      await rm(report.path);
    }
  }
});

test("багрепорт: форма требует описание", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Сообщить о проблеме" }).click();
  await page.getByRole("button", { name: "Отправить" }).click();

  // Поле обязательное: браузер не даёт отправить пустую форму, диалог остаётся.
  await expect(page.getByLabel("Описание")).toBeVisible();
  await expect(page.getByText("Отчёт отправлен, спасибо!")).toHaveCount(0);
});
