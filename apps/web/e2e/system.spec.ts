import { expect, test } from "@playwright/test";

import { setLanguage } from "./helpers.js";

test.beforeEach(async ({ context, baseURL }) => {
  await setLanguage(context, baseURL, "ru");
});

// /health/ready запрашивается из браузера напрямую (fetchHealthReady) — тоже
// через CORS.
test("состояние системы: база данных и Redis доступны", async ({ page }) => {
  await page.goto("/admin/system");

  const details = page.getByTestId("health-details");
  await expect(details).toBeVisible();
  await expect(details).toContainText("database: up");
  await expect(details).toContainText("redis: up");
});
