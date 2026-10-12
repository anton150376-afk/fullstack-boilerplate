import { expect, test } from "@playwright/test";

import { setLanguage } from "./helpers.js";

// Язык хранится в cookie и читается на сервере: переключатель вызывает
// серверную функцию (useServerFn), то есть проверяется и клиентская гидратация,
// и серверный рендеринг.
test("язык: переключатель меняет интерфейс и запоминается после перезагрузки", async ({
  page,
  context,
  baseURL,
}) => {
  await setLanguage(context, baseURL, "ru");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Заметки" })).toBeVisible();

  await page.getByRole("button", { name: "Eng" }).click();
  await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible();

  await page.getByRole("button", { name: "Рус" }).click();
  await expect(page.getByRole("heading", { name: "Заметки" })).toBeVisible();
});
