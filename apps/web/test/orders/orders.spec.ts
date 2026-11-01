import { confirmSave } from "../support/save-confirmation";
import { appearance, openAccount, closeAccount } from "../support/account";
import { test, expect, type Page, type APIRequestContext, type Request, type Route } from "@playwright/test";
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
let f: Fixture;
let database: Database;
let tokens: string[];
let adminToken: string;

test.beforeAll(async ({ request }) => {
  database = await loadDatabase();
  server = await startServer();
  f = await createFixture();
  tokens = f.users.map((u) => server.jwt.sign({ sub: u.id }));
  adminToken = server.jwt.sign({ sub: f.admin.id });
  const configured = await request.put(`${API}/projects/${f.project.id}/coa`, {
    headers: { authorization: `Bearer ${adminToken}` },
    data: {
      expectedCoaVersion: 0,
      bands: [
        { upperLimit: "10000.00", approverId: f.users[0].id },
        { upperLimit: null, approverId: f.users[1].id },
      ],
    },
  });
  expect(configured.status()).toBe(200);
});
test.afterAll(async () => {
  if (f) await f.cleanup();
  await stopApi(server, database);
});

async function enter(page: Page, token: string, url: string) {
  await signInAs(page, token);
  await page.goto(url);
}
async function create(request: APIRequestContext, large = false, notes?: string) {
  const response = await request.post(`${API}/purchase-orders`, {
    headers: { authorization: `Bearer ${tokens[0]}` },
    data: {
      projectId: f.project.id,
      supplierId: f.supplier.id,
      orderDate: "2026-10-21",
      ...(notes ? { notes } : {}),
      items: large
        ? [
            { description: "Grande compra", quantity: "10000", unit: "un", unitPrice: "999999999999.99" },
            { description: "Complemento", quantity: "1", unit: "un", unitPrice: "99.99" },
          ]
        : [{ description: "Materiais de teste", quantity: "1", unit: "un", unitPrice: "12500.00" }],
    },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

for (const corruption of ["empty", "identity", "decision"] as const)
  test(`committed rejection with malformed ${corruption} response requires a validated read`, async ({
    page,
    request,
  }) => {
    const order = await create(request);
    await enter(page, tokens[0], `/purchase-orders/${order.id}`);
    let writes = 0;
    await page.route("**/decisions", async (route) => {
      writes++;
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      const saved = await response.json();
      await route.fulfill({
        response,
        json:
          corruption === "empty"
            ? {}
            : corruption === "identity"
              ? { ...saved, id: f.project.id }
              : { ...saved, steps: saved.steps.map((step: object) => ({ ...step, decision: null })) },
      });
    });
    await page.getByRole("button", { name: "Rejeitar", exact: true }).click();
    await page.getByLabel("Motivo da rejeição").fill("Preservar motivo após resposta inválida");
    await page.getByRole("button", { name: "Confirmar rejeição" }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Não foi possível confirmar");
    await expect(page.getByLabel("Motivo da rejeição")).toHaveValue("Preservar motivo após resposta inválida");
    await expect(page.getByRole("button", { name: "Confirmar rejeição" })).toBeDisabled();
    await expect(page.getByText("Rejeição registrada com sucesso.", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    // An invalid refresh must not release the stale guard either.
    await page.route(`**/purchase-orders/${order.id}`, (route) => route.fulfill({ status: 200, json: {} }));
    await page.getByRole("button", { name: "Atualizar", exact: true }).click();
    await expect(page.getByText("Não foi possível atualizar.", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Resumo do pedido", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprovar", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Rejeitar", exact: true })).toBeDisabled();
    await page.unroute(`**/purchase-orders/${order.id}`);
    await page.getByRole("button", { name: "Atualizar", exact: true }).click();
    await expect(page.getByRole("region", { name: "Decisão do pedido", exact: true })).toContainText(
      "A rejeição encerrou este pedido",
    );
    const saved = await (
      await request.get(`${API}/purchase-orders/${order.id}`, { headers: { authorization: `Bearer ${tokens[0]}` } })
    ).json();
    expect(saved.steps.filter((step: { decision: unknown }) => step.decision)).toHaveLength(1);
    expect(writes).toBe(1);
  });

for (const corruption of ["steps", "status"] as const)
  test(`unconfirmed intermediate approval with malformed ${corruption} requires refresh without repeating the committed decision`, async ({
    page,
    request,
  }) => {
    const order = await create(request);
    await enter(page, tokens[0], `/purchase-orders/${order.id}`);
    let writes = 0;
    await page.route("**/decisions", async (route) => {
      writes++;
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      const saved = await response.json();
      expect(saved.status).toBe("PENDING");
      await route.fulfill({
        response,
        json: corruption === "steps" ? { ...saved, steps: [] } : { ...saved, status: "REJECTED" },
      });
    });
    await page.getByRole("button", { name: "Aprovar", exact: true }).click();
    await confirmSave(page);
    const review = page.getByRole("dialog", { name: "Aprovar pedido" });
    await expect(review.getByRole("alert")).toContainText("Não foi possível confirmar");
    await expect(review.getByRole("button", { name: "Aprovar pedido", exact: true })).toBeDisabled();
    await review.getByRole("button", { name: "Voltar ao pedido" }).click();
    await expect(page.getByRole("button", { name: "Aprovar", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Atualizar", exact: true }).click();
    await expect(
      page.getByText(`Aguardando decisão de ${f.users[1].displayName}. Apenas o aprovador atual pode decidir.`),
    ).toBeVisible();
    const saved = await (
      await request.get(`${API}/purchase-orders/${order.id}`, { headers: { authorization: `Bearer ${tokens[0]}` } })
    ).json();
    expect(saved.steps.filter((step: { decision: unknown }) => step.decision)).toHaveLength(1);
    expect(writes).toBe(1);
  });

async function expectTerminalActions(page: Page, status: "APPROVED" | "REJECTED") {
  const decision = page.getByRole("region", { name: "Decisão do pedido", exact: true });
  const explanation =
    status === "APPROVED"
      ? "Todas as etapas foram aprovadas. Este pedido está concluído."
      : "A rejeição encerrou este pedido. Nenhuma outra decisão pode ser registrada.";
  let writes = 0;
  const countDecision = (request: Request) => {
    if (request.url().endsWith("/decisions")) writes++;
  };
  page.on("request", countDecision);
  try {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme });
        await expect(page.locator("html")).toHaveClass(colorScheme === "dark" ? /dark/ : /^(?!.*dark)/);
        await expect(decision.getByText(explanation, { exact: true })).toBeVisible();
        await expect(decision).not.toContainText("Sua decisão está disponível");
        for (const name of ["Rejeitar", "Aprovar"]) {
          const button = decision.getByRole("button", { name, exact: true });
          await expect(button).toBeVisible();
          await expect(button).toBeDisabled();
          await expect(button).toHaveAttribute("disabled", "");
          await expect(button).toHaveCSS("opacity", "1");
          await button.scrollIntoViewIfNeeded();
          const box = (await button.boundingBox())!;
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          await button.evaluate((element: HTMLButtonElement) => {
            element.click();
            element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            element.focus();
          });
          await expect(button).not.toBeFocused();
        }
        await page.keyboard.press("Enter");
        await page.keyboard.press("Space");
        await expect(page.getByRole("dialog")).not.toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    }
    // Flush browser work before checking that activation emitted no mutation.
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    expect(writes).toBe(0);
  } finally {
    page.off("request", countDecision);
  }
}

test("current approvers complete the real sequential workflow; admin cannot bypass", async ({
  page,
  browser,
  request,
}) => {
  const order = await create(request);
  const nextContext = await browser.newContext();
  const adminContext = await browser.newContext();
  try {
    const nextPage = await nextContext.newPage();
    const adminPage = await adminContext.newPage();
    await enter(page, tokens[0], `/purchase-orders/${order.id}`);
    await enter(nextPage, tokens[1], `/purchase-orders/${order.id}`);
    await enter(adminPage, adminToken, `/purchase-orders/${order.id}`);
    await expect(nextPage.getByRole("button", { name: "Aprovar", exact: true })).toBeDisabled();
    await expect(adminPage.getByRole("button", { name: "Aprovar", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Aprovar", exact: true }).click();
    const review = page.getByRole("dialog", { name: "Aprovar pedido", exact: true });
    await expect(review).toContainText(order.id.slice(0, 8));
    await expect(review.getByRole("button", { name: "Cancelar", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Aprovar", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Aprovar", exact: true }).click();
    await confirmSave(page);
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Aprovação registrada" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprovar", exact: true })).toBeDisabled();
    await nextPage.getByRole("button", { name: "Atualizar", exact: true }).click();
    await expect(nextPage.getByRole("button", { name: "Aprovar", exact: true })).toBeEnabled();
    await nextPage.getByRole("button", { name: "Aprovar", exact: true }).click();
    await confirmSave(nextPage);
    await expectTerminalActions(nextPage, "APPROVED");
    await nextPage.reload();
    await expectTerminalActions(nextPage, "APPROVED");
    const saved = await request.get(`${API}/purchase-orders/${order.id}`, {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const data = await saved.json();
    expect(data.status).toBe("APPROVED");
    expect(data.steps.map((s: { decision: { actorId: string } }) => s.decision.actorId)).toEqual(
      f.users.slice(0, 2).map((u) => u.id),
    );
  } finally {
    await nextContext.close();
    await adminContext.close();
  }
});

test("rejection validates reason before sending and persists terminal history", async ({ page, request }) => {
  const order = await create(request);
  await enter(page, tokens[0], `/purchase-orders/${order.id}`);
  await page.getByRole("button", { name: "Rejeitar", exact: true }).click();
  await page.getByLabel("Motivo da rejeição").fill("  ");
  await page.getByRole("button", { name: "Confirmar rejeição" }).click();
  await expect(page.getByRole("alert")).toContainText("Informe o motivo");
  await page.getByLabel("Motivo da rejeição").fill("Preço precisa ser revisto.");
  await page.getByRole("button", { name: "Confirmar rejeição" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("Preço precisa ser revisto.", { exact: false })).toBeVisible();
  await expect(page.getByText("Não executada · fluxo encerrado")).toBeVisible();
  await expectTerminalActions(page, "REJECTED");
  await page.reload();
  await expect(page.getByText("Preço precisa ser revisto.", { exact: false })).toBeVisible();
  await expectTerminalActions(page, "REJECTED");
});

test("a stale approval returns 409, refetches and never invents the next decision", async ({ page, request }) => {
  const order = await create(request);
  await enter(page, tokens[0], `/purchase-orders/${order.id}`);
  await expect(page.getByRole("button", { name: "Aprovar", exact: true })).toBeEnabled();
  const otherDecision = await request.post(`${API}/purchase-orders/${order.id}/decisions`, {
    headers: { authorization: `Bearer ${tokens[0]}` },
    data: { expectedStepIndex: 0, decision: "APPROVED" },
  });
  expect(otherDecision.status()).toBe(200);
  const conflict = page.waitForResponse(
    (response) => response.url().endsWith("/decisions") && response.status() === 409,
  );
  await page.getByRole("button", { name: "Aprovar", exact: true }).click();
  await confirmSave(page);
  await conflict;
  const review = page.getByRole("dialog", { name: "Aprovar pedido", exact: true });
  await expect(review.getByRole("alert")).toContainText("alterado por outro usuário");
  await expect(review.getByRole("button", { name: "Aprovar pedido", exact: true })).toBeDisabled();
  await review.getByRole("button", { name: "Voltar ao pedido", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("alterado por outro usuário");
  await expect(page.getByRole("button", { name: "Aprovar", exact: true })).toBeDisabled();
  await expect(
    page.getByText(`Aguardando decisão de ${f.users[1].displayName}. Apenas o aprovador atual pode decidir.`),
  ).toBeVisible();
});

test("failed approval stays visible, cannot be retried blindly and recovers after an explicit read", async ({
  page,
  request,
}) => {
  const order = await create(request);
  await enter(page, tokens[0], `/purchase-orders/${order.id}`);
  let writes = 0;
  await page.route("**/decisions", async (route) => {
    writes++;
    await route.fulfill({
      status: 500,
      json: { error: { code: "INTERNAL_ERROR", message: "Erro temporário", details: [] } },
    });
  });
  await page.getByRole("button", { name: "Aprovar", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Aprovar pedido" });
  await confirmSave(page);
  await expect(review).toBeVisible();
  await expect(review.getByRole("alert")).toContainText("Erro temporário");
  await expect(review.getByRole("alert")).toContainText("Atualizar");
  await expect(review.getByRole("button", { name: "Aprovar pedido", exact: true })).toBeDisabled();
  await expect(review.getByRole("button", { name: "Voltar ao pedido" })).toBeEnabled();
  expect(writes).toBe(1);
  await review.getByRole("button", { name: "Voltar ao pedido" }).click();
  await expect(review).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Aprovar", exact: true })).toBeDisabled();
  await page.unroute("**/decisions");
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Aprovar", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Aprovar", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Aprovar pedido" }).getByRole("alert")).toHaveCount(0);
});

test("conflicted approval review does not offer an unverified second write", async ({ page, request }) => {
  const order = await create(request);
  await enter(page, tokens[0], `/purchase-orders/${order.id}`);
  await expect(page.getByRole("button", { name: "Aprovar", exact: true })).toBeEnabled();
  const external = await request.post(`${API}/purchase-orders/${order.id}/decisions`, {
    headers: { authorization: `Bearer ${tokens[0]}` },
    data: { expectedStepIndex: 0, decision: "APPROVED" },
  });
  expect(external.status()).toBe(200);
  const conflict = page.waitForResponse(
    (response) => response.url().endsWith("/decisions") && response.status() === 409,
  );
  await page.getByRole("button", { name: "Aprovar", exact: true }).click();
  await confirmSave(page);
  await conflict;
  const review = page.getByRole("dialog", { name: "Aprovar pedido" });
  await expect(review).toBeVisible();
  await expect(review.getByRole("alert")).toContainText("alterado por outro usuário");
  await expect(review.getByRole("button", { name: "Aprovar pedido", exact: true })).toBeDisabled();
  await review.getByRole("button", { name: "Voltar ao pedido" }).click();
  await expect(
    page.getByText(`Aguardando decisão de ${f.users[1].displayName}. Apenas o aprovador atual pode decidir.`),
  ).toBeVisible();
});

test("server failures preserve rejection input, prevent repeat decisions and allow explicit refresh", async ({
  page,
  request,
}) => {
  const order = await create(request);
  await enter(page, tokens[0], `/purchase-orders/${order.id}`);
  let writes = 0;
  await page.route("**/decisions", async (route) => {
    writes++;
    await route.fulfill({
      status: 500,
      json: { error: { code: "INTERNAL_ERROR", message: "Erro temporário", details: [] } },
    });
  });
  await page.getByRole("button", { name: "Rejeitar", exact: true }).click();
  await page.getByLabel("Motivo da rejeição").fill("Preservar este motivo");
  await page.getByRole("button", { name: "Confirmar rejeição" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Erro temporário");
  await expect(page.getByLabel("Motivo da rejeição")).toHaveValue("Preservar este motivo");
  await expect(page.getByRole("button", { name: "Confirmar rejeição" })).toBeDisabled();
  expect(writes).toBe(1);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Erro temporário");
  await page.unroute("**/decisions");
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Aprovar", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Rejeitar", exact: true }).click();
  await expect(page.getByLabel("Motivo da rejeição")).toHaveValue("Preservar este motivo");
});

test("list URL filters and pagination work; hidden orders and large decimal amounts remain correct", async ({
  page,
  request,
}) => {
  await create(request);
  const order = await create(request, true);
  await enter(
    page,
    tokens[0],
    `/purchase-orders?projectId=${f.project.id}&status=PENDING&actionableByMe=true&pageSize=1`,
  );
  await expect(page.getByRole("link", { name: `Abrir pedido ${order.id.slice(0, 8)}` })).toBeVisible();
  await expect(page.getByRole("button", { name: /^(Aprovar|Rejeitar|Revisar(?: e decidir)?)$/ })).toHaveCount(0);
  await expect(page.getByText("R$ 9.999.999.999.999.999,99", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(page.getByRole("button", { name: /^Sua decisão/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("navigation", { name: "Paginação" })).toContainText(/2–2 de \d+ pedidos · Página 2/);
  await page.goto(`/purchase-orders/${order.id}`);
  await expect(page.getByText("R$ 9.999.999.999.999.999,99", { exact: true })).toBeVisible();
});

test("hidden resource displays a concealing 404; list reads can be retried after an outage", async ({
  page,
  request,
}) => {
  const order = await create(request);
  await enter(page, tokens[2], `/purchase-orders/${order.id}`);
  await expect(page.getByRole("alert")).toContainText("Recurso não encontrado");
  await page.route("**/api/v1/purchase-orders?**", (route) =>
    route.fulfill({
      status: 500,
      json: { error: { code: "INTERNAL_ERROR", message: "Lista indisponível", details: [] } },
    }),
  );
  await page.goto("/purchase-orders");
  await expect(page.getByRole("alert")).toContainText("Lista indisponível");
  await page.unroute("**/api/v1/purchase-orders?**");
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Você ainda não tem obras disponíveis" })).toBeVisible();
});

test("responsive shell, drawer keyboard focus and light/dark/system preference", async ({ page, request }) => {
  const order = await create(request);
  await page.emulateMedia({ colorScheme: "dark" });
  await enter(page, tokens[0], `/purchase-orders?projectId=${f.project.id}`);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByText("Administração", { exact: true })).not.toBeVisible();
  await appearance(page, "Claro");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await appearance(page, "Escuro");
  await page.reload();
  await openAccount(page);
  await expect(page.getByRole("radio", { name: "Escuro", exact: true })).toBeChecked();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await appearance(page, "Sistema");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  await closeAccount(page);
  await page.getByRole("button", { name: "Recolher navegação" }).click();
  await expect(page.getByRole("button", { name: "Expandir navegação" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("article").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^(Aprovar|Rejeitar|Revisar(?: e decidir)?)$/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  // The drawer carries navigation only; the account lives in the top-right menu.
  await expect(page.getByRole("group", { name: "Aparência", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir navegação" })).toBeFocused();
  await appearance(page, "Claro");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await closeAccount(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Expandir navegação" }).click();
  await openAccount(page);
  await expect(page.getByRole("radio", { name: "Claro", exact: true })).toBeChecked();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await closeAccount(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/purchase-orders/${order.id}`);
  await expect(page.getByRole("article").getByText("Total do item")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("/admin/projects");
  await expect(page.getByRole("alert")).toContainText("Você não tem permissão");
});

test("a protected 401 clears the active session and removes protected content", async ({ page }) => {
  await enter(page, tokens[0], "/purchase-orders");
  await expect(page.getByRole("heading", { name: "Pedidos de compra", exact: true })).toBeVisible();
  await page.route("**/api/v1/purchase-orders?**", (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: "UNAUTHENTICATED", message: "Sessão expirada", details: [] } },
    }),
  );
  await page.getByRole("button", { name: "Atualizar", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Pedidos de compra", exact: true })).not.toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("obraflow.accessToken"))).toBeNull();
});

test("a late list response cannot replace newer filter results", async ({ page, request }) => {
  await create(request);
  const source = await request.get(`${API}/purchase-orders?projectId=${f.project.id}`, {
    headers: { authorization: `Bearer ${tokens[0]}` },
  });
  const oldResults = await source.json();
  let heldRoute: Route | undefined;
  let firstSeen!: () => void;
  const firstRequest = new Promise<void>((resolve) => {
    firstSeen = resolve;
  });
  await page.route("**/api/v1/purchase-orders?**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("status") === "APPROVED") {
      await route.fulfill({
        json: {
          data: [],
          pagination: { page: 1, pageSize: 20, total: 0 },
          distribution: { total: 0, byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0 }, actionableByMe: 0 },
        },
      });
    } else {
      heldRoute = route;
      firstSeen();
    }
  });
  await enter(page, tokens[0], `/purchase-orders?projectId=${f.project.id}`);
  await firstRequest;
  await page.getByRole("button", { name: /^Aprovados/ }).click();
  await expect(page.getByRole("heading", { name: "Nenhum pedido encontrado" })).toBeVisible();
  await heldRoute!.fulfill({ json: oldResults }).catch(() => {
    /* Old request was cancelled. */
  });
  await expect(page.getByRole("heading", { name: "Nenhum pedido encontrado" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Abrir pedido/ })).toHaveCount(0);
});

test("rapid repeated approval clicks send only one pending write", async ({ page, request }) => {
  const order = await create(request);
  await enter(page, tokens[0], `/purchase-orders/${order.id}`);
  let writes = 0;
  let heldRoute: Route | undefined;
  await page.route("**/decisions", (route) => {
    writes++;
    heldRoute = route;
  });
  await page.getByRole("button", { name: "Aprovar", exact: true }).click();
  await page.locator("button[data-review-action]").evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  const review = page.getByRole("dialog", { name: "Aprovar pedido", exact: true });
  await expect(review.getByRole("button", { name: "Aprovando…", exact: true })).toBeDisabled();
  await expect(review.getByRole("button", { name: "Cancelar", exact: true })).toBeDisabled();
  await expect(review.getByRole("alert")).toHaveCount(0);
  await expect.poll(() => writes).toBe(1);
  expect(writes).toBe(1);
  await heldRoute!.continue();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Aprovação registrada" })).toBeVisible();
  expect(writes).toBe(1);
});

test("legacy demo notes have a readable presentation without changing the stored record", async ({ page, request }) => {
  const raw = `[obraflow-demo:v1:${f.project.id}:pending-first]`;
  const order = await create(request, false, raw);
  await enter(page, tokens[0], `/purchase-orders/${order.id}`);
  const notes = page.getByRole("region", { name: "Observações internas", exact: true });
  await expect(notes).toContainText("cronograma da obra");
  await expect(notes).not.toContainText("obraflow-demo");
  const response = await request.get(`${API}/purchase-orders/${order.id}`, {
    headers: { authorization: `Bearer ${tokens[0]}` },
  });
  expect((await response.json()).notes).toBe(raw);
});
