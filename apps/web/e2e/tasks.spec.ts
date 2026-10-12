import { expect, test } from "@playwright/test";

import { setLanguage } from "./helpers.js";

// Сквозной сценарий «Задач» (Фаза 12.3) в настоящем браузере: создать →
// переключить → удалить. Запросы идут из браузера на API с другого адреса, то
// есть проходят через CORS; пока он не был настроен, форма не отправлялась.
test.beforeEach(async ({ context, baseURL }) => {
  await setLanguage(context, baseURL, "ru");
});

test("задачи: создать, переключить, удалить", async ({ page }) => {
  const title = `e2e задача ${String(Date.now())}`;

  await page.goto("/admin/tasks");
  await expect(page.getByRole("heading", { name: "Задачи" })).toBeVisible();

  await page.getByRole("button", { name: "Добавить" }).click();
  await page.getByLabel("Название").fill(title);
  await page.getByRole("button", { name: "Сохранить" }).click();

  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row).toBeVisible();

  // Чекбокс управляемый: состояние меняется после ответа сервера, а не в момент
  // клика, поэтому check() (он требует мгновенной смены) не подходит.
  await row.getByRole("checkbox").click();
  await expect(row.getByRole("checkbox")).toBeChecked();

  await row.getByRole("button", { name: "Удалить" }).click();
  await expect(row).toHaveCount(0);
});

test("задачи: пустое название не отправляется", async ({ page }) => {
  await page.goto("/admin/tasks");

  await page.getByRole("button", { name: "Добавить" }).click();
  await page.getByRole("button", { name: "Сохранить" }).click();

  // Форма осталась открытой: валидация на клиенте остановила отправку.
  await expect(page.getByLabel("Название")).toBeVisible();
});
