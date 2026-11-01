import { expect, type Page } from "@playwright/test";

export const addMemberButton = (page: Page, userId: string) =>
  page
    .getByRole("dialog", { name: "Gerenciar membros", exact: true })
    .locator(`button[data-add-member=${JSON.stringify(userId)}]`);
export async function openAddMembers(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Gerenciar membros", exact: true });
  if (!(await dialog.getByRole("button", { name: "Voltar aos membros", exact: true }).count())) {
    await dialog.getByRole("button", { name: "Adicionar usuários", exact: true }).click();
  }
}
export async function addMember(page: Page, userId: string) {
  await openAddMembers(page);
  const action = addMemberButton(page, userId);
  await action.click();
  await expect(page.getByRole("button", { name: "Atualizar membros", exact: true })).toBeEnabled();
  await expect(action).toHaveCount(0);
  await page.getByRole("button", { name: "Voltar aos membros", exact: true }).click();
}
