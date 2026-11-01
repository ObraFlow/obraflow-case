import { expect, test } from "@playwright/test";
import { agirComo, AMANDA, JOAO, JSON_HEADERS, RAFAEL } from "./agindo-como";
import { reiniciarBanco } from "./banco";

test.beforeAll(() => reiniciarBanco());

test("pedido de R$ 12.500 no Residencial passa por João e depois por Amanda, nesta ordem", async ({
  page,
  context,
  request,
}) => {
  // Rafael cadastra pela API: o que interessa aqui é a ordem das decisões, não o formulário.
  const resposta = await request.post("/api/pedidos", {
    headers: JSON_HEADERS,
    data: {
      obraId: 1,
      fornecedorId: 1,
      dataPedido: "2026-10-31",
      criadoPorId: RAFAEL,
      itens: [
        {
          descricao: "Cimento CP-II 50 kg",
          quantidade: "250",
          unidade: "sc",
          precoUnitarioCents: 5_000,
        },
      ],
    },
  });
  expect(resposta.status()).toBe(201);
  const pedido = await resposta.json();
  expect(pedido.totalCents).toBe(1_250_000);
  expect(pedido.aprovacoes.map((a: { aprovadorId: number }) => a.aprovadorId)).toEqual([
    JOAO,
    AMANDA,
  ]);

  // Amanda é o segundo nível: vê que está aguardando João e não consegue decidir.
  await agirComo(context, AMANDA);
  await page.goto(`/aprovacoes/${pedido.id}`);
  const decisao = page.getByRole("region", { name: "Decisão" });
  await expect(decisao).toContainText("Aguardando João Mendes");
  await expect(decisao.getByRole("button", { name: "Aprovar" })).toBeDisabled();

  // João aprova: o pedido continua pendente, agora com a Amanda.
  await agirComo(context, JOAO);
  await page.goto(`/aprovacoes/${pedido.id}`);
  await decisao.getByRole("button", { name: "Aprovar" }).click();
  // Quem acabou de decidir vê a própria decisão; a vez passou para a Amanda.
  await expect(decisao).toContainText("Você aprovou às");
  await expect(decisao.getByRole("button", { name: "Aprovar" })).toBeDisabled();

  // Amanda aprova e a cadeia termina.
  await agirComo(context, AMANDA);
  await page.goto(`/aprovacoes/${pedido.id}`);
  await decisao.getByRole("button", { name: "Aprovar" }).click();
  await expect(decisao).toContainText("Você aprovou às");
  await expect(page.getByText("Aprovado", { exact: true }).first()).toBeVisible();

  // Para quem não decidiu, a faixa diz que a cadeia terminou.
  await agirComo(context, RAFAEL);
  await page.goto(`/aprovacoes/${pedido.id}`);
  await expect(decisao).toContainText("Cadeia concluída");
});

test("quem cadastrou o pedido não decide sobre ele", async ({ page, context }) => {
  // O #1 do seed foi cadastrado por Rafael e espera João.
  await agirComo(context, RAFAEL);
  await page.goto("/aprovacoes/1");
  const decisao = page.getByRole("region", { name: "Decisão" });
  await expect(decisao).toContainText("Aguardando João Mendes");
  await expect(decisao.getByRole("button", { name: "Aprovar" })).toBeDisabled();
});
