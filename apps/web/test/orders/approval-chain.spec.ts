import { test, expect, type Page, type Locator } from "@playwright/test";
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
let f: Fixture;
let tokens: string[];

test.beforeAll(async ({ request }) => {
  database = await loadDatabase();
  server = await startServer();
  f = await createFixture();
  tokens = f.users.map((user) => server.jwt.sign({ sub: user.id }));
  const headers = { authorization: `Bearer ${server.jwt.sign({ sub: f.admin.id })}` };
  expect(
    (
      await request.post(`${API}/projects/${f.project.id}/members`, { headers, data: { userId: f.users[2].id } })
    ).status(),
  ).toBe(201);
  expect(
    (
      await request.put(`${API}/projects/${f.project.id}/coa`, {
        headers,
        data: {
          expectedCoaVersion: 0,
          bands: f.users.map((user, i) => ({ approverId: user.id, upperLimit: i === 2 ? null : `${i + 1}.00` })),
        },
      })
    ).status(),
  ).toBe(200);
});
test.afterAll(async () => {
  if (f) await f.cleanup();
  await stopApi(server, database);
});

async function enter(page: Page) {
  await page.addInitScript((token) => sessionStorage.setItem("obraflow.accessToken", token), tokens[0]);
  await page.goto(`/purchase-orders?projectId=${f.project.id}`);
}

async function expectChain(chain: Locator, labels: string[]) {
  await expect(chain.getByRole("listitem")).toHaveCount(labels.length);
  for (const [index, label] of labels.entries()) {
    const step = chain.getByRole("listitem").nth(index);
    await expect(step).toHaveAttribute("aria-label", label);
    const node = step.locator('span[aria-hidden="true"]');
    if (label.includes("Futura")) await expect(node).toHaveText(String(index + 1));
    else await expect(node.locator("svg")).toBeVisible();
  }
}

for (const outcome of ["APPROVED", "REJECTED"] as const) {
  test(`list shows the complete ${outcome.toLowerCase()} chain on desktop and mobile`, async ({ page, request }) => {
    const created = await request.post(`${API}/purchase-orders`, {
      headers: { authorization: `Bearer ${tokens[0]}` },
      data: {
        projectId: f.project.id,
        supplierId: f.supplier.id,
        orderDate: "2026-10-22",
        items: [{ description: "Materiais", quantity: "1", unit: "un", unitPrice: "3.00" }],
      },
    });
    expect(created.status()).toBe(201);
    const order = await created.json();
    async function decide(index: number, decision: "APPROVED" | "REJECTED") {
      expect(
        (
          await request.post(`${API}/purchase-orders/${order.id}/decisions`, {
            headers: { authorization: `Bearer ${tokens[index]}` },
            data: {
              expectedStepIndex: index,
              decision,
              ...(decision === "REJECTED" ? { reason: "Rever orçamento" } : {}),
            },
          })
        ).status(),
      ).toBe(200);
    }
    await enter(page);
    const row = page
      .getByRole("row")
      .filter({ has: page.getByRole("link", { name: `Abrir pedido ${order.id.slice(0, 8)}` }) });
    const chain = row.getByRole("list", { name: "Cadeia de aprovação" });
    await expectChain(chain, ["Approver 0 · Atual", "Approver 1 · Futura", "Approver 2 · Futura"]);
    await expect(chain.locator('[aria-current="step"]')).toHaveAttribute("aria-label", "Approver 0 · Atual");
    await decide(0, "APPROVED");
    await page.getByRole("button", { name: "Atualizar", exact: true }).click();
    await expectChain(chain, ["Approver 0 · Aprovou", "Approver 1 · Atual", "Approver 2 · Futura"]);
    await page.setViewportSize({ width: 390, height: 844 });
    const card = page
      .getByRole("article")
      .filter({ has: page.getByRole("link", { name: `Pedido #${order.id.slice(0, 8)}` }) });
    await expectChain(card.getByRole("list", { name: "Cadeia de aprovação" }), [
      "Approver 0 · Aprovou",
      "Approver 1 · Atual",
      "Approver 2 · Futura",
    ]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
    await decide(1, outcome);
    if (outcome === "APPROVED") await decide(2, "APPROVED");
    await page.getByRole("button", { name: "Atualizar", exact: true }).click();
    const labels =
      outcome === "APPROVED"
        ? ["Approver 0 · Aprovou", "Approver 1 · Aprovou", "Approver 2 · Aprovou"]
        : ["Approver 0 · Aprovou", "Approver 1 · Rejeitou", "Approver 2 · Futura · Não executada após rejeição"];
    await expectChain(chain, labels);
    await expect(chain.locator('[aria-current="step"]')).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expectChain(card.getByRole("list", { name: "Cadeia de aprovação" }), labels);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
