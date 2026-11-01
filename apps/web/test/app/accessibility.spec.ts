import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page, type TestInfo } from "@playwright/test";
import {
  createFixture,
  loadDatabase,
  startServer,
  stopApi,
  type Database,
  type Fixture,
  type Server,
} from "../support/api";

const API = "http://127.0.0.1:4100/api/v1";
let server: Server;
let database: Database;
let fixture: Fixture;
let userToken: string, adminToken: string, orderId: string;

test.beforeAll(async ({ request }) => {
  database = await loadDatabase();
  server = await startServer();
  fixture = await createFixture();
  userToken = server.jwt.sign({ sub: fixture.users[0].id });
  adminToken = server.jwt.sign({ sub: fixture.admin.id });
  const configured = await request.put(`${API}/projects/${fixture.project.id}/coa`, {
    headers: { authorization: `Bearer ${adminToken}` },
    data: {
      expectedCoaVersion: 0,
      bands: [
        { upperLimit: "10000.00", approverId: fixture.users[0].id },
        { upperLimit: null, approverId: fixture.users[1].id },
      ],
    },
  });
  expect(configured.status()).toBe(200);
  const created = await request.post(`${API}/purchase-orders`, {
    headers: { authorization: `Bearer ${userToken}` },
    data: {
      projectId: fixture.project.id,
      supplierId: fixture.supplier.id,
      orderDate: "2026-10-29",
      items: [
        { description: "Materiais para inspeção de acessibilidade", quantity: "1", unit: "lote", unitPrice: "50.00" },
      ],
    },
  });
  expect(created.status()).toBe(201);
  orderId = (await created.json()).id;
});

test.afterAll(async () => {
  if (fixture) await fixture.cleanup();
  await stopApi(server, database);
});

async function scan(page: Page, info: TestInfo, surface: string) {
  await page.evaluate(() => document.fonts.ready);
  // Check the complete document, including portaled dialogs and the shell.
  // There are no excluded elements or disabled rules in this initial gate.
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  if (result.violations.length)
    await info.attach(`${surface}-axe`, {
      body: JSON.stringify(result.violations, null, 2),
      contentType: "application/json",
    });
  expect.soft(result.violations, `${surface}: automated WCAG A/AA findings`).toEqual([]);
}

for (const [width, colorScheme] of [
  [1440, "light"],
  [1440, "dark"],
  [320, "light"],
  [390, "dark"],
] as const) {
  test(`critical surfaces have no automated accessibility violations at ${width}px/${colorScheme}`, async ({
    page,
  }, info) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.route("https://i.pravatar.cc/**", (route) => route.abort());
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
    await scan(page, info, "login");
    await page.getByRole("button", { name: /Explore o fluxo de aprovação/ }).click();
    await expect(page.getByRole("heading", { name: "Escolha uma persona", exact: true })).toBeVisible();
    await scan(page, info, "demo-picker");
    await page.getByRole("button", { name: /Entrar com usuário e senha/ }).click();

    await page.evaluate((token) => sessionStorage.setItem("obraflow.accessToken", token), userToken);
    await page.goto(`/purchase-orders?projectId=${fixture.project.id}`);
    // Desktop uses an explicit open link; mobile exposes the whole summary card.
    await expect(page.locator(`a[href="/purchase-orders/${orderId}"]:visible`)).toBeVisible();
    await scan(page, info, "orders");
    await page.goto(`/purchase-orders/${orderId}`);
    await expect(page.getByRole("button", { name: "Aprovar", exact: true })).toBeEnabled();
    await scan(page, info, "order-detail");
    await page.goto("/purchase-orders/new");
    await expect(page.getByRole("form", { name: "Novo pedido", exact: true })).toBeVisible();
    await scan(page, info, "new-order");

    await page.evaluate((token) => sessionStorage.setItem("obraflow.accessToken", token), adminToken);
    await page.goto(`/admin/projects/${fixture.project.id}`);
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await expect(page.getByRole("slider")).toBeVisible();
    await scan(page, info, "coa-editor");
    await page
      .getByRole("button", { name: `Editar limite após ${fixture.users[0].displayName}`, exact: false })
      .click();
    await expect(page.getByRole("dialog", { name: "Editar limite", exact: true })).toBeVisible();
    await scan(page, info, "coa-amount-dialog");
  });
}
