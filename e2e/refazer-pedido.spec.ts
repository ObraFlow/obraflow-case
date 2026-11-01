import { expect, test } from "@playwright/test";
import { agirComo, JSON_HEADERS, RAFAEL } from "./agindo-como";
import { reiniciarBanco } from "./banco";

test.beforeAll(() => reiniciarBanco());

test("pedido rejeitado é refeito com o formulário preenchido e fica ligado à origem", async ({
  page,
  context,
  request,
}) => {
  // O #9 do seed foi rejeitado por Carla e ainda não tem nova versão.
  await agirComo(context, RAFAEL);
  await page.goto("/aprovacoes/9");
  await page.getByRole("link", { name: "Refazer o pedido" }).click();

  await expect(page).toHaveURL(/\/pedidos\/novo\?refazer=9$/);
  await expect(page.getByRole("heading", { name: "Refazer o pedido #9" })).toBeVisible();
  await expect(page.getByText("Nova versão do pedido #9, rejeitado por Carla Souza")).toBeVisible();
  await expect(page.getByLabel("Descrição do item 1")).toHaveValue(
    "Portão de correr em madeira 4 m",
  );

  // Ajusta o que foi apontado (o motivo pedia portão metálico) e envia.
  await page.getByLabel("Descrição do item 1").fill("Portão de correr metálico 4 m");
  await page.getByLabel("Preço unitário do item 1 (R$)").fill("7900,00");
  const enviar = page.getByRole("button", { name: "Enviar nova versão" });
  await expect(enviar).toBeEnabled();
  await enviar.click();

  await expect(page).toHaveURL(/\/aprovacoes\/22$/);
  await expect(page.getByText("Nova versão do pedido #9, que foi rejeitado.")).toBeVisible();
  await expect(page.getByRole("link", { name: "pedido #9" })).toBeVisible();

  // A origem aponta para a nova versão e não pode ser refeita de novo.
  await page.goto("/aprovacoes/9");
  await expect(page.getByRole("link", { name: "pedido #22" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Refazer o pedido" })).toHaveCount(0);

  const segunda = await request.post("/api/pedidos", {
    headers: JSON_HEADERS,
    data: {
      obraId: 2,
      fornecedorId: 3,
      dataPedido: "2026-10-31",
      criadoPorId: RAFAEL,
      origemId: 9,
      itens: [
        { descricao: "Outro portão", quantidade: "1", unidade: "un", precoUnitarioCents: 100_000 },
      ],
    },
  });
  expect(segunda.status()).toBe(409);
  expect((await segunda.json()).erro.codigo).toBe("ORIGEM_JA_REFEITA");
});
