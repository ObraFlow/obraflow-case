import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const actor = {
  lucas: "66666666-6666-4666-8666-666666666666",
  amanda: "22222222-2222-4222-8222-222222222222",
  joao: "33333333-3333-4333-8333-333333333333",
};
const supplier = "44444444-4444-4444-8444-444444444444";
const headers = { "X-Demo-User-Id": actor.lucas };

async function project(request: APIRequestContext, approvers = [actor.amanda, actor.joao]) {
  const response = await request.post("/api/projects", {
    headers,
    data: { name: `Obra E2E ${randomUUID().slice(0, 8)}` },
  });
  expect(response.status()).toBe(201);
  const entity = (await response.json()).data as { id: string; name: string };
  const rules = await request.put(`/api/projects/${entity.id}/approval-rules`, {
    headers,
    data: { expectedVersion: 0, bands: [{ upperLimit: null, approverIds: approvers }] },
  });
  expect(rules.ok()).toBeTruthy();
  return entity;
}

async function selectUser(page: Page, user: string) {
  await expect(page.getByLabel("USUÁRIO DE DEMONSTRAÇÃO")).toBeEnabled();
  await page.getByLabel("USUÁRIO DE DEMONSTRAÇÃO").selectOption(user);
}

async function createFromApi(request: APIRequestContext, projectId: string) {
  const response = await request.post("/api/orders", {
    headers: { ...headers, "Idempotency-Key": randomUUID() },
    data: {
      projectId,
      supplierId: supplier,
      orderDate: "2026-10-20",
      items: [
        {
          description: "Material de teste de jornada",
          quantity: "1.000",
          unit: "un",
          unitPrice: "12500.00",
        },
      ],
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data.id as string;
}

test("cadastro com itens fracionários, bloqueio de ordem e aprovação sequencial", async ({
  page,
  request,
}) => {
  const work = await project(request);
  await page.goto("/orders/new");
  await expect(page.getByRole("heading", { name: "Novo pedido", exact: true })).toBeVisible();
  await page.getByLabel(/^Obra/).selectOption(work.id);
  await page.getByLabel(/^Fornecedor/).selectOption(supplier);
  await page.getByLabel(/^Descrição/).fill("Cimento para concretagem");
  await page.getByLabel(/^Quantidade/).fill("0,005");
  await page.getByLabel(/^Preço unitário/).fill("1,00");
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await page
    .getByLabel(/^Descrição/)
    .nth(1)
    .fill("Frete proporcional");
  await page
    .getByLabel(/^Quantidade/)
    .nth(1)
    .fill("0,005");
  await page
    .getByLabel(/^Preço unitário/)
    .nth(1)
    .fill("1,00");
  await expect(page.getByRole("button", { name: "Cadastrar pedido", exact: true })).toBeEnabled();
  await expect(page.locator(".summary-total strong")).toHaveText("R$ 0,02");
  await page.getByRole("button", { name: "Cadastrar pedido", exact: true }).click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}/);
  await expect(page.getByText("Pedido cadastrado com sucesso", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aprovar pedido", exact: true })).toBeDisabled();
  await selectUser(page, actor.joao);
  await expect(page.getByText(/Aguardando decisão de Amanda/)).toBeVisible();
  await selectUser(page, actor.amanda);
  await page.getByRole("button", { name: "Aprovar pedido", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar aprovação", exact: true }).click();
  await expect(page.getByText(/Aguardando decisão de João/)).toBeVisible();
  await selectUser(page, actor.joao);
  await page.getByRole("button", { name: "Aprovar pedido", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar aprovação", exact: true }).click();
  await expect(page.getByText(/Todas as etapas foram concluídas/)).toBeVisible();
  await expect(page.locator(".history-list li")).toHaveCount(2);
});

test("rejeição exige motivo, mantém foco e encerra o fluxo", async ({ page, request }) => {
  const work = await project(request);
  const orderId = await createFromApi(request, work.id);
  await page.goto(`/orders/${orderId}`);
  await selectUser(page, actor.amanda);
  await page.getByRole("button", { name: "Rejeitar pedido", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar rejeição", exact: true }).click();
  await expect(page.getByText("Informe um motivo de rejeição", { exact: false })).toBeVisible();
  const reason = page.getByLabel(/^Motivo da rejeição/);
  await reason.pressSequentially("Quantidade acima da necessidade", { delay: 10 });
  await expect(reason).toHaveValue("Quantidade acima da necessidade");
  await page.getByRole("button", { name: "Confirmar rejeição", exact: true }).click();
  await expect(page.getByText("O pedido foi rejeitado. O fluxo está encerrado.")).toBeVisible();
  await expect(page.locator(".history-list")).toContainText("Quantidade acima da necessidade");
  await expect(page.getByRole("button", { name: "Aprovar pedido", exact: true })).toBeDisabled();
});

test("erro de lista permite tentar novamente e filtros pessoais são do servidor", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/api/orders?**", async (route) => {
    if (fail) {
      fail = false;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "INTERNAL_ERROR", message: "Falha temporária de teste.", fieldErrors: [] },
        }),
      });
    } else await route.continue();
  });
  await page.goto("/");
  await expect(page.getByText("Falha temporária de teste.")).toBeVisible();
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(page.locator(".orders-table")).toBeVisible();
  await page.getByRole("button", { name: "Aguardando minha decisão", exact: true }).click();
  await expect(page.getByText("Nenhum pedido aguarda sua decisão", { exact: true })).toBeVisible();
  await selectUser(page, actor.amanda);
  await expect(page.locator(".orders-table")).toBeVisible();
});

test("cadastro confirmado pelo servidor com resposta perdida é recuperado sem duplicação", async ({
  page,
  request,
}) => {
  const work = await project(request);
  let createdId = "";
  let first = true;
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() === "POST" && first) {
      first = false;
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      createdId = (await response.json()).data.id;
      await route.abort("failed");
    } else await route.continue();
  });
  await page.goto("/orders/new");
  await page.getByLabel(/^Obra/).selectOption(work.id);
  await page.getByLabel(/^Fornecedor/).selectOption(supplier);
  await page.getByLabel(/^Descrição/).fill("Pedido com resposta perdida");
  await page.getByLabel(/^Preço unitário/).fill("100,00");
  await page.getByRole("button", { name: "Cadastrar pedido", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirmar envio anterior" })).toBeVisible();
  page.on("dialog", (dialog) =>
    dialog.type() === "beforeunload" ? dialog.accept() : dialog.dismiss(),
  );
  await page.getByLabel("USUÁRIO DE DEMONSTRAÇÃO").selectOption(actor.joao);
  await expect(page.getByLabel("USUÁRIO DE DEMONSTRAÇÃO")).toHaveValue(actor.lucas);
  await page.reload();
  await expect(page.getByLabel(/^Descrição/)).toHaveValue("Pedido com resposta perdida");
  await page.getByRole("button", { name: "Confirmar envio anterior" }).click();
  await expect(page).toHaveURL(new RegExp(`/orders/${createdId}`));
  const list = await request.get(`/api/orders?search=${createdId}`, { headers });
  expect((await list.json()).pagination.total).toBe(1);
});

