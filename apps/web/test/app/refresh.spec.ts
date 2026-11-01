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

const API = "http://127.0.0.1:4100/api/v1";
let server: Server;
let database: Database;
let fixture: Fixture;
let token: string, orderId: string;

test.beforeAll(async ({ request }) => {
  database = await loadDatabase();
  server = await startServer();
  fixture = await createFixture();
  token = server.jwt.sign({ sub: fixture.admin.id });
  const configured = await request.put(`${API}/projects/${fixture.project.id}/coa`, {
    headers: { authorization: `Bearer ${token}` },
    data: { expectedCoaVersion: 0, bands: [{ upperLimit: null, approverId: fixture.users[0].id }] },
  });
  expect(configured.ok()).toBeTruthy();
  const order = await request.post(`${API}/purchase-orders`, {
    headers: { authorization: `Bearer ${server.jwt.sign({ sub: fixture.users[0].id })}` },
    data: {
      projectId: fixture.project.id,
      supplierId: fixture.supplier.id,
      orderDate: "2026-10-30",
      items: [{ description: "Refresh verification", quantity: "1", unit: "un", unitPrice: "10.00" }],
    },
  });
  expect(order.ok()).toBeTruthy();
  orderId = (await order.json()).id;
});
test.afterAll(async () => {
  await fixture?.cleanup();
  await stopApi(server, database);
});
async function enter(page: Page, path: string) {
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await signInAs(page, token);
  await page.goto(path);
}

for (const kind of ["orders", "detail", "projects", "users", "suppliers", "audit"] as const) {
  test(`${kind}: initial skeleton, stable refresh, short failure and explicit retry`, async ({ page }) => {
    const path =
      kind === "orders" ? "/purchase-orders" : kind === "detail" ? `/purchase-orders/${orderId}` : `/admin/${kind}`;
    const endpoint =
      kind === "audit"
        ? "/audit/events"
        : kind === "detail"
          ? `/purchase-orders/${orderId}`
          : kind === "orders"
            ? "/purchase-orders"
            : `/${kind}`;
    let release!: () => void;
    let gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let fail = false,
      rename = false;
    await page.route(`**/api/v1${endpoint}*`, async (route) => {
      if (new URL(route.request().url()).pathname !== `/api/v1${endpoint}`) return route.continue();
      await gate;
      if (rename && kind === "projects") {
        const response = await route.fetch();
        const result = await response.json();
        result.data = result.data.map((project: { id: string; name: string }) =>
          project.id === fixture.project.id ? { ...project, name: "Updated refresh project" } : project,
        );
        return route.fulfill({ response, json: result });
      }
      return fail
        ? route.fulfill({
            status: 503,
            json: {
              error: { code: "UNAVAILABLE", message: "Detailed server error must not replace the data", details: [] },
            },
          })
        : route.continue();
    });
    try {
      await enter(page, path);
      await expect(page.getByTestId("loading-skeleton").first()).toBeVisible();
      release();
      const label =
        kind === "users"
          ? "Atualizar usuários"
          : kind === "suppliers"
            ? "Atualizar fornecedores"
            : kind === "projects"
              ? "Atualizar obras"
              : kind === "audit"
                ? "Atualizar histórico"
                : "Atualizar";
      const idle = page.getByRole("button", { name: label, exact: true });
      await expect(idle).toBeEnabled();
      const content =
        kind === "orders"
          ? page.getByRole("region", { name: "Tabela de pedidos" })
          : kind === "detail"
            ? page.getByRole("region", { name: "Resumo do pedido" })
            : page.getByRole("list", {
                name:
                  kind === "projects"
                    ? "Obras cadastradas"
                    : kind === "users"
                      ? "Usuários"
                      : kind === "suppliers"
                        ? "Fornecedores"
                        : "Eventos de auditoria",
              });
      await expect(content).toBeVisible();
      await content.evaluate((node) => node.setAttribute("data-refresh-preserved", "yes"));
      const width = (await idle.boundingBox())!.width;
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await idle.click();
      const busy = page.getByRole("button", { name: "Atualizando...", exact: true });
      await expect(busy).toBeDisabled();
      await expect(busy).toHaveAttribute("aria-busy", "true");
      await expect(busy.locator("svg")).toHaveCSS("animation-name", /refresh-spin/);
      if (kind === "users") {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await expect(busy.locator("svg")).toHaveCSS("animation-name", "none");
      }
      expect((await busy.boundingBox())!.width).toBeCloseTo(width, 0);
      await expect(content).toHaveAttribute("data-refresh-preserved", "yes");
      await expect(page.getByTestId("loading-skeleton")).toHaveCount(0);
      release();
      await expect(idle).toBeEnabled();
      fail = true;
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await idle.click();
      await expect(busy).toBeDisabled();
      release();
      await expect(idle).toBeEnabled();
      await expect(page.getByText("Não foi possível atualizar.", { exact: true })).toHaveCount(1);
      const toast = page.locator('[data-sonner-toast][data-type="error"]');
      const colors = await toast.evaluate((node) => {
        const probe = document.createElement("span");
        probe.style.backgroundColor = "var(--error-surface)";
        node.appendChild(probe);
        const expected = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return { background: getComputedStyle(node).backgroundColor, expected };
      });
      expect(colors.background).toBe(colors.expected);
      await expect(content).toHaveAttribute("data-refresh-preserved", "yes");
      await expect(page.getByText("Detailed server error must not replace the data", { exact: true })).toHaveCount(0);
      await toast.getByRole("button", { name: "Fechar notificação", exact: true }).click();
      fail = false;
      rename = true;
      await idle.click();
      await expect(idle).toBeEnabled();
      await expect(content).toHaveAttribute("data-refresh-preserved", "yes");
      if (kind === "projects")
        await expect(content.getByRole("heading", { name: "Updated refresh project", exact: true })).toBeVisible();
    } finally {
      release();
    }
  });
}

