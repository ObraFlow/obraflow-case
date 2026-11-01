import type { Page } from "@playwright/test";

/** Signs the page in as the owner of `token` before it loads, the way a restored session would. */
export async function signInAs(page: Page, token: string) {
  await page.addInitScript((value) => sessionStorage.setItem("obraflow.accessToken", value), token);
}
