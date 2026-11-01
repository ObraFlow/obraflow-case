import { expect, test } from "@playwright/test";
import { agirComo, JOAO } from "./agindo-como";
import { reiniciarBanco } from "./banco";

test.beforeAll(() => reiniciarBanco());

test("marca só os pedidos da própria vez e aprova de uma vez", async ({ page, context }) => {
  // No seed, João é a vez em #1, #7 e #8; o #2 espera Amanda e não pode ser marcado.
  await agirComo(context, JOAO);
  await page.goto("/aprovacoes?filtro=pendentes");

  const caixas = page.getByRole("checkbox", { name: /^Marcar pedido #/ });
  await expect(caixas).toHaveCount(3);
  await expect(page.getByRole("checkbox", { name: "Marcar pedido #2" })).toHaveCount(0);

  await page.getByRole("checkbox", { name: "Marcar pedido #1" }).check();
  await page.getByRole("checkbox", { name: "Marcar pedido #7" }).check();

  const barra = page.getByRole("region", { name: "Pedidos marcados" });
  await expect(barra).toContainText("2 pedidos marcados, R$ 12.100,00");
  await barra.getByRole("button", { name: "Aprovar marcados" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Aprovar 2 pedidos de uma vez");
  await expect(dialog).toContainText("#1");
  await expect(dialog).toContainText("#7");
  await dialog.getByRole("button", { name: "Confirmar" }).click();

  await expect(page.getByText("2 pedidos aprovados.")).toBeVisible();
  // Os dois saíram da vez de João; o #8 continua.
  await expect(caixas).toHaveCount(1);
  await expect(page.getByRole("checkbox", { name: "Marcar pedido #8" })).toBeVisible();
  await expect(barra).toHaveCount(0);
});
