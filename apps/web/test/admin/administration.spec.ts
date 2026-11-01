import { confirmSave } from "../support/save-confirmation";
import { addMember } from "../support/members";
import { openCreation } from "../support/creation-dialog";
import { selectOption } from "../support/select";
import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
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
let extraProjects: string[], extraUsers: string[], extraSuppliers: string[];
test.beforeAll(async () => {
  database = await loadDatabase();
  server = await startServer();
});
test.beforeEach(async () => {
  f = await createFixture();
  adminToken = server.jwt.sign({ sub: f.admin.id });
  extraProjects = [];
  extraUsers = [];
  extraSuppliers = [];
});
test.afterEach(async () => {
  for (const id of extraProjects) {
    await database.transaction(async (manager) => {
      await manager.query(
        "DELETE FROM approval_decisions WHERE step_id IN (SELECT id FROM purchase_order_steps WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1))",
        [id],
      );
      await manager.query(
        "DELETE FROM purchase_order_steps WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1)",
        [id],
      );
      await manager.query(
        "DELETE FROM purchase_order_items WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1)",
        [id],
      );
      await manager.query("DELETE FROM purchase_orders WHERE project_id=$1", [id]);
      await manager.query("DELETE FROM coa_bands WHERE project_id=$1", [id]);
      await manager.query("DELETE FROM coa_revisions WHERE project_id=$1", [id]);
      await manager.query("DELETE FROM project_members WHERE project_id=$1", [id]);
      await manager.query("DELETE FROM project_lifecycle_events WHERE project_id=$1", [id]);
      await manager.query("DELETE FROM projects WHERE id=$1", [id]);
    });
  }
  await f?.cleanup();
  for (const id of extraSuppliers) await database.query("DELETE FROM suppliers WHERE id=$1", [id]);
  for (const id of extraUsers) {
    await database.query("DELETE FROM user_lifecycle_events WHERE target_user_id=$1", [id]);
    await database.query("DELETE FROM users WHERE id=$1", [id]);
  }
});
test.afterAll(async () => {
  await stopApi(server, database);
});
async function enter(page: Page, path = "/admin/users", token = adminToken) {
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await signInAs(page, token);
  await page.goto(path);
}

for (const ending of ["logout", "timeout", "expired restoration"] as const)
  test(`admin ${ending} clears the return path before the next login`, async ({ page }) => {
    const identity = (
      await server.inject({ url: "/api/v1/auth/me", headers: { authorization: `Bearer ${adminToken}` } })
    ).json();
    // Exercise client session/route handling without spending the login rate-limit budget.
    await page.route("**/auth/login", (route) => route.fulfill({ json: { accessToken: adminToken, user: identity } }));
    await enter(page);
    await expect(page.getByRole("heading", { name: "Usuários", exact: true })).toBeVisible();
    if (ending === "logout") {
      await page.getByRole("button", { name: "Abrir painel da conta", exact: false }).click();
      await page.getByRole("button", { name: "Logout", exact: true }).click();
    } else {
      await page.route(ending === "timeout" ? "**/api/v1/users" : "**/auth/me", (route) =>
        route.fulfill({
          status: 401,
          json: { error: { code: "UNAUTHENTICATED", message: "Sessão expirada.", details: [] } },
        }),
      );
      if (ending === "timeout") await page.getByRole("button", { name: "Atualizar usuários", exact: true }).click();
      else await page.reload();
    }
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => sessionStorage.getItem("obraflow.accessToken"))).toBeNull();
    await page.unroute("**/auth/me");
    await page.getByLabel("Usuário", { exact: true }).fill("admin");
    await page.getByLabel("Senha", { exact: true }).fill("test-session-return");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/purchase-orders$/);
    await expect(page.getByRole("heading", { name: "Pedidos de compra", exact: true })).toBeVisible();
  });

test("an initial anonymous admin deep link still returns after authentication", async ({ page }) => {
  const identity = (
    await server.inject({ url: "/api/v1/auth/me", headers: { authorization: `Bearer ${adminToken}` } })
  ).json();
  await page.route("**/auth/login", (route) => route.fulfill({ json: { accessToken: adminToken, user: identity } }));
  await page.goto("/admin/users?review=deep-link");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Usuário", { exact: true }).fill("admin");
  await page.getByLabel("Senha", { exact: true }).fill("test-session-return");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/users\?review=deep-link$/);
  await expect(page.getByRole("heading", { name: "Usuários", exact: true })).toBeVisible();
});
const card = (page: Page, name: string) =>
  page.getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });

