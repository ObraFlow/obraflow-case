import { openFilters } from "../support/filters";
import { selectOption } from "../support/select";
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
let adminToken: string;
let orderId: string;
test.beforeAll(async () => {
  database = await loadDatabase();
  server = await startServer();
});
test.beforeEach(async ({ request }) => {
  f = await createFixture();
  adminToken = server.jwt.sign({ sub: f.admin.id });
  const headers = { authorization: `Bearer ${adminToken}` };
  const configured = await request.put(`${API}/projects/${f.project.id}/coa`, {
    headers,
    data: {
      expectedCoaVersion: 0,
      bands: [
        { upperLimit: "10000.00", approverId: f.users[0].id },
        { upperLimit: null, approverId: f.users[1].id },
      ],
    },
  });
  expect(configured.status()).toBe(200);
  const created = await request.post(`${API}/purchase-orders`, {
    headers: { authorization: `Bearer ${server.jwt.sign({ sub: f.users[0].id })}` },
    data: {
      projectId: f.project.id,
      supplierId: f.supplier.id,
      orderDate: "2026-10-22",
      items: [{ description: "Material auditado", quantity: "1", unit: "un", unitPrice: "12500.01" }],
    },
  });
  expect(created.status()).toBe(201);
  orderId = (await created.json()).id;
  for (let i = 0; i < 2; i++) {
    const decision = await request.post(`${API}/purchase-orders/${orderId}/decisions`, {
      headers: { authorization: `Bearer ${server.jwt.sign({ sub: f.users[i].id })}` },
      data: {
        expectedStepIndex: i,
        decision: i === 0 ? "APPROVED" : "REJECTED",
        ...(i ? { reason: "Cotação acima do orçamento.\nRevisar fornecedor." } : {}),
      },
    });
    expect(decision.status()).toBe(200);
  }
  expect(
    (
      await request.put(`${API}/projects/${f.project.id}/coa`, {
        headers,
        data: { expectedCoaVersion: 1, bands: [{ upperLimit: null, approverId: f.users[1].id }] },
      })
    ).status(),
  ).toBe(200);
});
test.afterEach(async () => {
  await f?.cleanup();
});
test.afterAll(async () => {
  await stopApi(server, database);
});
async function enter(page: Page, path = `/admin/audit?projectId=${f.project.id}`, token = adminToken) {
  await signInAs(page, token);
  await page.goto(path);
}

async function openPeriod(page: Page) {
  await page.getByRole("button", { name: /^Período / }).click();
  await expect(page.getByRole("dialog", { name: "Período", exact: true })).toBeVisible();
}

