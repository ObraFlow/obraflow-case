import { openFilters } from "../support/filters";
import { test, expect, type Page } from "@playwright/test";
import { selectOption } from "../support/select";
import {
  createFixture,
  loadDatabase,
  startServer,
  stopApi,
  type Database,
  type Fixture,
  type Server,
} from "../support/api";
import { signInAs } from "../support/session";

let server: Server;
let database: Database;
let f: Fixture;
let token: string;
test.beforeAll(async () => {
  database = await loadDatabase();
  server = await startServer();
});
test.beforeEach(async () => {
  f = await createFixture();
  token = server.jwt.sign({ sub: f.admin.id });
  const configured = await server.inject({
    method: "PUT",
    url: `/api/v1/projects/${f.project.id}/coa`,
    headers: { authorization: `Bearer ${token}` },
    payload: { expectedCoaVersion: 0, bands: [{ upperLimit: null, approverId: f.users[0].id }] },
  });
  expect(configured.statusCode).toBe(200);
});
test.afterEach(async () => {
  await f?.cleanup();
});
test.afterAll(async () => {
  await stopApi(server, database);
});
async function enter(page: Page, path = `/admin/projects/${f.project.id}`, as = token) {
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await signInAs(page, as);
  await page.goto(path);
}
async function createOrder() {
  const response = await server.inject({
    method: "POST",
    url: "/api/v1/purchase-orders",
    headers: { authorization: `Bearer ${server.jwt.sign({ sub: f.users[0].id })}` },
    payload: {
      projectId: f.project.id,
      supplierId: f.supplier.id,
      orderDate: "2026-10-30",
      items: [{ description: "Material preservado", quantity: "1", unit: "un", unitPrice: "100.00" }],
    },
  });
  expect(response.statusCode).toBe(201);
  return response.json();
}
async function decide(id: string) {
  const response = await server.inject({
    method: "POST",
    url: `/api/v1/purchase-orders/${id}/decisions`,
    headers: { authorization: `Bearer ${server.jwt.sign({ sub: f.users[0].id })}` },
    payload: { expectedStepIndex: 0, decision: "APPROVED" },
  });
  expect(response.statusCode).toBe(200);
}