test("creation dialogs restore from URLs and browser history without exposing or persisting form data", async ({
  page,
}) => {
  for (const kind of ["users", "suppliers", "projects"] as const) {
    await enter(page, `/admin/${kind}?review=setup`);
    const dialog = await openCreation(page, kind);
    await expect(page).toHaveURL(/mode=create/);
    const field = page.getByLabel(
      kind === "users" ? "Nome de exibição" : kind === "suppliers" ? "Nome do fornecedor" : "Nome da obra",
      { exact: true },
    );
    await field.fill("Rascunho local");
    await expect(dialog.locator("legend")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: /Voltar|Concluir/ })).toHaveCount(0);
    await page.goBack();
    await expect(dialog).toHaveCount(0);
    await page.goForward();
    await expect(dialog).toBeVisible();
    await expect(field).toHaveValue("Rascunho local");
    await page.reload();
    await expect(dialog).toBeVisible();
    await expect(field).toHaveValue("");
    expect(page.url()).not.toContain("Rascunho");
    await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(page).not.toHaveURL(/mode=/);
    await expect(page).toHaveURL(/review=setup/);
  }
});

test("deactivation URLs restore a confirmation without performing writes and handle missing or protected targets", async ({
  page,
}) => {
  let writes = 0;
  page.on("request", (request) => {
    if (request.method() !== "GET") writes++;
  });
  await enter(page, `/admin/users?deactivate=${f.users[2].id}`);
  const dialog = page.getByRole("dialog", { name: "Desativar usuário", exact: true });
  await expect(dialog).toContainText(f.users[2].displayName);
  await expect(dialog.getByRole("button", { name: "Desativar", exact: true })).toBeEnabled();
  await page.reload();
  await expect(dialog).toContainText(f.users[2].displayName);
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page).not.toHaveURL(/deactivate=/);
  await page.goBack();
  await expect(dialog).toBeVisible();
  await page.goto(`/admin/users?deactivate=${f.admin.id}`);
  await expect(dialog).toContainText("protegida");
  await expect(dialog.getByRole("button", { name: "Desativar", exact: true })).toHaveCount(0);
  await page.goto(`/admin/users?deactivate=${crypto.randomUUID()}`);
  await expect(dialog).toContainText("Cadastro não encontrado");
  expect(writes).toBe(0);
});
async function fillUser(page: Page, username: string, name = "Pessoa criada pela interface") {
  await openCreation(page, "users");
  await page.getByLabel("Nome de exibição", { exact: true }).fill(name);
  await page.getByLabel("Usuário", { exact: true }).fill(username);
  await page.getByLabel("Senha inicial", { exact: true }).fill("test-ui-password-2026");
}
async function createUi(page: Page, kind: "users" | "suppliers" | "projects") {
  const response = page.waitForResponse(
    (response) => response.url().endsWith(`/${kind}`) && response.request().method() === "POST",
  );
  await page
    .getByRole("button", {
      name: kind === "users" ? "Criar usuário" : kind === "suppliers" ? "Criar fornecedor" : "Criar obra",
      exact: true,
    })
    .click();

  const result = await response;
  expect(result.status()).toBe(201);
  const created = await result.json();
  (kind === "users" ? extraUsers : kind === "suppliers" ? extraSuppliers : extraProjects).push(created.id);
  return created;
}
async function configure(
  request: APIRequestContext,
  version: number,
  bands = [
    { upperLimit: "10000.00" as string | null, approverId: f.users[0].id },
    { upperLimit: null, approverId: f.users[1].id },
  ],
) {
  const result = await request.put(`${API}/projects/${f.project.id}/coa`, {
    headers: { authorization: `Bearer ${adminToken}` },
    data: { expectedCoaVersion: version, bands },
  });
  expect(result.status()).toBe(200);
}

