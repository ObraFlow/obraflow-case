import { confirmSave } from "../support/save-confirmation";
import { closeSelect, selectOption } from "../support/select";
import { openAccount } from "../support/account";
import { test, expect, type Page } from "@playwright/test";
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
let f: Fixture;
let token: string;
let adminToken: string;

test.beforeAll(async () => {
  database = await loadDatabase();
  server = await startServer();
});
test.beforeEach(async ({ request }) => {
  f = await createFixture();
  token = server.jwt.sign({ sub: f.users[0].id });
  adminToken = server.jwt.sign({ sub: f.admin.id });
  const response = await request.put(`${API}/projects/${f.project.id}/coa`, {
    headers: { authorization: `Bearer ${adminToken}` },
    data: {
      expectedCoaVersion: 0,
      bands: [
        { upperLimit: "10000.00", approverId: f.users[0].id },
        { upperLimit: null, approverId: f.users[1].id },
      ],
    },
  });
  expect(response.status()).toBe(200);
});
test.afterEach(async () => {
  if (f) await f.cleanup();
});
test.afterAll(async () => {
  await stopApi(server, database);
});

async function enter(page: Page, identity = token, url = "/purchase-orders/new") {
  await signInAs(page, identity);
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Novo pedido", exact: true })).toBeVisible();
}
async function fill(page: Page, quantity = "0.005", price = "1.00") {
  // The list also has an Obra select. Wait for creation mode before touching it.
  await expect(page.getByRole("heading", { name: "Novo pedido", exact: true })).toBeVisible();
  await selectOption(
    page.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Obra", { exact: true }),
    f.project.id,
  );
  await selectOption(
    page.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Fornecedor", { exact: true }),
    f.supplier.id,
  );
  await page.getByLabel("Data do pedido", { exact: true }).fill("2026-10-22");
  const item = page.getByRole("group", { name: "Item 1", exact: true });
  await item.getByLabel("Descrição", { exact: true }).fill("Material preciso");
  await item.getByLabel("Quantidade", { exact: true }).fill(quantity);
  await item.getByLabel("Unidade", { exact: true }).fill("un");
  await item.getByLabel("Preço unitário (R$)", { exact: true }).fill(price);
}
async function countOrders() {
  const [row] = await database.query("SELECT count(*)::int AS count FROM purchase_orders WHERE project_id=$1", [
    f.project.id,
  ]);
  return row.count as number;
}

