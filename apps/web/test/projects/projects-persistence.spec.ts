import { confirmSave } from "../support/save-confirmation";
import { addMember, addMemberButton, openAddMembers } from "../support/members";
import { openCreation } from "../support/creation-dialog";
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
let token: string;
let extraProjects: string[];
test.beforeAll(async () => {
  database = await loadDatabase();
  server = await startServer();
});
test.beforeEach(async () => {
  f = await createFixture();
  token = server.jwt.sign({ sub: f.admin.id });
  extraProjects = [];
});
test.afterEach(async () => {
  for (const id of extraProjects)
    await database.transaction(async (manager) => {
      await manager.query(
        "DELETE FROM approval_decisions WHERE step_id IN (SELECT id FROM purchase_order_steps WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1))",
        [id],
      );
      for (const table of ["purchase_order_steps", "purchase_order_items"])
        await manager.query(
          `DELETE FROM ${table} WHERE order_id IN (SELECT id FROM purchase_orders WHERE project_id=$1)`,
          [id],
        );
      for (const table of ["purchase_orders", "coa_bands", "coa_revisions", "project_members"])
        await manager.query(`DELETE FROM ${table} WHERE project_id=$1`, [id]);
      await manager.query("DELETE FROM project_lifecycle_events WHERE project_id=$1", [id]);
      await manager.query("DELETE FROM projects WHERE id=$1", [id]);
    });
  await f?.cleanup();
});
test.afterAll(async () => {
  await stopApi(server, database);
});
const headers = () => ({ authorization: `Bearer ${token}` });
async function enter(page: Page, id = f.project.id) {
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await signInAs(page, token);
  await page.goto(`/admin/projects/${id}`);
  await expect(page.getByTestId("coa-view")).toBeVisible();
}
async function edit(page: Page) {
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cancelar", exact: true })).toBeVisible();
}
async function money(page: Page, name: string, value: string) {
  await page.getByRole("button", { name: `Editar limite após ${name}`, exact: false }).click();
  const input = page.getByRole("textbox", { name: `Limite após ${name} (R$)`, exact: true });
  await input.fill(value);
  await input.press("Enter");
}
async function ladder(page: Page, limit = "10000.00") {
  await edit(page);
  await selectOption(page.getByLabel("Aprovador do nível 1", { exact: true }), f.users[0].id);
  await page.getByRole("button", { name: "Adicionar nível" }).click();
  await selectOption(page.getByLabel("Aprovador do nível 2", { exact: true }), f.users[1].id);
  await money(page, f.users[0].displayName, limit);
}
async function publish(page: Page, version: number) {
  await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
  await confirmSave(page);
  await expect(page.getByTestId("coa-view").getByText(`Versão: ${version}`, { exact: true })).toBeVisible();
}
async function configure(limit = "10000.00", expected = 0) {
  const result = await server.inject({
    method: "PUT",
    url: `/api/v1/projects/${f.project.id}/coa`,
    headers: headers(),
    payload: {
      expectedCoaVersion: expected,
      bands: [
        { upperLimit: limit, approverId: f.users[0].id },
        { upperLimit: null, approverId: f.users[1].id },
      ],
    },
  });
  expect(result.statusCode).toBe(200);
  return result.json();
}
async function current(id = f.project.id) {
  return (await server.inject({ method: "GET", url: `/api/v1/projects/${id}/coa`, headers: headers() })).json();
}
async function revisions() {
  return (
    await server.inject({ method: "GET", url: `/api/v1/projects/${f.project.id}/coa/revisions`, headers: headers() })
  ).json();
}