test("editor salva faixas e ordem, preserva snapshot e permite suspender novos pedidos", async ({
  page,
  request,
}) => {
  const work = await project(request);
  const oldOrderId = await createFromApi(request, work.id);
  await page.goto("/approval-rules");
  await page.getByLabel(/^Obra/).selectOption(work.id);
  await page.getByRole("button", { name: "Mover João acima na faixa 1", exact: true }).click();
  await page.getByRole("button", { name: "Remover Amanda da faixa 1", exact: true }).click();
  await page.getByLabel(/^Adicionar aprovador à faixa 1/).selectOption(actor.lucas);
  await page.getByRole("button", { name: "Adicionar faixa de aprovação", exact: true }).click();
  await page
    .getByLabel(/^Teto da faixa \(R\$\)/)
    .first()
    .fill("10000,00");
  await page.getByLabel(/^Adicionar aprovador à faixa 1/).selectOption(actor.amanda);
  await page.getByRole("button", { name: "Salvar regras", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar e salvar", exact: true }).click();
  await expect(page.getByText("Versão salva 2", { exact: false })).toBeVisible();
  const saved = (
    await (await request.get(`/api/projects/${work.id}/approval-rules`, { headers })).json()
  ).data;
  expect(saved.bands[0].upperLimit).toBe("10000.00");
  expect(saved.bands[1].approvers.map((value: { id: string }) => value.id)).toEqual([
    actor.joao,
    actor.lucas,
  ]);
  const oldOrder = (await (await request.get(`/api/orders/${oldOrderId}`, { headers })).json())
    .data;
  expect(
    oldOrder.approval.steps.map((value: { approver: { id: string } }) => value.approver.id),
  ).toEqual([actor.amanda, actor.joao]);
  await page.getByRole("button", { name: "Remover faixa 1", exact: true }).click();
  await page.getByRole("button", { name: "Remover faixa 1", exact: true }).click();
  await page.getByRole("button", { name: "Salvar regras", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Novos pedidos desta obra serão bloqueados");
  await page.getByRole("button", { name: "Confirmar e salvar", exact: true }).click();
  await expect(page.getByText("Nenhuma alçada configurada", { exact: true })).toBeVisible();
});

test("API de pedidos rejeita query fora do contrato e erro de identidade não vaza dados", async ({
  request,
}) => {
  const missingIdentity = await request.get("/api/orders");
  expect(missingIdentity.status()).toBe(400);
  expect((await missingIdentity.json()).error.code).toBe("DEMO_USER_REQUIRED");
  const badQuery = await request.get(`/api/orders/${randomUUID()}?unexpected=1`, { headers });
  expect(badQuery.status()).toBe(400);
  const malformed = await request.post("/api/orders", {
    headers: { ...headers, "Content-Type": "application/json", "Idempotency-Key": randomUUID() },
    data: Buffer.from("{"),
  });
  expect(malformed.status()).toBe(400);
  expect((await malformed.json()).error.code).toBe("INVALID_JSON");
});

test("interface responsiva e screenshots dos fluxos reais", async ({ page, request }) => {
  await mkdir("docs/screenshots", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".orders-table")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/orders.png", fullPage: true });
  await page.goto("/orders/new");
  await expect(page.getByRole("heading", { name: "Novo pedido", exact: true })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/new-order.png", fullPage: true });
  await page.goto("/approval-rules");
  await expect(page.getByRole("heading", { name: "Regras de alçada", exact: true })).toBeVisible();
  // O editor inicia sem seleção de obra; selecionar a obra seed de referência.
  await page.getByLabel(/^Obra/).selectOption("11111111-1111-4111-8111-111111111111");
  await expect(page.getByRole("button", { name: /Salvar regras/ })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/rules.png", fullPage: true });
  const work = await project(request);
  const orderId = await createFromApi(request, work.id);
  await page.goto(`/orders/${orderId}`);
  await selectUser(page, actor.amanda);
  await expect(page.getByRole("button", { name: "Aprovar pedido", exact: true })).toBeEnabled();
  await page.screenshot({ path: "docs/screenshots/order-detail.png", fullPage: true });
  await page.goto("/");
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".orders-table")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 360, height: 900 });
  await expect(page.locator(".sidebar")).toBeHidden();
  const menu = page.getByRole("button", { name: "Abrir navegação", exact: true });
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(
    page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Aprovações", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(menu).toBeFocused();
  await page.screenshot({ path: "docs/screenshots/mobile.png", fullPage: true });
});
