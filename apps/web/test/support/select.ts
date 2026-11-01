import { expect, type Locator, type Page } from "@playwright/test";

/** Exercise the visible Base UI control, including options rendered in its portal. */
export async function selectOption(control: Locator, value: string) {
  await control.click();
  await control
    .page()
    .getByRole("option")
    .and(control.page().locator(`[data-option-value=${JSON.stringify(value)}]`))
    .click();
}

export async function closeSelect(page: Page) {
  await page.getByRole("option").first().focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
}
