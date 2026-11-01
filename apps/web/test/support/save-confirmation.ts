import type { Page } from "@playwright/test";

export async function confirmSave(page: Page) {
  await page.locator("button[data-review-action]").click();
}
