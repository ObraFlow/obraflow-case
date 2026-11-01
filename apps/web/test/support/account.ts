import { expect, type Page } from "@playwright/test";

const desktopTrigger = (page: Page) => page.getByRole("button", { name: "Abrir painel da conta", exact: false });
const phoneTrigger = (page: Page) => page.getByRole("button", { name: /^Abrir conta/ });

/** Opens the account menu: the sidebar card on wide screens, the top-right avatar on phones. */
export async function openAccount(page: Page) {
  if (!(await page.getByRole("radio", { name: "Claro", exact: true }).isVisible())) {
    await desktopTrigger(page).or(phoneTrigger(page)).click();
  }
  await expect(page.getByRole("group", { name: "Aparência", exact: true })).toBeVisible();
}
export async function appearance(page: Page, label: "Claro" | "Escuro" | "Sistema") {
  await openAccount(page);
  await page.getByRole("radio", { name: label, exact: true }).check();
}
export async function closeAccount(page: Page) {
  const close = page.getByRole("button", { name: "Fechar painel da conta", exact: false });
  if (await close.isVisible()) {
    await close.click();
    await expect(desktopTrigger(page)).toBeVisible();
  } else {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("group", { name: "Aparência", exact: true })).toHaveCount(0);
  }
}