test("complete UI setup provisions a login, project, supplier and ladder; deactivation preserves approved history", async ({
  page,
  browser,
  request,
}) => {
  // This exercises provisioning, multiple sessions and lifecycle/audit reads on real PostgreSQL.
  test.setTimeout(60000);
  const username = `UI-${crypto.randomUUID()}`;
  const person = `Pessoa UI ${crypto.randomUUID().slice(0, 8)}`;
  const supplierName = `Fornecedor UI ${crypto.randomUUID().slice(0, 8)}`;
  await enter(page);
  await fillUser(page, username, person);
  const user = await createUi(page, "users");
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Usuário criado" })).toContainText(person);
  expect(user.username).toBe(username.toLowerCase());
  expect(user.role).toBe("USER");
  expect(user.password).toBeUndefined();
  expect(user.passwordHash).toBeUndefined();
  await expect(page.getByLabel("Senha inicial", { exact: true })).toHaveCount(0);
  await expect(card(page, person)).toContainText("Ativo");
  expect(
    await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }).includes("test-ui-password-2026")),
  ).toBe(false);
  await page.getByRole("link", { name: "Fornecedores", exact: true }).click();
  await openCreation(page, "suppliers");
  await page.getByLabel("Nome do fornecedor", { exact: true }).fill(supplierName);
  const supplier = await createUi(page, "suppliers");
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Fornecedor criado" })).toContainText(
    supplierName,
  );
  await page.getByRole("link", { name: "Obras", exact: true }).click();
  await openCreation(page, "projects");
  await page.getByLabel("Nome da obra").fill(`Obra completa ${crypto.randomUUID().slice(0, 8)}`);
  const project = await createUi(page, "projects");
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Obra criada" })).toContainText(project.name);
  await page.getByRole("button", { name: "Gerenciar membros", exact: true }).click();
  for (const member of [user, f.admin]) {
    await addMember(page, member.id);
    await expect(page.getByRole("list", { name: "Membros da obra" })).toContainText(member.displayName);
    await expect(page.getByRole("button", { name: "Atualizar membros", exact: true })).toBeEnabled();
  }
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await selectOption(page.getByLabel("Aprovador do nível 1", { exact: true }), user.id);
  await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
  await confirmSave(page);
  await expect(page.getByTestId("coa-view").getByText("Versão: 1", { exact: true })).toBeVisible();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Alçada publicada" })).toContainText("Versão 1.");
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Alçada publicada" })).toContainText(project.name);
  await page.getByRole("link", { name: "Pedidos de compra", exact: true }).click();
  await page.getByRole("button", { name: "Novo pedido", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Novo pedido", exact: true })).toBeVisible();
  await selectOption(
    page.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Obra", { exact: true }),
    project.id,
  );
  await selectOption(
    page.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Fornecedor", { exact: true }),
    supplier.id,
  );
  await page.getByLabel("Descrição", { exact: true }).fill("Compra configurada inteiramente pela interface");
  await page.getByLabel("Quantidade", { exact: true }).fill("1");
  await page.getByLabel("Unidade", { exact: true }).fill("un");
  await page.getByLabel("Preço unitário (R$)", { exact: true }).fill("125.50");
  await page
    .getByRole("form", { name: "Novo pedido", exact: true })
    .getByRole("button", { name: "Cadastrar pedido", exact: true })
    .click();
  await confirmSave(page);
  await expect(page).toHaveURL(/\/purchase-orders\/[0-9a-f-]+$/);
  const orderId = page.url().split("/").at(-1);
  const context = await browser.newContext();
  try {
    const approver = await context.newPage();
    await approver.goto("/login");
    await approver.getByLabel("Usuário", { exact: true }).fill(username);
    await approver.getByLabel("Senha", { exact: true }).fill("test-ui-password-2026");
    await approver.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(approver.getByRole("heading", { name: "Pedidos de compra", exact: true })).toBeVisible();
    await approver.goto(`/purchase-orders/${orderId}`);
    await approver.getByRole("button", { name: "Aprovar", exact: true }).click();
    await confirmSave(approver);
    await expect(approver.getByText("Todas as etapas foram aprovadas. Este pedido está concluído.")).toBeVisible();
    const before = await (
      await request.get(`${API}/purchase-orders/${orderId}`, { headers: { authorization: `Bearer ${adminToken}` } })
    ).json();
    await page.goto(`/admin/projects/${project.id}`);
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await selectOption(page.getByLabel("Aprovador do nível 1", { exact: true }), f.admin.id);
    await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
    await confirmSave(page);
    await expect(page.getByTestId("coa-view").getByText("Versão: 2", { exact: true })).toBeVisible();
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Alçada publicada" })).toContainText(
      "Versão 2.",
    );
    await page.getByRole("link", { name: "Usuários", exact: true }).click();
    await card(page, person)
      .getByRole("button", { name: `Desativar ${person}`, exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText("decisões anteriores serão preservados");
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(card(page, person)).toContainText("Ativo");
    await card(page, person)
      .getByRole("button", { name: `Desativar ${person}`, exact: true })
      .click();
    await page.getByRole("button", { name: "Desativar", exact: true }).click();
    await expect(card(page, person)).toContainText("Inativo");
    await approver.reload();
    await expect(approver).toHaveURL(/\/login$/);
    await page.getByRole("link", { name: "Fornecedores", exact: true }).click();
    await card(page, supplierName)
      .getByRole("button", { name: `Desativar ${supplierName}`, exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "Pedidos anteriores, inclusive os em andamento, não serão afetados",
    );
    await page.getByRole("button", { name: "Desativar", exact: true }).click();
    await selectOption(page.getByLabel("Situação do cadastro", { exact: true }), "inactive");
    await expect(card(page, supplierName)).toContainText("Inativo");
    await page.goto(`/purchase-orders/${orderId}`);
    await expect(page.getByText("Fornecedor inativo.", { exact: false })).toBeVisible();
    const after = await (
      await request.get(`${API}/purchase-orders/${orderId}`, { headers: { authorization: `Bearer ${adminToken}` } })
    ).json();
    expect(after.steps).toEqual(before.steps);
    expect(after.status).toBe("APPROVED");
    expect(after.coaVersion).toBe(1);
    const revisions = await (
      await request.get(`${API}/projects/${project.id}/coa/revisions`, {
        headers: { authorization: `Bearer ${adminToken}` },
      })
    ).json();
    expect(revisions.data[1].bands[0].approverId).toBe(user.id);
  } finally {
    await context.close();
  }
});

test("both real user-deactivation conflicts explain remediation and retain active users and pending snapshots", async ({
  page,
  request,
}) => {
  await configure(request, 0);
  const created = await request.post(`${API}/purchase-orders`, {
    headers: { authorization: `Bearer ${server.jwt.sign({ sub: f.users[0].id })}` },
    data: {
      projectId: f.project.id,
      supplierId: f.supplier.id,
      orderDate: "2026-10-22",
      items: [{ description: "Pedido pendente", quantity: "1", unit: "un", unitPrice: "12500" }],
    },
  });
  expect(created.status()).toBe(201);
  const order = await created.json();
  await enter(page);
  await card(page, f.users[0].displayName)
    .getByRole("button", { name: `Desativar ${f.users[0].displayName}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Desativar", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("alçada publicada");
  await expect(page.getByRole("link", { name: "Revisar alçadas nas obras" })).toBeVisible();
  await configure(request, 1, [{ upperLimit: null, approverId: f.users[1].id }]);
  await expect(page.getByRole("button", { name: "Desativar", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Atualizar estado", exact: true }).click();
  await expect(page.getByRole("button", { name: "Desativar", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Desativar", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("etapas ainda não decididas");
  await expect(page.getByRole("link", { name: "Consultar pedidos pendentes" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(card(page, f.users[0].displayName)).toContainText("Ativo");
  const unchanged = await (
    await request.get(`${API}/purchase-orders/${order.id}`, { headers: { authorization: `Bearer ${adminToken}` } })
  ).json();
  expect(unchanged.steps).toEqual(order.steps);
  expect(unchanged.status).toBe("PENDING");
  const lifecycle = await database.query(
    "SELECT 1 FROM user_lifecycle_events WHERE target_user_id=$1 AND action='DISABLED'",
    [f.users[0].id],
  );
  expect(lifecycle).toHaveLength(0);
  const trigger = card(page, f.users[0].displayName).getByRole("button", {
    name: `Desativar ${f.users[0].displayName}`,
    exact: true,
  });
  await trigger.click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true })).toBeFocused();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("button", { name: "Desativar", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("etapas ainda não decididas");
  const ended = await request.post(`${API}/purchase-orders/${order.id}/decisions`, {
    headers: { authorization: `Bearer ${server.jwt.sign({ sub: f.users[0].id })}` },
    data: { expectedStepIndex: 0, decision: "REJECTED", reason: "Encerramento para revisar o orçamento." },
  });
  expect(ended.status()).toBe(200);
  await expect(page.getByRole("button", { name: "Desativar", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Atualizar estado", exact: true }).click();
  await expect(page.getByRole("button", { name: "Desativar", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Desativar", exact: true }).click();
  await expect(card(page, f.users[0].displayName)).toContainText("Inativo");
  const historical = await (
    await request.get(`${API}/purchase-orders/${order.id}`, { headers: { authorization: `Bearer ${adminToken}` } })
  ).json();
  expect(historical.status).toBe("REJECTED");
  expect(historical.coaVersion).toBe(order.coaVersion);
  expect(historical.steps.map((step: { approverId: string }) => step.approverId)).toEqual(
    order.steps.map((step: { approverId: string }) => step.approverId),
  );
});

test("user validation and duplicate handles preserve fields; admin has no deactivation action", async ({ page }) => {
  await enter(page);
  await expect(card(page, f.admin.displayName)).toContainText("Conta protegida");
  await expect(card(page, f.admin.displayName).getByRole("button")).toHaveCount(0);
  await fillUser(page, "a", " ");
  await page.getByLabel("Senha inicial", { exact: true }).fill("short");
  await page.getByLabel("Nome de exibição", { exact: true }).blur();
  await page.getByLabel("Senha inicial", { exact: true }).blur();
  await expect(page.getByText("Informe o nome de exibição.")).toBeVisible();
  await expect(page.getByText("Use ao menos 8 caracteres.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar usuário", exact: true })).toBeEnabled();
  await fillUser(page, "ADMIN");
  await page.getByRole("button", { name: "Criar usuário", exact: true }).click();
  await expect(page.getByLabel("Usuário", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Senha inicial", { exact: true })).toHaveValue("test-ui-password-2026");
  await page.getByLabel("Usuário", { exact: true }).fill(`ui-${crypto.randomUUID()}`);
  await createUi(page, "users");
  await expect(page.getByLabel("Senha inicial", { exact: true })).toHaveCount(0);
  await selectOption(page.getByLabel("Situação do cadastro"), "inactive");
  await page.getByLabel("Buscar usuários").fill("does-not-exist");
  await expect(page.getByText("Nenhum resultado para estes filtros")).toBeVisible();
});

for (const kind of ["users", "suppliers"] as const) {
  test(`uncertain ${kind} creation reads the actual result without retrying or clearing the form`, async ({ page }) => {
    const handle = `ui-${crypto.randomUUID()}`;
    const name = `Cadastro incerto ${crypto.randomUUID().slice(0, 8)}`;
    await enter(page, `/admin/${kind}`);
    if (kind === "users") await fillUser(page, handle, name);
    else {
      await openCreation(page, "suppliers");
      await page.getByLabel("Nome do fornecedor").fill(name);
    }
    let posts = 0;
    await page.route(`**/api/v1/${kind}`, async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      posts++;
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      const result = await response.json();
      (kind === "users" ? extraUsers : extraSuppliers).push(result.id);
      return route.fulfill({
        status: 500,
        json: { error: { code: "FAILED_RESPONSE", message: "Resposta indisponível.", details: [] } },
      });
    });
    await page
      .getByRole("button", { name: kind === "users" ? "Criar usuário" : "Criar fornecedor", exact: true })
      .click();

    await expect(page.getByText("O cadastro pode ter sido concluído.", { exact: false })).toBeVisible();
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
    await expect(
      page.getByRole("dialog", {
        name: kind === "users" ? "Criar usuário" : "Criar fornecedor",
        exact: true,
        includeHidden: true,
      }),
    ).toHaveCount(0);
    await page
      .getByRole("dialog", { name: kind === "users" ? "Novo usuário" : "Novo fornecedor", exact: true })
      .getByRole("button", { name: "Fechar", exact: true })
      .click();
    await expect(card(page, name)).toContainText("Ativo");
    await openCreation(page, kind);
    await expect(
      page.getByLabel(kind === "users" ? "Nome de exibição" : "Nome do fornecedor", { exact: true }),
    ).toHaveValue(name);
    await expect(
      page.getByRole("button", { name: kind === "users" ? "Criar usuário" : "Criar fornecedor", exact: true }),
    ).toBeDisabled();
    expect(posts).toBe(1);
    await page.getByRole("button", { name: "Liberar novo envio" }).click();
    expect(posts).toBe(1);
    await expect(page.getByRole("button", { name: "Limpar formulário" })).toHaveCount(0);
    if (kind === "users")
      await expect(page.getByLabel("Senha inicial", { exact: true })).toHaveValue("test-ui-password-2026");
  });
}

test("a lost deactivation response reads inactive state and prevents another confirmation", async ({ page }) => {
  await enter(page, "/admin/suppliers");
  let deletes = 0;
  await page.route(`**/api/v1/suppliers/${f.supplier.id}`, async (route) => {
    deletes++;
    expect((await route.fetch()).status()).toBe(204);
    await route.abort("failed");
  });
  await card(page, f.supplier.name)
    .getByRole("button", { name: `Desativar ${f.supplier.name}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Desativar", exact: true }).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByRole("dialog")).toContainText("O cadastro já está inativo");
  await expect(page.getByRole("button", { name: "Desativar", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await selectOption(page.getByLabel("Situação do cadastro", { exact: true }), "inactive");
  await expect(card(page, f.supplier.name)).toContainText("Inativo");
  expect(deletes).toBe(1);
});

test("supplier read and field errors recover on mobile without losing input; empty filters are readable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let unavailable = true;
  await page.route("**/api/v1/suppliers", async (route) => {
    if (route.request().method() === "GET")
      return unavailable
        ? route.fulfill({
            status: 503,
            json: { error: { code: "UNAVAILABLE", message: "Consulta indisponível.", details: [] } },
          })
        : route.continue();
    return route.fulfill({
      status: 400,
      json: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Revise o cadastro.",
          details: [{ field: "name", code: "CUSTOM", message: "Nome recusado pelo servidor." }],
        },
      },
    });
  });
  await enter(page, "/admin/suppliers");
  await openCreation(page, "suppliers");
  await page.getByLabel("Nome do fornecedor").fill("Preservar fornecedor");
  await expect(page.getByRole("button", { name: "Criar fornecedor", exact: true })).toBeDisabled();
  unavailable = false;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await page.getByRole("button", { name: "Criar fornecedor", exact: true }).click();
  await expect(page.getByLabel("Nome do fornecedor")).toHaveValue("Preservar fornecedor");
  await expect(page.getByText("Nome recusado pelo servidor.")).toBeVisible();
  await openCreation(page, "suppliers");
  await page.getByLabel("Nome do fornecedor").fill("Nome corrigido");
  await expect(page.getByText("Nome recusado pelo servidor.")).toHaveCount(0);
  await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByLabel("Buscar fornecedores").fill("inexistente-uuid");
  await expect(page.getByText("Nenhum resultado para estes filtros")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("ordinary users cannot enter either directory or see administration navigation", async ({ page }) => {
  await enter(page, "/admin/users", server.jwt.sign({ sub: f.users[0].id }));
  await expect(page.getByRole("alert")).toContainText("Você não tem permissão");
  await expect(page.getByRole("link", { name: "Usuários", exact: true })).toHaveCount(0);
  await page.goto("/admin/suppliers");
  await expect(page.getByRole("alert")).toContainText("Você não tem permissão");
  await expect(page.getByRole("heading", { name: "Fornecedores", exact: true })).toHaveCount(0);
});

test("administration creation actions open bounded dialogs and retain fields on Escape and outside dismissal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 650 });
  for (const kind of ["users", "suppliers", "projects"] as const) {
    await enter(page, `/admin/${kind}`);
    const label = { users: "Nome de exibição", suppliers: "Nome do fornecedor", projects: "Nome da obra" }[kind];
    await expect(page.getByLabel(label, { exact: true })).toHaveCount(0);
    const dialog = await openCreation(page, kind);
    const input = dialog.getByLabel(label, { exact: true });
    await input.fill("Cadastro local");
    await input.press("Escape");
    await expect(dialog).toHaveCount(0);
    await openCreation(page, kind);
    await expect(input).toHaveValue("Cadastro local");
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(650);
    await page.mouse.click(2, 2);
    await expect(dialog).toHaveCount(0);
    await openCreation(page, kind);
    await expect(input).toHaveValue("Cadastro local");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("success notifications survive route changes, cap the stack and clear on logout", async ({ page }) => {
  await enter(page, "/admin/suppliers?mode=create");
  for (let index = 0; index < 4; index++) {
    if (index) await openCreation(page, "suppliers");
    const name = `Aviso ${index} ${crypto.randomUUID()}`;
    await page.getByLabel("Nome do fornecedor", { exact: true }).fill(name);
    await createUi(page, "suppliers");
    await expect(page.locator('[data-sonner-toast][data-front="true"]')).toContainText(name);
    expect(await page.locator('[data-sonner-toast][data-visible="true"]').count()).toBeLessThanOrEqual(3);
  }
  // Earlier five-second notifications may expire while the four real writes run.
  await expect(page.locator('[data-sonner-toast][data-front="true"]')).toBeVisible();
  await page.getByRole("link", { name: "Obras", exact: true }).click();
  await expect(page.locator('[data-sonner-toast][data-front="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Abrir painel da conta", exact: false }).click();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
});
