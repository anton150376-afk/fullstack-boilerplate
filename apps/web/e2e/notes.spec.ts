import { expect, test } from "@playwright/test";

import { setLanguage } from "./helpers.js";

test.beforeEach(async ({ context, baseURL }) => {
  await setLanguage(context, baseURL, "ru");
});

// Заметка при создании ставит задачу в очередь BullMQ (Redis): сквозной путь
// браузер → API → база → очередь, на котором уже падали jobId и CORS.
test("заметки: созданная заметка появляется в списке", async ({ page }) => {
  const title = `e2e заметка ${String(Date.now())}`;

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Заметки" })).toBeVisible();

  await page.getByLabel("Заголовок").fill(title);
  await page.getByLabel("Текст").fill("проверка из браузера");
  await page.getByRole("button", { name: "Добавить" }).click();

  await expect(page.getByTestId("notes-list")).toContainText(title);
});
