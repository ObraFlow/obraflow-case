import { expect, test } from "@playwright/test";
import { agirComo, JSON_HEADERS, RAFAEL } from "./agindo-como";
import { reiniciarBanco } from "./banco";

test.beforeAll(() => reiniciarBanco());

test("valor sem faixa na obra bloqueia o cadastro, na tela e na API", async ({
  page,
  context,
  request,
}) => {
  // O Galpão não tem faixa entre R$ 30.000,01 e R$ 50.000,00 (lacuna proposital do seed).
  await agirComo(context, RAFAEL);
  await page.goto("/pedidos/novo");

  await page.getByLabel("Obra", { exact: true }).selectOption({ label: "Galpão Logístico BR-324" });
  await page.getByLabel("Fornecedor", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Descrição do item 1").fill("Grua de torre, locação mensal");
  await page.getByLabel("Quantidade do item 1").fill("1");
  await page.getByLabel("Unidade do item 1").fill("mês");
  await page.getByLabel("Preço unitário do item 1 (R$)").fill("40000,00");

  await expect(page.getByText("não tem faixa de alçada para R$ 40.000,00")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cadastrar pedido" })).toBeDisabled();
  await expect(page.getByRole("link", { name: "cadastre uma faixa em Regras" })).toHaveAttribute(
    "href",
    "/regras?obra=2",
  );

  const resposta = await request.post("/api/pedidos", {
    headers: JSON_HEADERS,
    data: {
      obraId: 2,
      fornecedorId: 1,
      dataPedido: "2026-10-31",
      criadoPorId: RAFAEL,
      itens: [
        { descricao: "Grua", quantidade: "1", unidade: "mês", precoUnitarioCents: 4_000_000 },
      ],
    },
  });
  expect(resposta.status()).toBe(422);
  expect((await resposta.json()).erro.codigo).toBe("SEM_FAIXA_APLICAVEL");
});