for (const quantity of ["1,5", "1.5"])
  test(`localized quantity ${quantity} submits an exact canonical decimal`, async ({ page, request }) => {
    await enter(page);
    await fill(page, quantity, "1234.56");
    await expect(page.getByRole("region", { name: "Resumo do envio" })).toContainText("1.851,84");
    const sent = page.waitForRequest(
      (request) => request.method() === "POST" && request.url().endsWith("/purchase-orders"),
    );
    await page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true }).click();
    await confirmSave(page);
    expect((await sent).postDataJSON().items[0]).toMatchObject({ quantity: "1.5", unitPrice: "1234.56" });
    await expect(page).toHaveURL(/\/purchase-orders\/[0-9a-f-]+$/);
    const response = await request.get(`${API}/purchase-orders/${page.url().split("/").at(-1)}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const order = await response.json();
    expect(order.total).toBe("1851.84");
    expect(order.items[0].quantity).toBe("1.500");
  });

for (const corruption of ["identity", "json"] as const)
  test(`committed creation with malformed ${corruption} response keeps recovery guard`, async ({ page }) => {
    await enter(page);
    await fill(page);
    let writes = 0;
    await page.route("**/api/v1/purchase-orders", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      writes++;
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      const order = await response.json();
      if (corruption === "json") return route.fulfill({ response, body: "{broken" });
      await route.fulfill({
        response,
        json: { ...order, projectId: f.admin.id, project: { ...order.project, id: f.admin.id } },
      });
    });
    await page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true }).click();
    await confirmSave(page);
    await expect(page.getByText("O pedido pode ter sido criado.", { exact: false })).toBeVisible();
    await expect(page).toHaveURL(/\/purchase-orders\/new$/);
    await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("Material preciso");
    await expect(page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true })).toBeDisabled();
    expect(await countOrders()).toBe(1);
    await page.reload();
    await expect(page.getByText("O pedido pode ter sido criado.", { exact: false })).toBeVisible();
    await page.route("**/api/v1/purchase-orders?**", (route) => route.fulfill({ status: 200, json: {} }));
    await page.getByRole("button", { name: "Atualizar e liberar novo envio" }).click();
    await expect(page.getByText("Não foi possível atualizar a consulta.", { exact: false })).toBeVisible();
    await expect(page.getByText("O pedido pode ter sido criado.", { exact: false })).toBeVisible();
    await page.unroute("**/api/v1/purchase-orders?**");
    await page.getByRole("button", { name: "Atualizar e liberar novo envio" }).click();
    await expect(page.getByText("O pedido pode ter sido criado.", { exact: false })).toHaveCount(0);
    expect(writes).toBe(1);
    expect(await countOrders()).toBe(1);
  });

test("live cumulative preview uses inclusive cents and the server still snapshots a later publication", async ({
  page,
  request,
}) => {
  await enter(page);
  await fill(page, "1", "10000.00");
  const preview = page.getByRole("region", { name: "Prévia da aprovação", exact: true });
  await expect(preview).toContainText("Alçada versão 1");
  await expect(preview.getByRole("listitem")).toHaveCount(1);
  await page.getByLabel("Preço unitário (R$)", { exact: true }).fill("10000.01");
  await expect(preview.getByRole("listitem")).toHaveCount(2);
  await expect(preview).toContainText(f.users[0].displayName);
  await expect(preview).toContainText(f.users[1].displayName);
  await page.getByLabel("Preço unitário (R$)", { exact: true }).fill("10000.001");
  await expect(preview.getByRole("listitem")).toHaveCount(0);
  await page.getByLabel("Preço unitário (R$)", { exact: true }).fill("10000.01");
  await page
    .getByRole("form", { name: "Novo pedido", exact: true })
    .getByRole("button", { name: "Cadastrar pedido", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByRole("dialog", { name: "Cadastrar pedido", exact: true })).toContainText("Alçada versão 1");
  const changed = await request.put(`${API}/projects/${f.project.id}/coa`, {
    headers: { authorization: `Bearer ${adminToken}` },
    data: { expectedCoaVersion: 1, bands: [{ upperLimit: null, approverId: f.users[1].id }] },
  });
  expect(changed.status()).toBe(200);
  await confirmSave(page);
  await expect(page).toHaveURL(/\/purchase-orders\/[0-9a-f-]+$/);
  const saved = await (
    await request.get(`${API}/purchase-orders/${page.url().split("/").at(-1)}`, {
      headers: { authorization: `Bearer ${token}` },
    })
  ).json();
  expect(saved.coaVersion).toBe(2);
  expect(saved.total).toBe("10000.01");
  expect(saved.steps.map((step: { approverId: string }) => step.approverId)).toEqual([f.users[1].id]);
});

test("legacy links keep list context; dirty navigation discards without blocking", async ({ page }) => {
  await enter(page, token, `/purchase-orders?projectId=${f.project.id}&status=PENDING&page=2&mode=create`);
  await expect(page).toHaveURL(/\/purchase-orders\/new\?/);
  await expect(page).not.toHaveURL(/mode=create/);
  await fill(page, "2", "25.00");
  await page.getByRole("button", { name: "Calendário da data do pedido", exact: true }).click();
  const calendar = page.getByRole("dialog", { name: "Calendário da data do pedido", exact: true });
  await expect(calendar.locator('[data-date="2026-10-22"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(calendar).toHaveCount(0);
  await page.getByLabel("Observações (opcional)").fill("Rascunho preservado");
  await page.getByRole("button", { name: "Voltar aos pedidos", exact: true }).click();
  await expect(page).toHaveURL(`/purchase-orders?projectId=${f.project.id}&status=PENDING&page=2`);
  await page.getByRole("button", { name: "Novo pedido", exact: true }).click();
  await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("");
  expect(await countOrders()).toBe(0);
});

test("refresh after an accepted POST preserves uncertain-outcome recovery", async ({ page }) => {
  await enter(page);
  await fill(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route("**/api/v1/purchase-orders", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    writes++;
    await route.fetch(); // The real server commits before the browser receives a response.
    await held;
    await route.abort().catch(() => {}); // Reload may already have detached this request.
  });
  await page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true }).click();
  await confirmSave(page);
  try {
    await expect.poll(countOrders).toBe(1);
    page.on("dialog", (dialog) => void dialog.accept());
    await page.reload();
    await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("");
    await expect(page.getByText("O pedido pode ter sido criado.", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Consultar pedidos em outra aba" })).toHaveAttribute(
      "href",
      `/purchase-orders?projectId=${f.project.id}`,
    );
    await fill(page);
    await expect(page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true })).toBeDisabled();
    expect(writes).toBe(1);
  } finally {
    release();
  }
});

test("unavailable submission storage prevents the POST and preserves the form", async ({ page }) => {
  await enter(page);
  await fill(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("obraflow.purchaseOrderSubmission.")) throw new Error("Storage unavailable");
      original.call(this, key, value);
    };
  });
  let writes = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/purchase-orders")) writes++;
  });
  await page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true }).click();
  await confirmSave(page);
  await expect(page.getByText("Nenhum pedido foi enviado.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("Material preciso");
  expect(writes).toBe(0);
  expect(await countOrders()).toBe(0);
});

for (const outcome of ["success", "uncertain", "rejected"] as const)
  test(`pending POST survives Back and reentry: ${outcome}`, async ({ page }) => {
    if (outcome === "success") {
      await page.setViewportSize({ width: 320, height: 667 });
      await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    }
    await signInAs(page, token);
    await page.goto(`/purchase-orders?projectId=${f.project.id}`);
    await page.getByRole("button", { name: "Novo pedido", exact: true }).click();
    await fill(page);
    let release!: () => void,
      writes = 0;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/v1/purchase-orders", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      writes++;
      const response = outcome !== "rejected" ? await route.fetch() : null;
      await held;
      if (outcome === "success") return route.fulfill({ response: response! });
      return route.fulfill({
        status: outcome === "uncertain" ? 503 : 409,
        json: { error: { code: "UNAVAILABLE", message: "Resposta indisponível.", details: [] } },
      });
    });
    await page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true }).click();
    await confirmSave(page);
    try {
      await expect(page.getByRole("button", { name: "Enviando pedido…", exact: true })).toBeDisabled();
      const dialog = page.getByRole("dialog", { name: "Cadastrar pedido", exact: true });
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Fechar", exact: true })).toHaveCount(0);
      await page.goBack();
      await expect(page).toHaveURL(`/purchase-orders?projectId=${f.project.id}`);
      await page.getByRole("button", { name: "Novo pedido", exact: true }).click();
      await expect(page.getByText("Envio em andamento.", { exact: false })).toBeVisible();
      await expect(page.getByLabel("Descrição", { exact: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Atualizar e liberar novo envio" })).toHaveCount(0);
      await page
        .getByRole("form")
        .evaluate((form) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
      expect(writes).toBe(1);
    } finally {
      release();
    }
    await expect(page.getByText("Envio em andamento.", { exact: false })).toHaveCount(0);
    await expect(page).toHaveURL(/\/purchase-orders\/new$/); // No redirect from an unmounted form.
    await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("");
    if (outcome === "uncertain") {
      await expect(page.getByText("O pedido pode ter sido criado.", { exact: false })).toBeVisible();
      await page.reload();
      await fill(page);
      await expect(
        page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true }),
      ).toBeDisabled();
      await page.getByRole("button", { name: "Atualizar e liberar novo envio" }).click();
      await expect(page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true })).toBeEnabled();
    } else {
      await expect(page.getByText("O pedido pode ter sido criado.", { exact: false })).toHaveCount(0);
      await fill(page);
      await expect(page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true })).toBeEnabled();
    }
    expect(writes).toBe(1);
    expect(await countOrders()).toBe(outcome === "rejected" ? 0 : 1);
    // Live action-required hints are separate from confirmed creation feedback.
    const toast = page.locator('[data-sonner-toast][data-type="success"]');
    if (outcome === "success") {
      await expect(toast).toHaveCount(1);
      await expect(toast).toContainText("Pedido cadastrado");
      await expect(toast).toContainText(f.project.name);
      const box = (await toast.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(667);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await toast.getByRole("button", { name: "Ver pedido", exact: true }).click();
      await expect(page).toHaveURL(/\/purchase-orders\/[0-9a-f-]+$/);
    } else await expect(toast).toHaveCount(0);
  });

for (const departure of ["logout"] as const)
  test(`late purchase success cannot notify after ${departure}`, async ({ page }) => {
    await signInAs(page, token);
    await page.goto("/purchase-orders");
    await page.getByRole("button", { name: "Novo pedido", exact: true }).click();
    await fill(page);
    let release!: () => void, complete!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const completed = new Promise<void>((resolve) => {
      complete = resolve;
    });
    await page.route("**/api/v1/purchase-orders", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const response = await route.fetch();
      await held;
      await route.fulfill({ response });
      complete();
    });
    await page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true }).click();
    await confirmSave(page);
    try {
      await expect.poll(countOrders).toBe(1);
      await page.goBack();
      await openAccount(page);
      if (departure === "logout") {
        await page.getByRole("button", { name: "Logout", exact: true }).click();
        await expect(page).toHaveURL(/\/login$/);
      } else {
        await page.getByRole("button", { name: "Trocar perfil", exact: true }).click();
        await page
          .getByRole("dialog", { name: "Trocar perfil", exact: true })
          .getByRole("button", { name: "Entrar como Beatriz", exact: false })
          .click();
        await expect(page.getByRole("complementary", { name: "Menu lateral" })).toContainText("Beatriz");
      }
    } finally {
      release();
    }
    await completed;
    // Wait until the response continuation has settled the original user's marker.
    await expect
      .poll(() =>
        page.evaluate((id) => sessionStorage.getItem(`obraflow.purchaseOrderSubmission.${id}`), f.users[0].id),
      )
      .toBeNull();
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ver pedido", exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(departure === "logout" ? /\/login$/ : /\/purchase-orders$/);
  });

test("dedicated-page creation rounds each line, submits once and displays the persisted snapshot", async ({
  page,
  request,
}) => {
  await signInAs(page, token);
  await page.goto(`/purchase-orders?projectId=${f.project.id}&status=PENDING`);
  await page.getByRole("button", { name: "Novo pedido", exact: true }).click();
  await expect(page).toHaveURL(/\/purchase-orders\/new/);
  await fill(page);
  await page.getByLabel("Observações (opcional)").fill("Entrega no almoxarifado.");
  await page.getByRole("button", { name: "Adicionar item" }).click();
  const second = page.getByRole("group", { name: "Item 2", exact: true });
  await second.getByLabel("Descrição", { exact: true }).fill("Segundo material");
  await second.getByLabel("Quantidade", { exact: true }).fill("0.005");
  await second.getByLabel("Unidade", { exact: true }).fill("kg");
  await second.getByLabel("Preço unitário (R$)", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await page.getByRole("button", { name: "Remover item 3" }).click();
  await expect(page.getByRole("region", { name: "Resumo do envio" })).toContainText("0,02");
  const submissions: unknown[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().endsWith("/purchase-orders")) submissions.push(req.postDataJSON());
  });
  await page
    .getByRole("form", { name: "Novo pedido", exact: true })
    .getByRole("button", { name: "Cadastrar pedido", exact: true })
    .click();
  await expect(page.getByRole("dialog", { name: "Cadastrar pedido", exact: true })).toContainText("2");
  await expect(page.getByRole("dialog", { name: "Cadastrar pedido", exact: true })).toContainText("R$ 0,02");
  await page
    .getByRole("dialog", { name: "Cadastrar pedido", exact: true })
    .getByRole("button", { name: "Cadastrar pedido", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(page).toHaveURL(/\/purchase-orders\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: /Pedido #/ })).toBeVisible();
  expect(submissions).toHaveLength(1);
  await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0); // Detail confirms creation; a live action hint may also arrive.
  expect(submissions[0]).toEqual({
    projectId: f.project.id,
    supplierId: f.supplier.id,
    orderDate: "2026-10-22",
    notes: "Entrega no almoxarifado.",
    items: [
      { description: "Material preciso", quantity: "0.005", unit: "un", unitPrice: "1.00" },
      { description: "Segundo material", quantity: "0.005", unit: "kg", unitPrice: "1" },
    ],
  });
  const id = page.url().split("/").at(-1);
  const saved = await request.get(`${API}/purchase-orders/${id}`, { headers: { authorization: `Bearer ${token}` } });
  const order = await saved.json();
  expect(order.total).toBe("0.02");
  expect(order.items.map((item: { lineTotal: string }) => item.lineTotal)).toEqual(["0.01", "0.01"]);
  expect(order.coaVersion).toBe(1);
  expect(order.status).toBe("PENDING");
  expect(order.steps).toHaveLength(1);
  await page.reload();
  await expect(page.getByText("Entrega no almoxarifado.", { exact: true })).toBeVisible();
  expect(await countOrders()).toBe(1);
});

test("decimal validation, overflow and empty rows block submission; safe-integer cents stay exact", async ({
  page,
}) => {
  await enter(page);
  const submit = page
    .getByRole("form", { name: "Novo pedido", exact: true })
    .getByRole("button", { name: "Cadastrar pedido", exact: true });
  await expect(submit).toBeDisabled();
  // The only creatable project is selected by default; clear it to exercise the required-project rule.
  await selectOption(
    page.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Obra", { exact: true }),
    "",
  );
  await page.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Obra", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Obra", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("dialog", { name: "Cadastrar pedido", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remover item 1" })).toBeDisabled();
  await fill(page, "0", "1,001");
  await page.getByLabel("Quantidade", { exact: true }).blur();
  await page.getByLabel("Preço unitário (R$)", { exact: true }).blur();
  await expect(page.getByText("Informe uma quantidade maior que zero.")).toBeVisible();
  await expect(page.getByText("Informe um preço válido.")).toBeVisible();
  await expect(submit).toBeDisabled();
  await page.getByLabel("Quantidade", { exact: true }).fill("10000");
  await page.getByLabel("Preço unitário (R$)", { exact: true }).fill("999999999999.99");
  await expect(page.getByRole("region", { name: "Resumo do envio" })).toContainText("9.999.999.999.999.900,00");
  await expect(submit).toBeEnabled();
  await page.getByLabel("Quantidade", { exact: true }).fill("10001");
  await expect(page.getByRole("alert")).toContainText("excede o limite");
  await expect(submit).toBeDisabled();
  await page.getByLabel("Quantidade", { exact: true }).fill("1e3");
  await expect(submit).toBeDisabled();
  await page.getByLabel("Quantidade", { exact: true }).press("Enter");
  await expect(page.getByRole("dialog", { name: "Cadastrar pedido", exact: true })).toHaveCount(0);
  expect(await countOrders()).toBe(0);
});

test("real supplier conflict reloads options without losing the draft, then permits a corrected submission", async ({
  page,
  request,
}) => {
  await enter(page);
  await fill(page, "2", "30.10");
  await page.getByLabel("Observações (opcional)").fill("Manter este texto");
  const deactivated = await request.delete(`${API}/suppliers/${f.supplier.id}`, {
    headers: { authorization: `Bearer ${adminToken}` },
  });
  expect(deactivated.status()).toBe(204);
  await page
    .getByRole("form", { name: "Novo pedido", exact: true })
    .getByRole("button", { name: "Cadastrar pedido", exact: true })
    .click();
  await confirmSave(page);
  await expect(page.getByRole("alert")).toContainText("preservados");
  await page.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Fornecedor", { exact: true }).click();
  await expect(page.locator(`[role="option"][data-option-value="${f.supplier.id}"]`)).toHaveCount(0);
  await closeSelect(page);
  await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("Material preciso");
  await expect(page.getByLabel("Quantidade", { exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Observações (opcional)")).toHaveValue("Manter este texto");
  await expect(
    page
      .getByRole("form", { name: "Novo pedido", exact: true })
      .getByRole("button", { name: "Cadastrar pedido", exact: true }),
  ).toBeDisabled();
  expect(await countOrders()).toBe(0);
  await page.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Fornecedor", { exact: true }).click();
  const replacement = await page.getByRole("option").nth(1).getAttribute("data-option-value");
  await closeSelect(page);
  expect(replacement).toBeTruthy();
  await selectOption(
    page.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Fornecedor", { exact: true }),
    replacement!,
  );
  await page
    .getByRole("form", { name: "Novo pedido", exact: true })
    .getByRole("button", { name: "Cadastrar pedido", exact: true })
    .click();
  await confirmSave(page);
  await expect(page).toHaveURL(/\/purchase-orders\/[0-9a-f-]+$/);
  expect(await countOrders()).toBe(1);
});

test("server field errors retain rows and can be corrected before a new submission", async ({ page }) => {
  await enter(page);
  await fill(page);
  await page.route(
    "**/api/v1/purchase-orders",
    async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 400,
        json: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Revise o preço.",
            details: [{ field: "items.0.unitPrice", code: "CUSTOM", message: "Preço recusado pelo servidor." }],
          },
        },
      });
    },
    { times: 1 },
  );
  await page
    .getByRole("form", { name: "Novo pedido", exact: true })
    .getByRole("button", { name: "Cadastrar pedido", exact: true })
    .click();
  await confirmSave(page);
  await expect(page.getByLabel("Preço unitário (R$)", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Preço recusado pelo servidor.")).toBeVisible();
  await page.getByLabel("Preço unitário (R$)", { exact: true }).fill("2.00");
  await expect(page.getByText("Preço recusado pelo servidor.")).toHaveCount(0);
  await page
    .getByRole("form", { name: "Novo pedido", exact: true })
    .getByRole("button", { name: "Cadastrar pedido", exact: true })
    .click();
  await confirmSave(page);
  await expect(page).toHaveURL(/\/purchase-orders\/[0-9a-f-]+$/);
  expect(await countOrders()).toBe(1);
});

for (const outcome of ["lost-response", "server-error"] as const) {
  test(`an accepted write with ${outcome} never retries and keeps the form for explicit reconciliation`, async ({
    page,
  }) => {
    await enter(page);
    await fill(page);
    await page.route("**/api/v1/purchase-orders", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      if (outcome === "lost-response") await route.abort("failed");
      else
        await route.fulfill({
          status: 500,
          json: { error: { code: "INTERNAL_ERROR", message: "Falha ao entregar a resposta.", details: [] } },
        });
    });
    await page
      .getByRole("form", { name: "Novo pedido", exact: true })
      .getByRole("button", { name: "Cadastrar pedido", exact: true })
      .click();
    await confirmSave(page);
    await expect(page.getByText("Não foi possível confirmar o resultado.", { exact: false })).toBeVisible();
    await expect(
      page
        .getByRole("form", { name: "Novo pedido", exact: true })
        .getByRole("button", { name: "Cadastrar pedido", exact: true }),
    ).toBeDisabled();
    await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("Material preciso");
    expect(await countOrders()).toBe(1);
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("link", { name: "Consultar pedidos em outra aba" }).click();
    const popup = await popupPromise;
    await expect(popup.getByRole("link", { name: /Abrir pedido/ })).toHaveCount(1);
    await popup.close();
    await page.getByRole("button", { name: "Atualizar e liberar novo envio" }).click();
    await expect(
      page
        .getByRole("form", { name: "Novo pedido", exact: true })
        .getByRole("button", { name: "Cadastrar pedido", exact: true }),
    ).toBeEnabled();
    expect(await countOrders()).toBe(1);
  });
}

test("ADMIN is offered only the projects they belong to when creating an order", async ({ page, request }) => {
  const other = await createFixture();
  try {
    const added = await request.post(`${API}/projects/${f.project.id}/members`, {
      headers: { authorization: `Bearer ${adminToken}` },
      data: { userId: f.admin.id },
    });
    expect(added.status()).toBe(201);
    await enter(page, adminToken);
    const projectSelect = page.getByRole("form").getByLabel("Obra", { exact: true });
    await projectSelect.click();
    // Broad ADMIN reads grant no creation access: only member projects are offered.
    await expect(page.locator(`[role="option"][data-option-value="${f.project.id}"]`)).toHaveCount(1);
    await expect(page.locator(`[role="option"][data-option-value="${other.project.id}"]`)).toHaveCount(0);
    await closeSelect(page);
    await fill(page, "2", "10.00");
    await page.getByLabel("Observações (opcional)").fill("Preservar observação no retry");
    const submit = page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true });
    await expect(submit).toBeEnabled();
    await expect(submit).toBeEnabled();
    await expect(projectSelect).toContainText(f.project.name);
    await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("Material preciso");
    await expect(page.getByLabel("Quantidade", { exact: true })).toHaveValue("2");
    await expect(page.getByLabel("Observações (opcional)")).toHaveValue("Preservar observação no retry");
    await projectSelect.click();
    // The recovered lookup confirms nonmembership; broad ADMIN reads grant no creation access.
    await expect(page.locator(`[role="option"][data-option-value="${other.project.id}"]`)).toHaveCount(0);
    await closeSelect(page);
    await submit.click();
    await confirmSave(page);
    await expect(page).toHaveURL(/\/purchase-orders\/[0-9a-f-]+$/);
    expect(await countOrders()).toBe(1);
  } finally {
    await other.cleanup();
  }
});

test("render failure keeps navigation and persistent purchase recovery through reload", async ({ page }) => {
  const marker = `obraflow.purchaseOrderSubmission.${f.admin.id}`;
  await signInAs(page, adminToken);
  await page.goto("/purchase-orders");
  await expect(page.getByRole("heading", { name: "Pedidos de compra", exact: true })).toBeVisible();
  // Set once, so reload must preserve the actual marker rather than recreate it.
  await page.evaluate(({ key, projectId }) => sessionStorage.setItem(key, projectId), {
    key: marker,
    projectId: f.project.id,
  });
  let reads = 0,
    writes = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/purchase-orders")) writes++;
  });
  await page.route("**/api/v1/projects", async (route) => {
    reads++;
    const response = await route.fetch();
    const payload = await response.json();
    // A genuine child render exception, with no production-only failure hook.
    payload.data[0].name = { privateDiagnostic: "sensitive backend trace" };
    await route.fulfill({ response, json: payload });
  });
  await page.getByRole("link", { name: "Obras", exact: true }).click();
  const fallback = page.getByRole("heading", { name: "Não foi possível exibir esta página", exact: true });
  await expect(fallback).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Menu lateral" })).toBeVisible();
  await expect(page.getByText("sensitive backend trace", { exact: false })).toHaveCount(0);
  // The shell search also loads projects. Check stability rather than assuming
  // this page is the only reader of the shared reference endpoint.
  const initialReads = reads;
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
  expect(reads).toBe(initialReads);
  await page.getByRole("button", { name: "Recarregar página", exact: true }).click();
  await expect(fallback).toBeVisible();
  expect(reads).toBeGreaterThan(initialReads);
  await page.unroute("**/api/v1/projects");
  await page.getByRole("link", { name: "Voltar aos pedidos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pedidos de compra", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Revisar envio", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Novo pedido", exact: true })).toBeVisible();
  await expect(page.getByText("O pedido pode ter sido criado.", { exact: false })).toBeVisible();
  expect(await page.evaluate((key) => sessionStorage.getItem(key), marker)).not.toBeNull();
  expect(writes).toBe(0);
});

test("admin membership is explicit; reference reads can be retried without replacing form data", async ({ page }) => {
  let unavailable = true;
  await page.route("**/api/v1/suppliers", (route) =>
    unavailable
      ? route.fulfill({
          status: 503,
          json: { error: { code: "UNAVAILABLE", message: "Consulta indisponível.", details: [] } },
        })
      : route.continue(),
  );
  await enter(page, adminToken);
  await page.getByLabel("Descrição", { exact: true }).fill("Preservar rascunho local");
  unavailable = false;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Obra", { exact: true }),
  ).toBeEnabled();
  await page.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Obra", { exact: true }).click();
  await expect(page.locator(`[role="option"][data-option-value="${f.project.id}"]`)).toHaveCount(0);
  await closeSelect(page);
  await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("Preservar rascunho local");
  await expect(
    page
      .getByRole("form", { name: "Novo pedido", exact: true })
      .getByRole("button", { name: "Cadastrar pedido", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Obra", { exact: true }),
  ).toHaveText("Selecione uma obra");
});

test("mobile creation supports zero prices and returning to the original filters", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page, token, `/purchase-orders?projectId=${f.project.id}&status=PENDING&mode=create`);
  await page.getByRole("button", { name: "Voltar aos pedidos", exact: true }).click();
  await expect(page).toHaveURL(`/purchase-orders?projectId=${f.project.id}&status=PENDING`);
  await page.getByRole("button", { name: "Novo pedido", exact: true }).click();
  await fill(page, "1", "0");
  await expect(page.getByRole("region", { name: "Resumo do envio" })).toContainText("0,00");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page
    .getByRole("form", { name: "Novo pedido", exact: true })
    .getByRole("button", { name: "Cadastrar pedido", exact: true })
    .click();
  await confirmSave(page);
  await expect(page).toHaveURL(/\/purchase-orders\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: /Pedido #/ })).toBeVisible();
  expect(await countOrders()).toBe(1);
});

test("creation review preserves the draft on cancel and submits only after confirmation", async ({ page }) => {
  await enter(page);
  await fill(page);
  const writes: unknown[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/purchase-orders")) writes.push(request.postDataJSON());
  });
  await page
    .getByRole("form", { name: "Novo pedido", exact: true })
    .getByRole("button", { name: "Cadastrar pedido", exact: true })
    .click();
  const review = page.getByRole("dialog", { name: "Cadastrar pedido", exact: true });
  await expect(review).toContainText("O servidor confirma os valores exatos");
  expect(writes).toHaveLength(0);
  await review.getByRole("button", { name: "Editar pedido", exact: true }).click();
  await expect(page.getByRole("form", { name: "Novo pedido", exact: true })).toBeVisible();
  await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("Material preciso");
  expect(writes).toHaveLength(0);
  await page
    .getByRole("form", { name: "Novo pedido", exact: true })
    .getByRole("button", { name: "Cadastrar pedido", exact: true })
    .click();
  await confirmSave(page);
  await expect(page).toHaveURL(/\/purchase-orders\/[0-9a-f-]+$/);
  expect(writes).toHaveLength(1);
});

test("dirty Back, Forward, app links and refresh discard without prompts", async ({ page }) => {
  let prompts = 0;
  page.on("dialog", (dialog) => {
    prompts++;
    void dialog.dismiss();
  });
  await signInAs(page, token);
  await page.goto(`/purchase-orders?status=PENDING&pageSize=1`);
  await page.getByRole("button", { name: "Novo pedido", exact: true }).click();
  await fill(page);
  await expect(
    page.getByText("Rascunho não salvo. Ao sair desta página, os dados serão perdidos.", { exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/status=PENDING&pageSize=1/);
  await page.goForward();
  await expect(page).toHaveURL(/\/purchase-orders\/new$/);
  await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("");
  await page.getByLabel("Descrição", { exact: true }).fill("Apenas em memória");
  await page.reload();
  await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("");
  await fill(page);
  await page.getByRole("link", { name: "Pedidos de compra", exact: true }).first().click();
  await expect(page).toHaveURL(/\/purchase-orders$/);
  expect(prompts).toBe(0);
  expect(await page.evaluate(() => Object.keys(localStorage).some((key) => /draft|pedido|order/i.test(key)))).toBe(
    false,
  );
  expect(await countOrders()).toBe(0);
});

test("direct page refresh, empty prerequisites and unauthenticated navigation are safe", async ({ page }) => {
  await page.goto("/purchase-orders/new");
  await expect(page).toHaveURL(/\/login$/);
  await enter(page);
  await page.reload();
  await expect(page.getByRole("form", { name: "Novo pedido", exact: true })).toBeVisible();
  await page.route("**/api/v1/projects", (route) => route.fulfill({ json: { data: [] } }));
  await page.route("**/api/v1/suppliers", (route) => route.fulfill({ json: { data: [] } }));
  await page.reload();
  await expect(page).toHaveURL(/\/purchase-orders$/);
  await expect(page.getByRole("button", { name: "Novo pedido", exact: true })).toBeDisabled();
});

for (const status of [403, 409])
  test(`project change (${status}) refreshes eligibility without clearing draft`, async ({ page }) => {
    await enter(page);
    await fill(page);
    await page.route("**/api/v1/purchase-orders", (route) =>
      route.fulfill({
        status,
        json: { error: { code: "PROJECT_CHANGED", message: "A obra não está mais disponível.", details: [] } },
      }),
    );
    await page.route("**/api/v1/projects", (route) => route.fulfill({ json: { data: [] } }));
    await page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true }).click();
    await confirmSave(page);
    await expect(page.getByText("A obra selecionada não está disponível", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("Material preciso");
    await expect(page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true })).toBeDisabled();
    expect(await countOrders()).toBe(0);
  });

test("uncertain recovery requires a successful fresh read and never retries the POST", async ({ page }) => {
  await enter(page);
  await fill(page);
  let writes = 0;
  await page.route("**/api/v1/purchase-orders", (route) => {
    writes++;
    return route.fulfill({
      status: 500,
      json: { error: { code: "INTERNAL_ERROR", message: "Resposta desconhecida.", details: [] } },
    });
  });
  await page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true }).click();
  await confirmSave(page);
  const create = page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true });
  await expect(create).toBeDisabled();
  await page.route("**/api/v1/purchase-orders?**", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { code: "UNAVAILABLE", message: "Leitura indisponível.", details: [] } },
    }),
  );
  await page.getByRole("button", { name: "Atualizar e liberar novo envio" }).click();
  await expect(page.getByText("Não foi possível atualizar a consulta.", { exact: false })).toBeVisible();
  await expect(create).toBeDisabled();
  expect(writes).toBe(1);
  await page.unroute("**/api/v1/purchase-orders?**");
  await page.getByRole("button", { name: "Atualizar e liberar novo envio" }).click();
  await expect(create).toBeEnabled();
  expect(writes).toBe(1);
});

test("unconfigured projects remain unavailable; item identity and values survive sibling removal", async ({ page }) => {
  await page.route("**/api/v1/projects", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: f.project.id,
            name: "Obra sem alçada",
            isActive: true,
            coaVersion: 0,
            membership: { count: 1, activeCount: 1, isMember: true },
          },
        ],
      },
    }),
  );
  await enter(page);
  await selectOption(page.getByLabel("Obra", { exact: true }), "");
  await page.getByLabel("Obra", { exact: true }).click();
  await expect(page.getByRole("option", { name: "Obra sem alçada — sem alçada", exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await closeSelect(page);
  await expect(page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true })).toBeDisabled();
  await page.getByLabel("Descrição", { exact: true }).fill("Primeiro item");
  await page.getByRole("button", { name: "Adicionar item", exact: true }).click();
  const second = page.getByRole("group", { name: "Item 2", exact: true }).getByLabel("Descrição", { exact: true });
  await second.fill("Segundo item preservado");
  const id = await second.getAttribute("id");
  await page.getByRole("button", { name: "Remover item 1", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Remover item 1?", exact: true })
    .getByRole("button", { name: "Remover item", exact: true })
    .click();
  await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("Segundo item preservado");
  await expect(page.getByLabel("Descrição", { exact: true })).toHaveAttribute("id", id!);
  await expect(page.getByRole("button", { name: "Remover item 1", exact: true })).toBeDisabled();
});

test("adding by pointer or keyboard focuses the new description and retains local validation", async ({ page }) => {
  await enter(page);
  await fill(page);
  const first = page.getByRole("group", { name: "Item 1", exact: true });
  // Leave the error latent until the add action moves focus away from this field.
  await first.getByLabel("Quantidade", { exact: true }).fill("0");
  const add = page.getByRole("button", { name: "Adicionar item", exact: true });
  await add.click();
  await expect(
    page.getByRole("group", { name: "Item 2", exact: true }).getByLabel("Descrição", { exact: true }),
  ).toBeFocused();
  await expect(first.getByLabel("Quantidade", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(first.getByText("Informe uma quantidade maior que zero.", { exact: true })).toBeVisible();
  const originalId = await first.getByLabel("Descrição", { exact: true }).getAttribute("id");
  await add.focus();
  await add.press("Enter");
  const third = page.getByRole("group", { name: "Item 3", exact: true }).getByLabel("Descrição", { exact: true });
  await expect(third).toBeFocused();
  await expect(third).toBeInViewport();
  await expect(first.getByLabel("Descrição", { exact: true })).toHaveAttribute("id", originalId!);
  await expect(first.getByLabel("Quantidade", { exact: true })).toHaveAttribute("aria-invalid", "true");
  expect(await countOrders()).toBe(0);
});

test("empty removal is immediate; filled removal preserves unrelated server feedback and surviving IDs", async ({
  page,
}) => {
  await enter(page);
  await fill(page);
  for (let index = 2; index <= 3; index++) {
    await page.getByRole("button", { name: "Adicionar item", exact: true }).click();
    const row = page.getByRole("group", { name: `Item ${index}`, exact: true });
    await row.getByLabel("Descrição", { exact: true }).fill(`Material ${index}`);
    await row.getByLabel("Quantidade", { exact: true }).fill("2");
    await row.getByLabel("Unidade", { exact: true }).fill("un");
    await row.getByLabel("Preço unitário (R$)", { exact: true }).fill("5.00");
  }
  const thirdId = await page
    .getByRole("group", { name: "Item 3", exact: true })
    .getByLabel("Preço unitário (R$)", { exact: true })
    .getAttribute("id");
  await page.route("**/api/v1/purchase-orders", (route) =>
    route.fulfill({
      status: 400,
      json: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Revise os campos.",
          details: [
            { field: "items.0.description", code: "CUSTOM", message: "Rever descrição do primeiro item." },
            { field: "items.2.unitPrice", code: "CUSTOM", message: "Preço do terceiro item recusado." },
            { field: "supplierId", code: "CUSTOM", message: "Fornecedor requer revisão." },
          ],
        },
      },
    }),
  );
  await page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true }).click();
  await confirmSave(page);
  await expect(page.getByText("Preço do terceiro item recusado.")).toBeVisible();
  await page.getByRole("button", { name: "Adicionar item", exact: true }).click();
  await page.getByRole("button", { name: "Remover item 4", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /^Remover item/ })).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: "Item 3", exact: true }).getByLabel("Descrição", { exact: true }),
  ).toBeFocused();
  await expect(page.getByText("Rever descrição do primeiro item.")).toBeVisible();
  await page.getByRole("button", { name: "Remover item 1", exact: true }).click();
  const remove = page.getByRole("dialog", { name: "Remover item 1?", exact: true });
  await expect(remove.getByRole("button", { name: "Manter item" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Remover item 1", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Remover item 1", exact: true }).click();
  await remove.getByRole("button", { name: "Remover item", exact: true }).click();
  await expect(
    page.getByRole("group", { name: "Item 1", exact: true }).getByLabel("Descrição", { exact: true }),
  ).toBeFocused();
  const survivor = page.getByRole("group", { name: "Item 2", exact: true });
  await expect(survivor.getByLabel("Preço unitário (R$)", { exact: true })).toHaveAttribute("id", thirdId!);
  await expect(survivor.getByLabel("Preço unitário (R$)", { exact: true })).toHaveAttribute(
    "aria-describedby",
    "error-items.1.unitPrice",
  );
  await expect(survivor.getByText("Preço do terceiro item recusado.")).toBeVisible();
  await expect(page.getByText("Fornecedor requer revisão.")).toBeVisible();
  await expect(page.getByText("Rever descrição do primeiro item.")).toHaveCount(0);
  await expect(page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true })).toBeDisabled();
  expect(await countOrders()).toBe(0);
});

for (const width of [1440, 390])
  test(`eight-item entry, correction, removal and detailed review at ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: width >= 1000 ? 1000 : 667 });
    await page.emulateMedia({ colorScheme: width === 320 ? "dark" : "light", reducedMotion: "reduce" });
    await enter(page);
    await fill(page);
    const form = page.getByRole("form", { name: "Novo pedido", exact: true });
    async function fillItem(index: number) {
      const row = page.getByRole("group", { name: `Item ${index}`, exact: true });
      await row.getByLabel("Descrição", { exact: true }).fill(`Concreto — lote ${index}`);
      await row.getByLabel("Quantidade", { exact: true }).fill("0.005");
      await row.getByLabel("Unidade", { exact: true }).fill("m³");
      await row.getByLabel("Preço unitário (R$)", { exact: true }).fill("1.00");
    }
    for (let index = 2; index <= 8; index++) {
      await form.getByRole("button", { name: "Adicionar item", exact: true }).click();
      const description = page
        .getByRole("group", { name: `Item ${index}`, exact: true })
        .getByLabel("Descrição", { exact: true });
      await expect(description).toBeFocused();
      await expect(description).toBeInViewport();
      await fillItem(index);
    }
    await expect(form.getByRole("region", { name: "Resumo do envio" })).toContainText("R$ 0,08");
    const fourth = page.getByRole("group", { name: "Item 4", exact: true });
    const fourthId = await fourth.getByLabel("Descrição", { exact: true }).getAttribute("id");
    const quantity = fourth.getByLabel("Quantidade", { exact: true });
    await quantity.fill("0");
    await quantity.press("Tab");
    await expect(fourth.getByText("Informe uma quantidade maior que zero.", { exact: true })).toBeVisible();
    await expect(form.getByText("1 campo pendente", { exact: true })).toBeVisible();
    await form.getByRole("button", { name: "Verificar campos", exact: true }).click();
    await expect(quantity).toBeFocused();
    await expect(quantity).toBeInViewport();
    await quantity.fill("0.005");
    await form.getByRole("button", { name: "Remover item 3", exact: true }).click();
    const remove = page.getByRole("dialog", { name: "Remover item 3?", exact: true });
    await expect(remove).toContainText("Concreto — lote 3");
    await remove.getByRole("button", { name: "Remover item", exact: true }).click();
    await expect(
      page.getByRole("group", { name: "Item 3", exact: true }).getByLabel("Descrição", { exact: true }),
    ).toHaveAttribute("id", fourthId!);
    await expect(form.getByRole("region", { name: "Resumo do envio" })).toContainText("R$ 0,07");
    await form.getByRole("button", { name: "Adicionar item", exact: true }).click();
    await fillItem(8);
    const first = page.getByRole("group", { name: "Item 1", exact: true });
    const descriptionBox = (await first.getByLabel("Descrição", { exact: true }).boundingBox())!;
    const quantityBox = (await first.getByLabel("Quantidade", { exact: true }).boundingBox())!;
    if (width === 1440) expect(Math.abs(descriptionBox.y - quantityBox.y)).toBeLessThan(2);
    else expect(quantityBox.y).toBeGreaterThan(descriptionBox.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await form.getByRole("button", { name: "Cadastrar pedido", exact: true }).click();
    const review = page.getByRole("dialog", { name: "Cadastrar pedido", exact: true });
    const lines = review.getByRole("list", { name: "Itens para revisão", exact: true });
    await expect(lines.getByRole("listitem")).toHaveCount(8);
    await expect(lines).toContainText("0,005 m³ × R$ 1,00");
    await expect(lines).toContainText("Subtotal: R$ 0,01");
    await expect(review).toContainText("R$ 0,08");
    expect(await lines.evaluate((node) => node.scrollHeight > node.clientHeight + 1)).toBe(false);
    await expect(review.getByRole("button", { name: "Editar pedido", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(review.getByRole("button", { name: "Cadastrar pedido", exact: true })).toBeFocused();
    await expect(review.getByRole("button", { name: "Cadastrar pedido", exact: true })).toBeInViewport({ ratio: 0.98 });
    if (width === 1440) {
      await confirmSave(page);
      await expect(page).toHaveURL(/\/purchase-orders\/[0-9a-f-]+$/);
      const saved = await (
        await request.get(`${API}/purchase-orders/${page.url().split("/").at(-1)}`, {
          headers: { authorization: `Bearer ${token}` },
        })
      ).json();
      expect(saved.total).toBe("0.08");
      expect(saved.items.map((item: { lineTotal: string }) => item.lineTotal)).toEqual(Array(8).fill("0.01"));
    } else {
      await page.keyboard.press("Escape");
      await expect(form.getByRole("button", { name: "Cadastrar pedido", exact: true })).toBeFocused();
      expect(await countOrders()).toBe(0);
    }
  });
