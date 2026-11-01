import type { Page } from "@playwright/test";

/** On phones the list filters sit behind a button; open it when it is shown and still closed. */
export async function openFilters(page: Page, region: string | RegExp = /^Filtros de/) {
  const bar = page.getByRole("region", { name: region });
  // Wait for the list page itself: right after a navigation or reload the toggle is not there yet.
  await bar.waitFor();
  const toggle = bar.getByRole("button", { name: /^Filtros/ });
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) === "false") await toggle.click();
}
