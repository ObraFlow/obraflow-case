import { expect, test } from "@playwright/test";
import { agirComo, JOAO } from "./agindo-como";
import { reiniciarBanco } from "./banco";

test.beforeAll(() => reiniciarBanco());

test("rejeitar só com motivo; a rejeição encerra a cadeia", async ({ page, context }) => {
  // O #2 do seed já tem a aprovação de João e espera Amanda; o #1 espera João.
  await agirComo(context, JOAO);
  await page.goto("/aprovacoes/1");

  const decisao = page.getByRole("region", { name: "Decisão" });
  await decisao.getByRole("button", { name: "Rejeitar" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Rejeitar o pedido #1?");
  const confirmar = dialog.getByRole("button", { name: "Rejeitar pedido" });
  await expect(confirmar).toBeDisabled();
  await expect(dialog).toContainText("Informe o motivo para rejeitar.");

  await dialog.getByLabel("Motivo").fill("Preço acima da cotação da semana passada.");
  await expect(confirmar).toBeEnabled();
  await confirmar.click();

  // Quem rejeitou vê a própria decisão; os botões ficam desabilitados para todo mundo.
  await expect(decisao).toContainText("Você rejeitou às");
  await expect(decisao.getByRole("button", { name: "Aprovar" })).toBeDisabled();
  await expect(decisao.getByRole("button", { name: "Rejeitar" })).toBeDisabled();
  // O motivo fica na trilha da alçada.
  await expect(page.getByText("Preço acima da cotação da semana passada.")).toBeVisible();
});