test("directory failure leaves membership and published CoA readable and candidates can be retried", async ({
  page,
}) => {
  await configure();
  let unavailable = true,
    reads = 0;
  await page.route("**/api/v1/users", (route) => {
    reads++;
    return unavailable
      ? route.fulfill({
          status: 503,
          json: { error: { code: "UNAVAILABLE", message: "Diretório indisponível.", details: [] } },
        })
      : route.continue();
  });
  await enter(page);
  expect(reads).toBe(0);
  await page.getByRole("button", { name: "Gerenciar membros", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Gerenciar membros", exact: true });
  await expect(dialog.getByRole("list", { name: "Membros da obra" })).toContainText(f.users[0].displayName);
  await openAddMembers(page);
  await expect(dialog.getByRole("alert")).toContainText("Diretório indisponível.");
  await expect(page.getByTestId("coa-view")).toContainText("Versão: 1");
  unavailable = false;
  await dialog.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(addMemberButton(page, f.users[2].id)).toBeEnabled();
  await dialog.getByRole("button", { name: "Voltar aos membros", exact: true }).click();
  await expect(dialog.getByRole("list", { name: "Membros da obra" })).toContainText("Na alçada publicada");
});

test("adding uses one confirmed write, restores search focus and handles accented names", async ({ page }) => {
  await database.query("UPDATE users SET display_name='Inês Souza' WHERE id=$1", [f.users[2].id]);
  await enter(page);
  await page.getByRole("button", { name: "Gerenciar membros", exact: true }).click();
  await openAddMembers(page);
  const dialog = page.getByRole("dialog", { name: "Gerenciar membros", exact: true });
  const search = dialog.getByLabel("Buscar usuários", { exact: true });
  await search.fill("ines");
  await expect(addMemberButton(page, f.users[2].id)).toBeEnabled();
  let release!: () => void,
    writes = 0;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/projects/${f.project.id}/members`, async (route) => {
    if (route.request().method() === "POST") {
      writes++;
      await held;
    }
    return route.continue();
  });
  try {
    await addMemberButton(page, f.users[2].id).click();
    await expect(dialog.getByText("Adicionando membro…", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Fechar", exact: true })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    release();
    await expect(dialog.getByRole("button", { name: "Atualizar membros", exact: true })).toBeEnabled();
    await expect(search).toBeFocused();
    await expect(addMemberButton(page, f.users[2].id)).toHaveCount(0);
    await expect(dialog.getByRole("status")).toContainText("Inês Souza");
    await expect(dialog.getByRole("status")).toHaveClass("sr-only");
    await expect(dialog.getByText("Os vínculos são salvos imediatamente.", { exact: false })).toHaveCount(0);
    expect(writes).toBe(1);
    await dialog.getByRole("button", { name: "Voltar aos membros", exact: true }).click();
    await expect(dialog.getByRole("list", { name: "Membros da obra" })).toContainText("Inês Souza");
    await expect(search).toHaveValue("ines");
    await openAddMembers(page);
    await expect(search).toHaveValue("ines");
    await expect(search).toBeFocused();
    await expect(dialog.getByText("Nenhum usuário disponível corresponde à busca.", { exact: true })).toBeVisible();
    expect((await current()).coaVersion).toBe(0);
  } finally {
    release();
  }
});

test("a newly published assignment returns authoritative 409 recovery without offering a repeated removal", async ({
  page,
}) => {
  await enter(page);
  await page.getByRole("button", { name: "Gerenciar membros", exact: true }).click();
  await configure(); // The published chain changes after the page's original read.
  const dialog = page.getByRole("dialog", { name: "Gerenciar membros", exact: true });
  let writes = 0;
  page.on("request", (request) => {
    if (request.method() === "DELETE") writes++;
  });
  await dialog.getByRole("button", { name: `Remover ${f.users[1].displayName} da obra`, exact: true }).click();
  await dialog.getByRole("button", { name: "Confirmar remoção", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("alçada publicada");
  await expect(dialog.getByRole("button", { name: "Confirmar remoção", exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Cancelar remoção", exact: true })).toBeVisible();
  await expect(dialog.getByRole("list", { name: "Membros da obra" })).toBeVisible();
  expect(writes).toBe(1);
  await dialog.getByRole("button", { name: "Cancelar remoção", exact: true }).click();
  await expect(dialog.getByRole("list", { name: "Membros da obra" })).toContainText(f.users[1].displayName);
});

test("an immutable pending assignment blocks removal after a replacement CoA was published", async ({ page }) => {
  await configure();
  const order = await server.inject({
    method: "POST",
    url: "/api/v1/purchase-orders",
    headers: { authorization: `Bearer ${server.jwt.sign({ sub: f.users[0].id })}` },
    payload: {
      projectId: f.project.id,
      supplierId: f.supplier.id,
      orderDate: "2026-10-29",
      items: [{ description: "Material", quantity: "1", unit: "lote", unitPrice: "10001.00" }],
    },
  });
  expect(order.statusCode).toBe(201);
  const replacement = await server.inject({
    method: "PUT",
    url: `/api/v1/projects/${f.project.id}/coa`,
    headers: headers(),
    payload: {
      expectedCoaVersion: 1,
      bands: [{ upperLimit: null, approverId: f.users[0].id }],
    },
  });
  expect(replacement.statusCode).toBe(200);
  await enter(page);
  await page.getByRole("button", { name: "Gerenciar membros", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Gerenciar membros", exact: true });
  await dialog.getByRole("button", { name: `Remover ${f.users[1].displayName} da obra`, exact: true }).click();
  await dialog.getByRole("button", { name: "Confirmar remoção", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("aprovações pendentes");
  await expect(dialog.getByRole("button", { name: "Confirmar remoção", exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Ir para a alçada", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cancelar remoção", exact: true }).click();
  await expect(dialog.getByRole("list", { name: "Membros da obra" })).toContainText(f.users[1].displayName);
});

test("a lost addition response reconciles the actual membership without replaying the write", async ({ page }) => {
  await enter(page);
  await ladder(page, "12345.67");
  await page.getByRole("button", { name: "Gerenciar membros", exact: true }).click();
  await openAddMembers(page);
  let writes = 0;
  await page.route(`**/projects/${f.project.id}/members`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    writes++;
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    return route.fulfill({
      status: 503,
      json: { error: { code: "LOST", message: "Resposta indisponível.", details: [] } },
    });
  });
  await addMemberButton(page, f.users[2].id).click();
  const dialog = page.getByRole("dialog", { name: "Gerenciar membros", exact: true });
  await expect(dialog.getByRole("alert")).toContainText("Resposta indisponível.");
  await expect(dialog.getByRole("button", { name: "Atualizar membros", exact: true })).toBeEnabled();
  await expect(addMemberButton(page, f.users[2].id)).toHaveCount(0);
  await dialog.getByRole("button", { name: "Voltar aos membros", exact: true }).click();
  await expect(dialog.getByRole("list", { name: "Membros da obra" })).toContainText(f.users[2].displayName);
  expect(writes).toBe(1);
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Editar limite após Approver 0", exact: false })).toHaveText(
    "R$ 12.345,67",
  );
});

test("member dialog survives refresh and Back/Forward while close preserves other URL parameters", async ({ page }) => {
  await enter(page);
  await page.goto(`/admin/projects/${f.project.id}?review=setup`);
  await page.getByRole("button", { name: "Gerenciar membros", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Gerenciar membros", exact: true });
  await expect(page).toHaveURL(/dialog=members/);
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await page.goForward();
  await expect(dialog).toBeVisible();
  await page.reload();
  await expect(dialog.getByRole("list", { name: "Membros da obra" })).toContainText(f.users[0].displayName);
  await expect(dialog.getByRole("button", { name: "Concluir" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page).not.toHaveURL(/dialog=/);
  await expect(page).toHaveURL(/review=setup/);
});

test("admin sets up members, publishes a complete ladder and creates a PO whose snapshot survives a later save", async ({
  page,
}) => {
  await enter(page);
  await page.getByRole("link", { name: "Voltar às obras" }).click();
  await openCreation(page, "projects");
  await page.getByLabel("Nome da obra").fill(`Obra UI ${crypto.randomUUID()}`);
  const response = page.waitForResponse(
    (value) => value.request().method() === "POST" && value.url().endsWith("/projects"),
  );
  await page.getByRole("button", { name: "Criar obra", exact: true }).click();
  const project = await (await response).json();
  extraProjects.push(project.id);
  await expect(page.getByRole("button", { name: "Editar", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Gerenciar membros", exact: true }).click();
  for (const person of [f.admin, ...f.users.slice(0, 2)]) {
    await addMember(page, person.id);
    await expect(page.getByRole("list", { name: "Membros da obra" })).toContainText(person.displayName);
    await expect(page.getByRole("button", { name: "Atualizar membros", exact: true })).toBeEnabled();
  }
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await ladder(page);
  expect((await current(project.id)).coaVersion).toBe(0);
  await publish(page, 1);
  await page.goto("/purchase-orders?mode=create");
  await selectOption(
    page.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Obra", { exact: true }),
    project.id,
  );
  await selectOption(
    page.getByRole("form", { name: "Novo pedido", exact: true }).getByLabel("Fornecedor", { exact: true }),
    f.supplier.id,
  );
  await page.getByLabel("Descrição", { exact: true }).fill("Materiais da nova obra");
  await page.getByLabel("Quantidade", { exact: true }).fill("1");
  await page.getByLabel("Unidade", { exact: true }).fill("un");
  await page.getByLabel("Preço unitário (R$)", { exact: true }).fill("12500");
  await page
    .getByRole("form", { name: "Novo pedido", exact: true })
    .getByRole("button", { name: "Cadastrar pedido", exact: true })
    .click();
  await confirmSave(page);
  await expect(page).toHaveURL(/\/purchase-orders\/[0-9a-f-]+$/);
  const orderUrl = `/api/v1/purchase-orders/${page.url().split("/").at(-1)}`;
  const order = (await server.inject({ method: "GET", url: orderUrl, headers: headers() })).json();
  expect(order.steps.map((step: { approverId: string }) => step.approverId)).toEqual(
    f.users.slice(0, 2).map((person) => person.id),
  );
  await enter(page, project.id);
  await edit(page);
  await money(page, f.users[0].displayName, "15000.00");
  await publish(page, 2);
  const original = (await server.inject({ method: "GET", url: orderUrl, headers: headers() })).json();
  expect(original.coaVersion).toBe(1);
  expect(original.steps).toEqual(order.steps);
});

test("a real version conflict preserves the draft until an explicit rebase and second publication", async ({
  page,
}) => {
  await configure();
  await enter(page);
  await edit(page);
  await money(page, f.users[0].displayName, "12345.67");
  await configure("20000.00", 1);
  const writes: unknown[] = [];
  page.on("request", (request) => {
    if (request.method() === "PUT") writes.push(request.postDataJSON());
  });
  await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
  await confirmSave(page);
  await expect(page.getByRole("region", { name: "Reconciliação da alçada" })).toContainText("Versão publicada 2");
  await expect(page.getByRole("button", { name: "Editar limite após Approver 0", exact: false })).toHaveText(
    "R$ 12.345,67",
  );
  await expect(page.getByRole("button", { name: "Publicar alçada", exact: true })).toBeDisabled();
  expect(writes).toHaveLength(1);
  await page.getByRole("button", { name: "Manter rascunho" }).click();
  expect(writes).toHaveLength(1);
  await publish(page, 3);
  expect(writes[1]).toEqual({
    expectedCoaVersion: 2,
    bands: [
      { upperLimit: "12345.67", approverId: f.users[0].id },
      { upperLimit: null, approverId: f.users[1].id },
    ],
  });
  expect((await revisions()).data.map((revision: { version: number }) => revision.version)).toEqual([3, 2, 1]);
});

test("a committed but lost response never replays automatically and a reconciled identical save adds no revision", async ({
  page,
}) => {
  await enter(page);
  await ladder(page);
  let failRead = true,
    writes = 0;
  await page.route(`**/projects/${f.project.id}/coa`, async (route) => {
    if (route.request().method() === "PUT") {
      writes++;
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      return route.fulfill({
        status: 500,
        json: { error: { code: "LOST", message: "Resposta indisponível.", details: [] } },
      });
    }
    if (failRead)
      return route.fulfill({
        status: 503,
        json: { error: { code: "UNAVAILABLE", message: "Consulta indisponível.", details: [] } },
      });
    return route.continue();
  });
  await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
  await confirmSave(page);
  await expect(page.getByRole("button", { name: "Tentar consultar a versão publicada" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publicar alçada", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Editar limite após Approver 0", exact: false })).toHaveText(
    "R$ 10.000,00",
  );
  expect(writes).toBe(1);
  failRead = false;
  await page.getByRole("button", { name: "Tentar consultar a versão publicada" }).click();
  await expect(page.getByRole("region", { name: "Reconciliação da alçada" })).toContainText("Versão publicada 1");
  await page.getByRole("button", { name: "Manter rascunho" }).click();
  await page.unroute(`**/projects/${f.project.id}/coa`);
  await expect(page.getByRole("button", { name: "Publicar alçada", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByTestId("coa-view")).toContainText("Versão: 1");
  expect(writes).toBe(1);
  expect((await revisions()).data).toHaveLength(1);
});

test("exact large values exceed the visual axis, persist without floating-point loss and keep the final band unlimited", async ({
  page,
}) => {
  await enter(page);
  await ladder(page, "90071992547409.91");
  expect((await current()).coaVersion).toBe(0);
  await publish(page, 1);
  expect((await current()).bands).toEqual([
    { upperLimit: "90071992547409.91", approverId: f.users[0].id },
    { upperLimit: null, approverId: f.users[1].id },
  ]);
  await page.reload();
  await expect(page.getByTestId("coa-view").getByText("Até R$ 90.071.992.547.409,91", { exact: true })).toBeVisible();
  await edit(page);
  await page.getByRole("button", { name: "Remover nível de Approver 1", exact: true }).click();
  await expect(page.getByRole("slider")).toHaveCount(0);
  await publish(page, 2);
  expect((await current()).bands).toEqual([{ upperLimit: null, approverId: f.users[0].id }]);
});

test("server field errors preserve the draft and permit correction before a new explicit save", async ({ page }) => {
  await enter(page);
  await ladder(page);
  let reject = true,
    writes = 0;
  await page.route(`**/projects/${f.project.id}/coa`, (route) => {
    if (route.request().method() === "PUT") {
      writes++;
      if (reject)
        return route.fulfill({
          status: 400,
          json: {
            error: {
              code: "INVALID_INPUT",
              message: "Confira os campos.",
              details: [{ field: "bands.0.upperLimit", code: "custom", message: "Revise o limite informado." }],
            },
          },
        });
    }
    return route.continue();
  });
  await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
  await confirmSave(page);
  await expect(page.getByRole("button", { name: "Editar limite após Approver 0", exact: false })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByRole("button", { name: "Editar limite após Approver 0", exact: false }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText("Revise o limite informado.");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Editar limite após Approver 0", exact: false })).toHaveText(
    "R$ 10.000,00",
  );
  expect((await current()).coaVersion).toBe(0);
  expect(writes).toBe(1);
  reject = false;
  await money(page, f.users[0].displayName, "10001.23");
  await publish(page, 1);
  expect(writes).toBe(2);
});

test("member refresh and duplicate-add recovery preserve the draft; inactive members stay visible and unavailable", async ({
  page,
}) => {
  await enter(page);
  await ladder(page, "12345.67");
  await page.getByRole("button", { name: "Gerenciar membros", exact: true }).click();
  await openAddMembers(page);
  await expect(addMemberButton(page, f.users[2].id)).toBeEnabled();
  expect(
    (
      await server.inject({
        method: "POST",
        url: `/api/v1/projects/${f.project.id}/members`,
        headers: headers(),
        payload: { userId: f.users[2].id },
      })
    ).statusCode,
  ).toBe(201);
  await addMemberButton(page, f.users[2].id).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Voltar aos membros", exact: true }).click();
  await expect(page.getByRole("list", { name: "Membros da obra" })).toContainText(f.users[2].displayName);
  expect(
    (await server.inject({ method: "DELETE", url: `/api/v1/users/${f.users[2].id}`, headers: headers() })).statusCode,
  ).toBe(204);
  await page.getByRole("button", { name: "Atualizar membros", exact: true }).click();
  await expect(page.getByRole("list", { name: "Membros da obra" })).toContainText("Inativo");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Editar limite após Approver 0", exact: false })).toHaveText(
    "R$ 12.345,67",
  );
  await expect(page.getByRole("button", { name: "Adicionar nível" })).toHaveCount(0);
  expect((await current()).coaVersion).toBe(0);
});

test("compact members and searchable management support confirmed removal without changing a CoA draft", async ({
  page,
}) => {
  await enter(page);
  await ladder(page, "12345.67");
  await page.getByRole("button", { name: "Gerenciar membros", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Gerenciar membros", exact: true });
  await openAddMembers(page);
  await dialog.getByLabel("Buscar usuários").fill(f.users[2].username);
  await addMember(page, f.users[2].id);
  await expect(dialog.getByRole("list", { name: "Membros da obra" })).toContainText(f.users[2].displayName);
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.getByLabel("Resumo dos membros")).toContainText("e +1");
  await expect(page.getByLabel("Resumo dos membros")).toContainText("3 membros · 3 ativos");
  await page.getByRole("button", { name: "Gerenciar membros", exact: true }).click();
  const remove = dialog.getByRole("button", { name: `Remover ${f.users[2].displayName} da obra`, exact: true });
  await remove.click();
  await expect(dialog.getByRole("button", { name: "Cancelar remoção", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(remove).toBeFocused();
  await remove.click();
  await dialog.getByRole("button", { name: "Confirmar remoção", exact: true }).click();
  await expect(remove).toHaveCount(0);
  await expect(dialog.getByText("não participa mais desta obra.", { exact: false })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 600 });
  await expect
    .poll(async () => {
      const bounds = (await dialog.boundingBox())!;
      return bounds.x >= 0 && bounds.x + bounds.width <= 390 && bounds.y >= 0 && bounds.y + bounds.height <= 600;
    })
    .toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Editar limite após Approver 0", exact: false })).toHaveText(
    "R$ 12.345,67",
  );
  expect((await current()).coaVersion).toBe(0);
});

test("published approver removal explains the known blocker before a write and retains the CoA draft", async ({
  page,
}) => {
  await configure();
  await enter(page);
  await edit(page);
  await money(page, f.users[0].displayName, "12345.67");
  let writes = 0;
  page.on("request", (request) => {
    if (request.method() === "DELETE") writes++;
  });
  await page.getByRole("button", { name: "Gerenciar membros", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Gerenciar membros", exact: true });
  await dialog.getByRole("button", { name: `Remover ${f.users[1].displayName} da obra`, exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Confirmar remoção", exact: true })).toHaveCount(0);
  await expect(dialog.getByText("Este membro está na alçada publicada.", { exact: false })).toBeVisible();
  const row = dialog.locator(`[data-member-id="${f.users[1].id}"]`);
  await expect(row.getByRole("button", { name: "Cancelar remoção", exact: true })).toBeFocused();
  await expect(dialog.getByRole("listitem")).toHaveCount(2);
  await expect(dialog.getByLabel("Buscar usuários")).toBeVisible();
  await row.getByRole("button", { name: "Cancelar remoção", exact: true }).click();
  await expect(
    row.getByRole("button", { name: `Remover ${f.users[1].displayName} da obra`, exact: true }),
  ).toBeFocused();
  expect(writes).toBe(0);
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Editar limite após Approver 0", exact: false })).toHaveText(
    "R$ 12.345,67",
  );
  expect((await current()).coaVersion).toBe(1);
});

test("a lost removal response refreshes membership without automatically replaying the operation", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: "Gerenciar membros", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Gerenciar membros", exact: true });
  let writes = 0;
  await page.route(`**/projects/${f.project.id}/members/${f.users[1].id}`, async (route) => {
    writes++;
    const response = await route.fetch();
    expect(response.status()).toBe(204);
    return route.fulfill({
      status: 503,
      json: { error: { code: "LOST", message: "Resposta indisponível.", details: [] } },
    });
  });
  await dialog.getByRole("button", { name: `Remover ${f.users[1].displayName} da obra`, exact: true }).click();
  await dialog.getByRole("button", { name: "Confirmar remoção", exact: true }).click();
  await expect(dialog.getByText("Este vínculo já não consta na lista atualizada.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Confirmar remoção", exact: true })).toBeDisabled();
  await expect(dialog.locator(`[data-member-id="${f.users[1].id}"]`)).toBeVisible();
  expect(writes).toBe(1);
  await dialog.getByRole("button", { name: "Cancelar remoção", exact: true }).click();
  await openAddMembers(page);
  await expect(addMemberButton(page, f.users[1].id)).toBeEnabled();
});

for (const reducedMotion of ["no-preference", "reduce"] as const)
  test(`inline removal waits for confirmation and respects ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.setViewportSize({ width: reducedMotion === "reduce" ? 1440 : 320, height: 600 });
    await enter(page);
    await page.getByRole("button", { name: "Gerenciar membros", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Gerenciar membros", exact: true });
    const row = dialog.locator(`[data-member-id="${f.users[0].id}"]`);
    const nextRow = dialog.locator(`[data-member-id="${f.users[1].id}"]`);
    const memberList = dialog.getByRole("list", { name: "Membros da obra" });
    await row.getByRole("button", { name: `Remover ${f.users[0].displayName} da obra`, exact: true }).click();
    await expect(memberList.getByRole("listitem")).toHaveCount(2);
    await expect(row.getByRole("button", { name: "Confirmar remoção", exact: true })).toBeInViewport();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.evaluate(() => {
      const log: string[] = [];
      (window as typeof window & { memberMotion: string[] }).memberMotion = log;
      const original = Element.prototype.animate;
      Element.prototype.animate = function (...args: Parameters<Element["animate"]>) {
        const animation = original.apply(this, args);
        if (this.matches("[data-member-id], [data-member-id] > div")) {
          const stage = "fade";
          for (const frame of (animation.effect as KeyframeEffect).getKeyframes()) {
            if ("height" in frame || "transform" in frame) log.push("unexpected-layout-motion");
          }
          log.push(stage);
          void animation.finished.then(
            () => log.push(`${stage}-finished`),
            () => undefined,
          );
        }
        return animation;
      };
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let writes = 0;
    await page.route(`**/projects/${f.project.id}/members/${f.users[0].id}`, async (route) => {
      writes++;
      await gate;
      await route.continue();
    });
    try {
      await row.getByRole("button", { name: "Confirmar remoção", exact: true }).click();
      await expect.poll(() => writes).toBe(1);
      await expect(row).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Fechar", exact: true })).toBeDisabled();
      await expect(row.getByRole("button", { name: "Confirmar remoção", exact: true })).toBeDisabled();
      expect(await page.evaluate(() => (window as typeof window & { memberMotion: string[] }).memberMotion)).toEqual(
        [],
      );
      const before = (await nextRow.boundingBox())!.y - (await memberList.boundingBox())!.y;
      release();
      await expect(row).toHaveCount(0);
      await expect(dialog.getByRole("button", { name: "Atualizar membros", exact: true })).toBeEnabled();
      const after = (await nextRow.boundingBox())!.y - (await memberList.boundingBox())!.y;
      expect(after).toBeLessThan(before);
      expect(await page.evaluate(() => (window as typeof window & { memberMotion: string[] }).memberMotion)).toEqual(
        reducedMotion === "reduce" ? [] : ["fade", "fade-finished"],
      );
      expect(writes).toBe(1);
      await expect(dialog.getByLabel("Buscar usuários")).toBeFocused();
    } finally {
      release();
    }
  });

test("pointer and keyboard edits never autosave and the visual axis is excluded from the publication payload", async ({
  page,
}) => {
  await enter(page);
  await ladder(page);
  let writes = 0;
  page.on("request", (request) => {
    if (request.method() === "PUT") {
      writes++;
      expect(Object.keys(request.postDataJSON()).sort()).toEqual(["bands", "expectedCoaVersion"]);
    }
  });
  const slider = page.getByRole("slider");
  const box = (await slider.boundingBox())!;
  const bar = (await page.getByRole("group", { name: "Limites da alçada de aprovação" }).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
  await page.mouse.up();
  await slider.press("ArrowRight");
  const value = await slider.getAttribute("aria-valuetext");
  await page.setViewportSize({ width: 900, height: 700 });
  await expect(slider).toHaveAttribute("aria-valuetext", value!);
  expect(writes).toBe(0);
  expect((await current()).coaVersion).toBe(0);
  await publish(page, 1);
  expect(writes).toBe(1);
});

test("project read retries, name validation and ordinary-user permission boundaries remain enforced", async ({
  page,
  browser,
}) => {
  await enter(page);
  await page.getByRole("link", { name: "Voltar às obras" }).click();
  await openCreation(page, "projects");
  await page.getByRole("button", { name: "Criar obra", exact: true }).click();
  await expect(page.getByLabel("Nome da obra", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Nome da obra", { exact: true })).toHaveAttribute("aria-invalid", "true");
  let fails = true;
  await page.route(`**/projects/${f.project.id}/coa`, (route) =>
    fails
      ? route.fulfill({ status: 503, json: { error: { code: "UNAVAILABLE", message: "Indisponível.", details: [] } } })
      : route.continue(),
  );
  await page.goto(`/admin/projects/${f.project.id}`);
  await expect(page.getByRole("alert")).toBeVisible();
  fails = false;
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(page.getByTestId("coa-view")).toBeVisible();
  const context = await browser.newContext();
  try {
    await context.addInitScript(
      (value) => sessionStorage.setItem("obraflow.accessToken", value),
      server.jwt.sign({ sub: f.users[0].id }),
    );
    const ordinary = await context.newPage();
    await ordinary.goto(`/admin/projects/${f.project.id}`);
    await expect(ordinary.getByRole("alert")).toContainText("Você não tem permissão");
    expect(
      (
        await context.request.put(`${API}/projects/${f.project.id}/coa`, {
          headers: { authorization: `Bearer ${server.jwt.sign({ sub: f.users[0].id })}` },
          data: { expectedCoaVersion: 0, bands: [{ upperLimit: null, approverId: f.users[0].id }] },
        })
      ).status(),
    ).toBe(403);
  } finally {
    await context.close();
  }
});

test("unconfigured projects publish a single unlimited level; changed cancellation requires confirmation", async ({
  page,
}) => {
  await enter(page);
  await expect(page.getByTestId("coa-view")).toContainText("Nenhuma alçada configurada.");
  await edit(page);
  await expect(page.getByRole("slider")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remover nível de Approver 0", exact: true })).toBeDisabled();
  await publish(page, 1);
  await edit(page);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await edit(page);
  await page.getByRole("button", { name: "Adicionar nível" }).click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Descartar alterações?", exact: true });
  await dialog.getByRole("button", { name: "Continuar editando" }).click();
  await expect(page.getByRole("slider")).toHaveCount(1);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await dialog.getByRole("button", { name: "Descartar alterações", exact: true }).click();
  await expect(page.getByTestId("coa-view")).toBeVisible();
  expect((await revisions()).data).toHaveLength(1);
});

test("server-confirmed versions survive reload; unchanged saves and visual-only changes add no history", async ({
  page,
}) => {
  await enter(page);
  await ladder(page);
  await publish(page, 1);
  await page.reload();
  const view = page.getByTestId("coa-view");
  await expect(view.getByText("Até R$ 10.000,00", { exact: true })).toBeVisible();
  await expect(view.getByRole("slider")).toHaveCount(0);
  await edit(page);
  await page.setViewportSize({ width: 900, height: 700 });
  await expect(page.getByRole("button", { name: "Publicar alçada", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(view).toContainText("Versão: 1");
  expect((await revisions()).data).toHaveLength(1);
  await edit(page);
  await money(page, f.users[0].displayName, "20000");
  await publish(page, 2);
  const history = (await revisions()).data;
  expect(history.map((revision: { bands: { upperLimit: string }[] }) => revision.bands[0].upperLimit)).toEqual([
    "20000.00",
    "10000.00",
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(view.getByText("Até R$ 20.000,00", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("a pending publication locks all editing and suppresses repeat writes", async ({ page }) => {
  await enter(page);
  await ladder(page);
  let release!: () => void,
    writes = 0;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/projects/${f.project.id}/coa`, async (route) => {
    if (route.request().method() === "PUT") {
      writes++;
      await held;
    }
    return route.continue();
  });
  await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
  await confirmSave(page);
  try {
    const review = page.getByRole("dialog", { name: "Publicar alçada", exact: true });
    const editor = page.getByRole("region", { name: "Alçada de aprovação", exact: true, includeHidden: true });
    await expect(review.getByRole("button", { name: "Publicando…", exact: true })).toBeDisabled();
    await expect(editor.getByLabel("Aprovador do nível 1", { exact: true })).toBeDisabled();
    await expect(editor.getByRole("button", { name: "Cancelar", exact: true, includeHidden: true })).toBeDisabled();
    await expect(review.getByRole("button", { name: "Cancelar", exact: true })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(review).toBeVisible();
    expect(writes).toBe(1);
  } finally {
    release();
  }
  await expect(page.getByTestId("coa-view").getByText("Versão: 1", { exact: true })).toBeVisible();
  expect(writes).toBe(1);
});

test("cancelling an uncertain publication reloads the authoritative result without another write", async ({ page }) => {
  await enter(page);
  await ladder(page);
  let failRead = true,
    writes = 0;
  await page.route(`**/projects/${f.project.id}/coa`, async (route) => {
    if (route.request().method() === "PUT") {
      writes++;
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      return route.fulfill({
        status: 500,
        json: { error: { code: "LOST", message: "Resposta indisponível.", details: [] } },
      });
    }
    if (failRead)
      return route.fulfill({
        status: 503,
        json: { error: { code: "UNAVAILABLE", message: "Consulta indisponível.", details: [] } },
      });
    return route.continue();
  });
  await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
  await confirmSave(page);
  await expect(page.getByRole("button", { name: "Tentar consultar a versão publicada" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Publicar alçada", exact: true, includeHidden: true })).toHaveCount(0);
  const editor = page.getByRole("region", { name: "Alçada de aprovação", exact: true });
  const discard = page.getByRole("dialog", { name: "Descartar alterações?", exact: true, includeHidden: true });
  await editor.getByRole("button", { name: "Cancelar", exact: true }).click();
  await discard.getByRole("button", { name: "Descartar alterações", exact: true }).click();
  await expect(discard).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Editar limite após Approver 0", exact: false })).toHaveText(
    "R$ 10.000,00",
  );
  failRead = false;
  await editor.getByRole("button", { name: "Cancelar", exact: true }).click();
  await discard.getByRole("button", { name: "Descartar alterações", exact: true }).click();
  await expect(discard).toHaveCount(0);
  await expect(page.getByTestId("coa-view").getByText("Versão: 1", { exact: true })).toBeVisible();
  expect(writes).toBe(1);
  expect((await revisions()).data).toHaveLength(1);
});

test("CoA history starts collapsed inside the value tester card and opens inline without a dialog", async ({
  page,
}) => {
  await configure();
  await configure("20000.00", 1);
  await enter(page);
  let writes = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/") && request.method() !== "GET") writes++;
  });
  const history = page.getByRole("region", { name: "Versões da alçada", exact: true });
  const current = page.getByTestId("coa-view");
  const summary = history.getByRole("button", { name: "Versões da alçada", exact: true }),
    disclosure = history.locator('[data-slot="disclosure"]');
  await expect(summary).toHaveAttribute("aria-expanded", "false");
  await expect(history.getByLabel("Versão da alçada")).toHaveCount(0);
  expect(await current.evaluate((node) => node.querySelector('[aria-label="Versões da alçada"]') !== null)).toBe(true);
  const tester = current.getByRole("button", { name: "Testar um valor", exact: true });
  const historyBox = (await summary.boundingBox())!,
    testerBox = (await tester.boundingBox())!;
  expect(historyBox.y).toBeGreaterThanOrEqual(testerBox.y + testerBox.height);
  await expect(disclosure).toHaveCSS("border-top-width", "1px");
  await expect(tester).toHaveAttribute("aria-expanded", "false");
  for (const width of [1440, 320])
    for (const theme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height: 650 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await expect(summary).toHaveAttribute("aria-expanded", "false");
      await summary.focus();
      await summary.press("Enter");
      await expect(summary).toHaveAttribute("aria-expanded", "true");
      await expect(history.getByRole("region", { name: "Versão 2", exact: true })).toContainText("20.000,00");
      await expect(history.getByRole("status")).toContainText("Publicada · usada em novos pedidos");
      await selectOption(history.getByLabel("Versão da alçada"), "1");
      const old = history.getByRole("region", { name: "Versão 1", exact: true });
      await expect(old.getByRole("status")).toContainText("Anterior · não é usada em novos pedidos");
      await expect(old).toContainText("A versão publicada é a 2");
      await expect(old.getByRole("status")).toContainText("Pedidos existentes mantêm a alçada usada na criação");
      const stateBox = (await old.getByRole("status").boundingBox())!;
      const selectorBox = (await history.getByLabel("Versão da alçada").boundingBox())!;
      const publicationBox = (await history.locator("time").locator("..").boundingBox())!;
      if (width === 1440) {
        expect(stateBox.x).toBeGreaterThanOrEqual(publicationBox.x + publicationBox.width);
        expect(Math.abs(stateBox.y + stateBox.height / 2 - publicationBox.y - publicationBox.height / 2)).toBeLessThan(
          2,
        );
      } else expect(stateBox.y).toBeGreaterThanOrEqual(publicationBox.y + publicationBox.height);
      expect(stateBox.x).toBeGreaterThanOrEqual(selectorBox.x);
      await expect(old.getByTestId("coa-history-view")).toContainText("Versão: 1");
      await expect(old.getByTestId("coa-range-1")).toHaveAttribute("aria-label", /10\.000,00/);
      await expect(old.getByRole("list", { name: "Faixas e cadeias efetivas" })).toBeVisible();
      await expect(old).toContainText(f.users[0].displayName);
      await expect(old).toContainText(f.users[1].displayName);
      await expect(history.locator("time")).toBeVisible();
      await expect(old).not.toContainText("Acrescenta ");
      await expect(history.getByRole("button", { name: /Publicar|Restaurar|Salvar|Editar/ })).toHaveCount(0);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      const bounds = (await history.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(await history.evaluate((node) => node.scrollHeight <= node.clientHeight)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await selectOption(history.getByLabel("Versão da alçada"), "2");
      await expect(history.getByRole("status")).toContainText("Publicada · usada em novos pedidos");
      await expect(history.getByRole("status")).not.toContainText("não é usada");
      await expect(history.getByRole("status")).toContainText("Pedidos existentes mantêm a alçada usada na criação");
      await expect(current).toContainText("Versão: 2");
      await expect(current).toContainText("20.000,00");
      await summary.click();
      await expect(summary).toHaveAttribute("aria-expanded", "false");
      await expect(history.getByLabel("Versão da alçada")).toHaveCount(0);
      await expect(tester).toHaveAttribute("aria-expanded", "false");
    }
  expect(writes).toBe(0);
});

test("inline CoA history retries a failed read and refreshes newly published revisions", async ({ page }) => {
  await configure();
  let unavailable = true;
  await page.route(`**/projects/${f.project.id}/coa/revisions`, (route) =>
    unavailable
      ? route.fulfill({
          status: 503,
          json: { error: { code: "UNAVAILABLE", message: "Histórico indisponível.", details: [] } },
        })
      : route.continue(),
  );
  await enter(page);
  const history = page.getByRole("region", { name: "Versões da alçada", exact: true });
  await history.getByRole("button", { name: "Versões da alçada", exact: true }).click();
  await expect(history.getByRole("alert")).toContainText("Histórico indisponível");
  unavailable = false;
  await history.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(history.getByRole("region", { name: "Versão 1", exact: true })).toBeVisible();
  await configure("20000.00", 1);
  const refresh = history.getByRole("button", { name: "Atualizar versões da alçada", exact: true });
  await refresh.click();
  await expect(refresh).toBeEnabled();
  await selectOption(history.getByLabel("Versão da alçada"), "2");
  await expect(history.getByRole("region", { name: "Versão 2", exact: true })).toContainText("20.000,00");
  await selectOption(history.getByLabel("Versão da alçada"), "1");
  await expect(history.getByRole("region", { name: "Versão 1", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("unconfigured CoA exposes an empty inline read-only history", async ({ page }) => {
  await enter(page);
  const history = page.getByRole("region", { name: "Versões da alçada", exact: true });
  await history.getByRole("button", { name: "Versões da alçada", exact: true }).click();
  await expect(history).toContainText("Nenhuma versão publicada");
  await expect(history.getByLabel("Versão da alçada")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

for (const width of [1440])
  test(`history refresh keeps data, selection and scroll mounted at ${width}px`, async ({ page }) => {
    await configure();
    await configure("20000.00", 1);
    await page.setViewportSize({ width, height: 650 });
    await page.emulateMedia({ colorScheme: width === 1440 ? "dark" : "light", reducedMotion: "no-preference" });
    await enter(page);
    const history = page.getByRole("region", { name: "Versões da alçada", exact: true });
    await history.getByRole("button", { name: "Versões da alçada", exact: true }).click();
    const refresh = history.getByRole("button", { name: /^(Atualizar versões da alçada|Atualizando\.\.\.)$/ });
    await expect(refresh).toBeEnabled();
    await selectOption(history.getByLabel("Versão da alçada"), "1");
    const viewer = history.getByTestId("coa-history-view");
    await viewer.evaluate((node) => node.setAttribute("data-refresh-check", "original"));
    let release!: () => void;
    let gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reads = 0,
      fail = false;
    await page.route(`**/projects/${f.project.id}/coa/revisions`, async (route) => {
      reads++;
      await gate;
      return fail
        ? route.fulfill({
            status: 503,
            json: { error: { code: "UNAVAILABLE", message: "Não foi possível atualizar o histórico.", details: [] } },
          })
        : route.continue();
    });
    try {
      await refresh.scrollIntoViewIfNeeded();
      await refresh.focus();
      const beforeScroll = await page.evaluate(() => scrollY),
        beforeHeight = (await history.boundingBox())!.height;
      expect(beforeScroll).toBeGreaterThan(0);
      await refresh.click();
      await expect(refresh).toBeDisabled();
      await expect(refresh).toHaveAttribute("aria-busy", "true");
      await expect(refresh.locator("svg")).toHaveCSS("animation-name", /refresh-spin/);
      const loading = history.getByRole("status").filter({ hasText: "Atualizando..." });
      await expect(loading).toBeVisible();
      const loadingBox = (await loading.boundingBox())!,
        refreshBox = (await refresh.boundingBox())!;
      expect(loadingBox.x + loadingBox.width).toBeLessThanOrEqual(refreshBox.x);
      await expect(viewer).toHaveAttribute("data-refresh-check", "original");
      await expect(history.getByLabel("Versão da alçada")).toContainText("Versão 1");
      expect((await history.boundingBox())!.height).toBeCloseTo(beforeHeight, 0);
      expect(await page.evaluate(() => scrollY)).toBeCloseTo(beforeScroll, 0);
      expect(reads).toBe(1);
      release();
      await expect(refresh).toBeEnabled();
      await expect(viewer).toHaveAttribute("data-refresh-check", "original");
      expect(await page.evaluate(() => scrollY)).toBeCloseTo(beforeScroll, 0);
      await expect(history.getByLabel("Versão da alçada")).toContainText("Versão 1");
      await expect(refresh.locator("svg")).toHaveCSS("animation-name", "none");
      await expect(history.getByText("Atualizando...", { exact: true })).toHaveCount(0);

      fail = true;
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await refresh.click();
      await expect(refresh).toBeDisabled();
      await expect(viewer).toHaveAttribute("data-refresh-check", "original");
      release();
      await expect(refresh).toBeEnabled();
      await expect(page.getByText("Não foi possível atualizar.", { exact: true })).toBeVisible();
      await expect(history.getByRole("alert")).toHaveCount(0);
      await expect(viewer).toHaveAttribute("data-refresh-check", "original");
      await expect(viewer).toContainText("10.000,00");
      fail = false;
      await refresh.click();
      await expect(history.getByRole("alert")).toHaveCount(0);
      await expect(refresh).toBeEnabled();
      await expect(viewer).toHaveAttribute("data-refresh-check", "original");
      expect(reads).toBe(3);
      await page.emulateMedia({ reducedMotion: "reduce" });
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await refresh.click();
      await expect(refresh).toBeDisabled();
      await expect(refresh.locator("svg")).toHaveCSS("animation-name", "none");
      release();
      await expect(refresh).toBeEnabled();
    } finally {
      release();
    }
  });