for (const width of [1440, 390])
  test(`rename, archive, historical reads and reactivation at ${width}px`, async ({ page }) => {
    const order = await createOrder();
    await decide(order.id);
    await page.setViewportSize({ width, height: 844 });
    await enter(page);
    await page.getByRole("button", { name: "Renomear obra", exact: true }).click();
    const rename = page.getByRole("dialog", { name: "Renomear obra", exact: true });
    await rename.getByLabel("Nome da obra", { exact: true }).fill("  ");
    await rename.getByRole("button", { name: "Salvar nome" }).click();
    await expect(rename.getByText("Informe o nome da obra.", { exact: true })).toBeVisible();
    const name = `Obra corrigida ${f.project.id}`;
    await rename.getByLabel("Nome da obra", { exact: true }).fill(name);
    await rename.getByRole("button", { name: "Salvar nome" }).click();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/admin/projects/${f.project.id}$`));
    await page.getByRole("button", { name: "Arquivar obra", exact: true }).click();
    let archive = page.getByRole("dialog", { name: "Arquivar obra", exact: true });
    await archive.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Reativar obra", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Arquivar obra", exact: true }).click();
    archive = page.getByRole("dialog", { name: "Arquivar obra", exact: true });
    await archive.getByRole("button", { name: "Confirmar arquivamento" }).click();
    await expect(page.getByRole("button", { name: "Reativar obra", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Renomear obra", exact: true })).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "Obra arquivada ·" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Editar", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Gerenciar membros", exact: true })).toBeDisabled();
    await expect(page.getByRole("heading", { name: "Membros da obra", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Versões da alçada", exact: true }).click();
    await expect(page.getByRole("region", { name: "Versão 1", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Voltar às obras" }).click();
    await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(0);
    await openFilters(page);
    await selectOption(page.getByLabel("Situação", { exact: true }), "archived");
    const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });
    await expect(card.getByText("Arquivada", { exact: true })).toBeVisible();
    await selectOption(page.getByLabel("Situação", { exact: true }), "all");
    await card.getByRole("link").click();
    await page.getByRole("button", { name: "Reativar obra", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar reativação" }).click();
    await expect(page.getByRole("button", { name: "Arquivar obra", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Renomear obra", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Gerenciar membros", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Editar", exact: true })).toBeEnabled();
    await page.goto(`/purchase-orders/${order.id}`);
    await expect(page.getByText("Material preservado", { exact: true }).filter({ visible: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

test("pending orders explain archive conflicts, then allow archive after normal completion", async ({ page }) => {
  const order = await createOrder();
  await enter(page);
  await page.getByRole("button", { name: "Arquivar obra", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Arquivar obra", exact: true });
  await dialog.getByRole("button", { name: "Confirmar arquivamento" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Conclua as aprovações ou rejeições");
  await decide(order.id);
  await dialog.getByRole("button", { name: "Confirmar arquivamento" }).click();
  await expect(page.getByRole("button", { name: "Reativar obra", exact: true })).toBeVisible();
  await page.goto(`/purchase-orders/${order.id}`);
  await expect(page.getByText("Material preservado", { exact: true }).filter({ visible: true })).toBeVisible();
});

for (const role of ["ADMIN", "USER"] as const)
  test(`archived projects retain history and restore PO eligibility after reactivation for ${role}`, async ({
    page,
  }) => {
    const order = await createOrder();
    await decide(order.id);
    await server.inject({
      method: "POST",
      url: `/api/v1/projects/${f.project.id}/members`,
      headers: { authorization: `Bearer ${token}` },
      payload: { userId: f.admin.id },
    });
    await server.inject({
      method: "POST",
      url: `/api/v1/projects/${f.project.id}/archive`,
      headers: { authorization: `Bearer ${token}` },
    });
    const identity = role === "ADMIN" ? f.admin : f.users[0];
    await enter(page, "/purchase-orders", server.jwt.sign({ sub: identity.id }));
    await selectOption(page.getByLabel("Obra", { exact: true }), f.project.id);
    await expect(page.getByText(f.project.name, { exact: true }).first()).toBeVisible();
    const create = page.getByRole("button", { name: "Novo pedido", exact: true });
    if (role === "USER") await expect(create).toBeDisabled();
    else {
      // Seeded ADMIN also belongs to other active projects; only this archived
      // project must leave the selector, without suppressing eligible purchases.
      await create.click();
      await page.getByLabel("Obra", { exact: true }).click();
      await expect(page.getByRole("option", { name: f.project.name, exact: true })).toHaveCount(0);
      await page.keyboard.press("Escape");
    }
    await page.goto(`/purchase-orders/${order.id}`);
    await expect(page.getByText("Material preservado", { exact: true }).filter({ visible: true })).toBeVisible();
    const response = await server.inject({
      method: "POST",
      url: `/api/v1/projects/${f.project.id}/reactivate`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    await page.goto("/purchase-orders");
    await page.getByRole("button", { name: "Novo pedido", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Novo pedido", exact: true })).toBeVisible();
    await page.getByLabel("Obra", { exact: true }).click();
    await expect(page.getByRole("option", { name: f.project.name, exact: true })).toBeVisible();
  });

test("lost rename response preserves draft and reconciles without replaying the write", async ({ page }) => {
  await enter(page);
  let writes = 0;
  await page.route(`**/api/v1/projects/${f.project.id}`, async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    writes++;
    await route.fetch();
    return route.fulfill({
      status: 503,
      json: { error: { code: "LOST", message: "Resposta indisponível.", details: [] } },
    });
  });
  await page.getByRole("button", { name: "Renomear obra", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Renomear obra", exact: true });
  await dialog.getByLabel("Nome da obra", { exact: true }).fill("Nome confirmado no servidor");
  await dialog.getByRole("button", { name: "Salvar nome" }).click();
  await expect(dialog.getByText(/Resultado incerto/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Salvar nome" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Renomear obra", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Renomear obra", exact: true });
  await expect(dialog.getByLabel("Nome da obra", { exact: true })).toHaveValue("Nome confirmado no servidor");
  await dialog.getByRole("button", { name: "Consultar estado atual da obra" }).click();
  await expect(page.getByRole("heading", { name: "Nome confirmado no servidor", exact: true })).toBeVisible();
  expect(writes).toBe(1);
});

test("pending archive blocks dismissal and repeat writes until the authoritative response", async ({ page }) => {
  await enter(page);
  let release!: () => void,
    writes = 0;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/v1/projects/${f.project.id}/archive`, async (route) => {
    writes++;
    await held;
    return route.continue();
  });
  await page.getByRole("button", { name: "Arquivar obra", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Arquivar obra", exact: true });
  try {
    await dialog.getByRole("button", { name: "Confirmar arquivamento" }).click();
    await expect(dialog.getByRole("button", { name: "Salvando…" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Cancelar", exact: true })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    expect(writes).toBe(1);
  } finally {
    release();
  }
  await expect(page.getByRole("button", { name: "Reativar obra", exact: true })).toBeVisible();
  expect(writes).toBe(1);
});