test("order refresh waits for suppliers after the order rows finish", async ({ page }) => {
  await enter(page, "/purchase-orders");
  const idle = page.getByRole("button", { name: "Atualizar", exact: true });
  await expect(idle).toBeEnabled();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/suppliers", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    const orders = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/purchase-orders");
    await idle.click();
    await orders;
    await expect(page.getByRole("button", { name: "Atualizando...", exact: true })).toBeDisabled();
    await expect(page.getByRole("region", { name: "Tabela de pedidos" })).toBeVisible();
    release();
    await expect(idle).toBeEnabled();
  } finally {
    release();
  }
});

test("member refresh retains rows and waits for the user directory too", async ({ page }) => {
  await enter(page, `/admin/projects/${fixture.project.id}?dialog=members`);
  const dialog = page.getByRole("dialog");
  const idle = dialog.getByRole("button", { name: "Atualizar membros", exact: true });
  await expect(idle).toBeEnabled();
  const rows = dialog.getByRole("list", { name: "Membros da obra" });
  await rows.evaluate((node) => node.setAttribute("data-refresh-preserved", "yes"));
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/users", async (route) => {
    await gate;
    await route.fulfill({
      status: 503,
      json: { error: { code: "UNAVAILABLE", message: "Directory unavailable", details: [] } },
    });
  });
  try {
    const members = page.waitForResponse((response) =>
      response.url().endsWith(`/projects/${fixture.project.id}/members`),
    );
    await idle.click();
    await members;
    await expect(dialog.getByRole("button", { name: "Atualizando...", exact: true })).toBeDisabled();
    await expect(rows).toHaveAttribute("data-refresh-preserved", "yes");
    await expect(dialog.getByTestId("loading-skeleton")).toHaveCount(0);
    release();
    await expect(idle).toBeEnabled();
    await expect(page.getByText("Não foi possível atualizar.", { exact: true })).toBeVisible();
    await expect(rows).toHaveAttribute("data-refresh-preserved", "yes");
  } finally {
    release();
  }
});

test("preview retry stays busy until both reads finish and preserves form input", async ({ page }) => {
  let fail = true;
  await page.route(`**/projects/${fixture.project.id}/coa`, (route) =>
    fail
      ? route.fulfill({
          status: 503,
          json: { error: { code: "UNAVAILABLE", message: "Preview unavailable", details: [] } },
        })
      : route.continue(),
  );
  // A real member can create; ADMIN broad reads do not imply membership.
  await page.addInitScript(
    (value) => sessionStorage.setItem("obraflow.accessToken", value),
    server.jwt.sign({ sub: fixture.users[0].id }),
  );
  await page.goto("/purchase-orders/new");
  const form = page.getByRole("form", { name: "Novo pedido", exact: true });
  await selectOption(form.getByLabel("Obra", { exact: true }), fixture.project.id);
  await form.getByLabel("Descrição", { exact: true }).fill("Retained item");
  const idle = form.getByRole("button", { name: "Atualizar prévia", exact: true });
  await expect(idle).toBeEnabled();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/projects/${fixture.project.id}/members`, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    const failed = page.waitForResponse((response) => response.url().endsWith(`/projects/${fixture.project.id}/coa`));
    await idle.click();
    await failed;
    await expect(form.getByRole("button", { name: "Atualizando...", exact: true })).toBeDisabled();
    await expect(form.getByLabel("Descrição", { exact: true })).toHaveValue("Retained item");
    release();
    await expect(idle).toBeEnabled();
    await expect(page.getByText("Não foi possível atualizar.", { exact: true })).toBeVisible();
    fail = false;
    await idle.click();
    await expect(form.getByText("Alçada versão 1", { exact: false })).toBeVisible();
    await expect(form.getByLabel("Descrição", { exact: true })).toHaveValue("Retained item");
  } finally {
    release();
  }
});