test.describe("audit date range", () => {
  test.use({ timezoneId: "America/Sao_Paulo" });
  test("applies whole local days server-side, preserves other filters and restores dates through history/reload", async ({
    page,
  }) => {
    await database.query("UPDATE purchase_orders SET created_at='2026-10-29T02:59:59.999999Z' WHERE id=$1", [orderId]);
    await database.query(
      "UPDATE coa_revisions SET changed_at=CASE WHEN version=1 THEN '2026-10-29T03:00:00Z'::timestamptz ELSE '2026-10-30T03:00:00Z'::timestamptz END WHERE project_id=$1",
      [f.project.id],
    );
    await database.query(
      "UPDATE approval_decisions SET decided_at=CASE WHEN decision='APPROVED' THEN '2026-10-29T16:00:00Z'::timestamptz ELSE '2026-10-30T02:59:59.999999Z'::timestamptz END WHERE step_id IN (SELECT id FROM purchase_order_steps WHERE order_id=$1)",
      [orderId],
    );
    const requests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/audit/events")) requests.push(request.url());
    });
    await enter(page, `/admin/audit?projectId=${f.project.id}&pageSize=1&page=2`);
    const pagination = page.getByRole("navigation", { name: "Paginação da auditoria" });
    await expect(pagination).toContainText("Página 2 de 5");
    await expect(page.getByLabel("De", { exact: true })).toHaveCount(0);
    const count = requests.length;
    await openPeriod(page);
    await page.getByLabel("De", { exact: true }).fill("29/10/2026");
    await page.getByLabel("Até", { exact: true }).fill("29/10/2026");
    expect(requests).toHaveLength(count);
    await page.getByRole("button", { name: "Aplicar período", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Período", exact: true })).toHaveCount(0);
    await expect(pagination).toContainText("1–1 de 3 eventos · Página 1 de 3");
    const params = new URL(page.url()).searchParams;
    expect(params.get("from")).toBe("2026-10-29T03:00:00.000Z");
    expect(params.get("to")).toBe("2026-10-30T03:00:00.000Z");
    expect(params.get("projectId")).toBe(f.project.id);
    expect(params.get("pageSize")).toBe("1");
    expect(params.has("page")).toBe(false);
    const api = new URL(requests.at(-1)!);
    expect(api.searchParams.get("from")).toBe(params.get("from"));
    expect(api.searchParams.get("to")).toBe(params.get("to"));
    await selectOption(page.getByLabel("Tipo de evento"), "STEP_REJECTED");
    await expect(pagination).toContainText("1–1 de 1 evento");
    await expect(page.getByRole("article")).toContainText("Etapa rejeitada");
    await page.reload();
    await expect(page.getByRole("button", { name: /^Período / })).toContainText("29/10/2026 – 29/10/2026");
    await openPeriod(page);
    await expect(page.getByLabel("De", { exact: true })).toHaveValue("29/10/2026");
    await expect(page.getByLabel("Até", { exact: true })).toHaveValue("29/10/2026");
    await page.getByRole("button", { name: "Limpar período", exact: true }).click();
    await expect(page).not.toHaveURL(/from=|to=/);
    await expect(page).toHaveURL(/eventType=STEP_REJECTED/);
    await page.goBack();
    await expect(page.getByRole("button", { name: /^Período / })).toContainText("29/10/2026 – 29/10/2026");
    await page.goForward();
    await expect(page.getByRole("button", { name: /^Período / })).toContainText("Todo o período");
    await openPeriod(page);
    const beforeInvalid = requests.length;
    await page.getByLabel("De", { exact: true }).fill("31/02/2026");
    await page.getByRole("button", { name: "Aplicar período", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Informe datas válidas." })).toBeVisible();
    expect(requests).toHaveLength(beforeInvalid);
    await page.getByLabel("De", { exact: true }).fill("30/10/2026");
    await page.getByLabel("Até", { exact: true }).fill("29/10/2026");
    await page.getByRole("button", { name: "Aplicar período", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("A data final deve ser igual ou posterior");
    expect(requests).toHaveLength(beforeInvalid);
  });
  test("single period picker supports range selection and stays bounded in both themes on desktop/mobile", async ({
    page,
  }) => {
    await enter(page, `/admin/audit?projectId=${f.project.id}&from=2026-10-29T03:00:00.000Z`);
    await expect(page.getByRole("navigation", { name: "Paginação da auditoria" })).toBeVisible();
    for (const width of [1440, 320])
      for (const theme of ["light", "dark"] as const) {
        await page.setViewportSize({ width, height: 650 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await openFilters(page, "Filtros de auditoria");
        const filters = page.getByRole("region", { name: "Filtros de auditoria" });
        await expect(filters.getByRole("textbox")).toHaveCount(0);
        if (width === 1440) {
          const boxes = await Promise.all(
            [
              page.getByLabel("Tipo de evento"),
              page.getByLabel("Obra", { exact: true }),
              page.getByRole("button", { name: /^Período / }),
              page.getByLabel("Eventos por página"),
            ].map((control) => control.boundingBox()),
          );
          expect(Math.max(...boxes.map((box) => box!.y)) - Math.min(...boxes.map((box) => box!.y))).toBeLessThan(2);
        }
        const trigger = page.getByRole("button", { name: /^Período / });
        await trigger.focus();
        await page.keyboard.press("Enter");
        const picker = page.getByRole("dialog", { name: "Período", exact: true });
        await expect(picker).toBeVisible();
        const box = (await picker.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(650);
        await picker.locator('[data-date="2026-10-29"]').focus();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("Enter");
        await expect(page.getByLabel("De", { exact: true })).toHaveValue("29/10/2026");
        await expect(page.getByLabel("Até", { exact: true })).toHaveValue("30/10/2026");
        await expect(picker.getByRole("gridcell", { selected: true })).toHaveCount(2);
        const focusedDay = (await picker.locator('[data-date="2026-10-30"]').boundingBox())!;
        const applyAction = (await picker.getByRole("button", { name: "Aplicar período", exact: true }).boundingBox())!;
        expect(focusedDay.y + focusedDay.height).toBeLessThanOrEqual(applyAction.y);
        await page.keyboard.press("Escape");
        await expect(picker).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await openPeriod(page);
        await expect(page.getByLabel("Até", { exact: true })).toHaveValue("");
        await picker.getByRole("button", { name: "Últimos 7 dias", exact: true }).click();
        await expect(page.getByLabel("Até", { exact: true })).not.toHaveValue("");
        await picker.getByRole("button", { name: "Cancelar", exact: true }).click();
        await expect(trigger).toContainText("A partir de 29/10/2026");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    await openPeriod(page);
    await page.getByLabel("De", { exact: true }).fill("31/");
    await page.getByRole("button", { name: "Limpar período", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Período / })).toContainText("Todo o período");
  });
  test("calendar chooses ordered ranges across months and quick presets only apply on confirmation", async ({
    page,
  }) => {
    await enter(page, `/admin/audit?projectId=${f.project.id}&from=2026-10-29T03:00:00.000Z`);
    await openPeriod(page);
    const picker = page.getByRole("dialog", { name: "Período", exact: true });
    await picker.locator('[data-date="2026-11-03"]').click();
    await expect(page.getByLabel("Até", { exact: true })).toHaveValue("03/11/2026");
    await expect(picker.getByRole("gridcell", { selected: true })).toHaveCount(6);
    await picker.getByRole("button", { name: "Aplicar período", exact: true }).click();
    await expect(page).toHaveURL(/to=2026-11-04/);
    await openPeriod(page);
    await picker.locator('[data-date="2026-10-20"]').click();
    await picker.locator('[data-date="2026-10-18"]').click();
    await expect(page.getByLabel("De", { exact: true })).toHaveValue("18/10/2026");
    await expect(page.getByLabel("Até", { exact: true })).toHaveValue("20/10/2026");
    const previousUrl = page.url();
    await picker.getByRole("button", { name: "Últimos 30 dias", exact: true }).click();
    await expect(page).toHaveURL(previousUrl);
    await picker.getByRole("button", { name: "Hoje", exact: true }).click();
    expect(await page.getByLabel("De", { exact: true }).inputValue()).toBe(
      await page.getByLabel("Até", { exact: true }).inputValue(),
    );
    await picker.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(page).toHaveURL(previousUrl);
  });
  test.describe("daylight saving", () => {
    test.use({ timezoneId: "America/New_York" });
    test("one selected calendar day uses local midnights across a 23-hour day", async ({ page }) => {
      await enter(page);
      await openPeriod(page);
      await page.getByLabel("De", { exact: true }).fill("08/03/2026");
      await page.getByLabel("Até", { exact: true }).fill("08/03/2026");
      await page.getByRole("button", { name: "Aplicar período", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Nenhum evento encontrado", exact: true })).toBeVisible();
      const params = new URL(page.url()).searchParams;
      expect(params.get("from")).toBe("2026-03-08T05:00:00.000Z");
      expect(params.get("to")).toBe("2026-03-09T04:00:00.000Z");
      await page.reload();
      await openPeriod(page);
      await expect(page.getByLabel("Até", { exact: true })).toHaveValue("08/03/2026");
    });
  });
});

test("audit detail URL restores one drawer across reload, history and viewport changes without sending UI parameters to the API", async ({
  page,
}) => {
  await enter(page);
  await page
    .getByRole("article")
    .filter({ hasText: "Etapa rejeitada" })
    .getByRole("button", { name: "Ver detalhes", exact: true })
    .click();
  const drawer = page.getByRole("dialog");
  await expect(page).toHaveURL(/event=/);
  await expect(drawer).toContainText("Cotação acima do orçamento");
  await page.goBack();
  await expect(drawer).toHaveCount(0);
  await page.goForward();
  await expect(drawer).toContainText("Cotação acima do orçamento");
  await page.reload();
  await expect(drawer).toContainText("Cotação acima do orçamento");
  await page.setViewportSize({ width: 390, height: 700 });
  await expect(drawer).toHaveCount(1);
  await drawer.getByRole("button", { name: "Fechar detalhes", exact: true }).click();
  await expect(page).not.toHaveURL(/event=/);
  await expect(page).toHaveURL(new RegExp(`projectId=${f.project.id}`));
  await page.goto(`/admin/audit?projectId=${f.project.id}&event=missing`);
  await expect(drawer).toContainText("não está na página atual");
});

test("admin inspects original snapshots, complete revisions, rejection details and source links without write controls", async ({
  page,
}) => {
  await enter(page);
  await expect(page.getByRole("navigation", { name: "Paginação da auditoria" })).toContainText("5 eventos");
  const events = page.getByRole("region", { name: "Histórico de auditoria" });
  await expect(events.getByRole("article")).toHaveCount(5);
  const times = await events
    .locator("time")
    .evaluateAll((nodes) => nodes.map((node) => Date.parse(node.getAttribute("datetime")!)));
  expect(times).toEqual([...times].sort((a, b) => b - a));
  await expect(events.getByRole("table")).toHaveCount(0);
  const drawer = page.getByRole("dialog");
  const creation = events.getByRole("article").filter({ hasText: "Pedido criado" });
  await creation.getByText("Ver detalhes", { exact: true }).click();
  await expect(drawer).toContainText("12.500,01");
  await expect(drawer).toContainText("Alçada aplicada: versão 1");
  const technical = drawer.locator('[data-slot="disclosure"]');
  await expect(technical.getByRole("button", { name: "Referências técnicas", exact: true })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await technical.getByText("Referências técnicas", { exact: true }).click();
  await expect(technical.getByRole("button", { name: "Referências técnicas", exact: true })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(technical).toContainText(orderId);
  await technical.getByText("Referências técnicas", { exact: true }).click();
  await expect(drawer).toContainText(f.users[0].displayName);
  await expect(drawer).toContainText(f.users[1].displayName);
  await drawer.getByRole("button", { name: "Fechar detalhes" }).click();
  const original = events.getByRole("article").filter({ hasText: "Alçada publicada" }).last();
  await original.getByText("Ver detalhes", { exact: true }).click();
  await expect(drawer).toContainText("Alçada publicada · versão 1");
  await expect(drawer).toContainText("10.000,00");
  await expect(drawer).toContainText("Sem limite");
  await expect(drawer).toContainText(`${f.users[0].displayName} → ${f.users[1].displayName}`);
  await expect(drawer.getByRole("link", { name: "Abrir obra", exact: true })).toHaveAttribute(
    "href",
    `/admin/projects/${f.project.id}`,
  );
  await drawer.getByRole("button", { name: "Fechar detalhes" }).click();
  await selectOption(page.getByLabel("Tipo de evento"), "STEP_REJECTED");
  const rejected = events.getByRole("article").filter({ hasText: "Etapa rejeitada" });
  await rejected.getByText("Ver detalhes", { exact: true }).click();
  await expect(drawer).toContainText("Etapa 2");
  await expect(drawer).toContainText("Cotação acima do orçamento.");
  await expect(drawer).toContainText(f.users[1].displayName);
  await expect(page.getByRole("button", { name: /Excluir|Editar|Salvar|Desativar/ })).toHaveCount(0);
  await drawer.getByRole("link", { name: "Abrir pedido", exact: true }).click();
  await expect(page).toHaveURL(`/purchase-orders/${orderId}`);
  await expect(page.getByRole("heading", { name: /Pedido #/ })).toBeVisible();
  await expect(page.getByText("Cotação acima do orçamento.", { exact: false })).toBeVisible();
});

test("audit pagination and combined filters are server-side and mobile history exposes global user events correctly", async ({
  page,
}) => {
  await enter(page, `/admin/audit?projectId=${f.project.id}&pageSize=1`);
  const pagination = page.getByRole("navigation", { name: "Paginação da auditoria" });
  await expect(pagination).toContainText("1–1 de 5 eventos · Página 1 de 5");
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(pagination).toContainText("2–2 de 5 eventos · Página 2 de 5");
  await expect(page).toHaveURL(/page=2/);
  await selectOption(page.getByLabel("Tipo de evento"), "STEP_APPROVED");
  await expect(pagination).toContainText("1–1 de 1 evento · Página 1 de 1");
  await expect(page).not.toHaveURL(/page=2/);
  await selectOption(page.getByLabel("Tipo de evento"), "USER_CREATED");
  await expect(page.getByText("Nenhum evento encontrado", { exact: true })).toBeVisible();
  await expect(pagination).toContainText("0 de 0 eventos · Página 1 de 1");
  await page.getByRole("button", { name: "Limpar filtros", exact: true }).click();
  await expect(page.getByLabel("Obra", { exact: true })).toHaveAttribute("value", "");
  await selectOption(page.getByLabel("Tipo de evento"), "USER_CREATED");
  await expect(page.getByRole("region", { name: "Histórico de auditoria" })).toContainText("Sistema");
  await page.setViewportSize({ width: 390, height: 844 });
  await openFilters(page, "Filtros de auditoria");
  await expect(page.getByRole("article").first()).toContainText("Usuário criado");
  await selectOption(page.getByLabel("Tipo de evento"), "STEP_REJECTED");
  await expect(page.getByRole("article").first()).toContainText("Etapa rejeitada");
  await selectOption(page.getByLabel("Obra", { exact: true }), f.project.id);
  const event = page.getByRole("article");
  await expect(event).toHaveCount(1);
  await event.getByText("Ver detalhes", { exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Revisar fornecedor.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("audit failures retry safely and malformed query filters can be cleared", async ({ page }) => {
  let unavailable = true;
  let writes = 0;
  page.on("request", (request) => {
    if (request.url().includes("/audit/events") && request.method() !== "GET") writes++;
  });
  await page.route("**/api/v1/audit/events**", (route) =>
    unavailable
      ? route.fulfill({
          status: 503,
          json: { error: { code: "UNAVAILABLE", message: "Histórico indisponível.", details: [] } },
        })
      : route.continue(),
  );
  await enter(page);
  await expect(page.getByRole("alert")).toContainText("Histórico indisponível");
  unavailable = false;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByRole("navigation", { name: "Paginação da auditoria" })).toContainText("5 eventos");
  await page.goto("/admin/audit?eventType=invalid");
  await expect(page.getByRole("region", { name: "Histórico de auditoria" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Tipo de evento", { exact: true })).toHaveText("Todos os tipos");
  await page.getByRole("button", { name: "Limpar filtros", exact: true }).click();
  await expect(page.getByRole("region", { name: "Histórico de auditoria" })).toBeVisible();
  expect(writes).toBe(0);
});

test("ordinary users cannot access audit through navigation, deep links or the endpoint", async ({ page, request }) => {
  const token = server.jwt.sign({ sub: f.users[0].id });
  await enter(page, "/admin/audit", token);
  await expect(page.getByRole("alert")).toContainText("Você não tem permissão");
  await expect(page.getByRole("link", { name: "Auditoria", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Auditoria", exact: true })).toHaveCount(0);
  const denied = await request.get(`${API}/audit/events`, { headers: { authorization: `Bearer ${token}` } });
  expect(denied.status()).toBe(403);
  expect((await denied.json()).data).toBeUndefined();
});

test("audit drawer stays right anchored, traps focus, dismisses safely and remains read-only on mobile", async ({
  page,
}) => {
  await enter(page);
  let writes = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/") && request.method() !== "GET") writes++;
  });
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 650 },
    { width: 320, height: 420 },
  ]) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: viewport.width === 1280 ? "light" : "dark" });
    const event = page.getByRole("article").filter({ hasText: "Etapa rejeitada" });
    const trigger = event.getByRole("button", { name: "Ver detalhes", exact: true });
    await trigger.click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toContainText("Cotação acima do orçamento.");
    await drawer.getByText("Referências técnicas", { exact: true }).click();
    await expect(drawer.locator('[data-slot="disclosure"]')).toContainText(orderId);
    await expect(drawer.getByRole("textbox")).toHaveCount(0);
    const box = (await drawer.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeCloseTo(viewport.width, 0);
    expect(box.y).toBe(0);
    expect(box.height).toBe(viewport.height);
    await drawer.getByRole("button", { name: "Fechar detalhes" }).focus();
    await page.keyboard.press("Tab");
    await expect.poll(() => drawer.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (viewport.width === 1280) await page.mouse.click(4, 4);
    else await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  expect(writes).toBe(0);
});
