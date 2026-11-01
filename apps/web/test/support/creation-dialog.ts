import { expect, type Page } from "@playwright/test";

export async function openCreation(page: Page, kind: "users" | "suppliers" | "projects") {
  const title = { users: "Novo usuário", suppliers: "Novo fornecedor", projects: "Nova obra" }[kind];
  const dialog = page.getByRole("dialog", { name: title, exact: true });
  // A closing popup remains visible during its exit animation. It is not an
  // already-open form; wait before deciding whether to click the add action.
  await expect(
    page.getByRole("dialog", { name: title, exact: true, includeHidden: true }).and(page.locator("[data-closed]")),
  ).toHaveCount(0);
  if (!(await dialog.isVisible())) {
    await page
      .getByRole("button", {
        name: { users: "Adicionar usuário", suppliers: "Adicionar fornecedor", projects: "Adicionar obra" }[kind],
        exact: true,
      })
      .click();
  }
  await expect(dialog).toBeVisible();
  return dialog;
}
