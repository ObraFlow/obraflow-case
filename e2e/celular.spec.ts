import { expect, test } from "@playwright/test";
import { agirComo, JOAO } from "./agindo-como";
import { reiniciarBanco } from "./banco";

test.beforeAll(() => reiniciarBanco());

const ROTAS = [
  "/aprovacoes",
  "/aprovacoes/2",
  "/pedidos/novo",
  "/regras?obra=1",
  "/acompanhamento",
];

for (const rota of ROTAS) {
  test(`${rota} cabe em 375px sem rolagem horizontal`, async ({ page, context }) => {
    await agirComo(context, JOAO);
    await page.goto(rota);
    // Espera o conteúdo de verdade, não o skeleton do loading.tsx (que é o `role="status"`
    // rotulado "Carregando…"; o `<output>` do total do pedido também tem esse papel).
    await expect(page.getByRole("status", { name: /^Carregando/ })).toHaveCount(0);

    const larguras = await page.evaluate(() => ({
      conteudo: document.documentElement.scrollWidth,
      janela: window.innerWidth,
    }));
    expect(larguras.conteudo).toBeLessThanOrEqual(larguras.janela);
  });
}
