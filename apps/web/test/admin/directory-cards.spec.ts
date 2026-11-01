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

let server: Server;
let database: Database;
let f: Fixture;
test.beforeAll(async () => {
  database = await loadDatabase();
  server = await startServer();
});
test.beforeEach(async () => {
  f = await createFixture();
});
test.afterEach(async () => {
  await f?.cleanup();
});
test.afterAll(async () => {
  await stopApi(server, database);
});

/** The page never scrolls sideways, on a desktop or on a phone. */
async function expectNoHorizontalOverflow(page: Page) {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
}

for (const kind of ["users", "suppliers"] as const)
  test(`${kind} compact cards preserve search, status, explicit confirmed deactivation and responsive bounded scrolling`, async ({
    page,
  }) => {
    await page.route("https://i.pravatar.cc/**", (route) => route.abort());
    await page.addInitScript(
      (token) => sessionStorage.setItem("obraflow.accessToken", token),
      server.jwt.sign({ sub: f.admin.id }),
    );
    await page.goto(`/admin/${kind}`);
    const users = kind === "users";
    await expect(page.getByLabel("Situação do cadastro", { exact: true })).toHaveAttribute(
      "value",
      kind === "users" ? "" : "active",
    );
    const list = page.getByRole("list", { name: users ? "Usuários" : "Fornecedores", exact: true });
    const person = users ? f.users[2].displayName : f.supplier.name;
    const card = list.getByRole("listitem", { name: person, exact: true });
    await expect(card.getByRole("button", { name: `Desativar ${person}`, exact: true })).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: users ? "Lista de usuários" : "Lista de fornecedores", exact: true }),
    ).toHaveCSS("overflow-y", "auto");
    const height = (await card.boundingBox())!.height;
    expect(height).toBeGreaterThanOrEqual(64);
    expect(height).toBeLessThanOrEqual(76);
    if (users) {
      const admin = list.getByRole("listitem", { name: f.admin.displayName, exact: true });
      await expect(admin).toContainText("Conta protegida");
      await expect(admin.getByRole("button")).toHaveCount(0);
      await expect(card).toContainText(`@${f.users[2].username}`);
      await expect(card).toContainText("Usuário");
    } else await expect(card).toContainText("Disponível para novos pedidos");
    await page.setViewportSize({ width: 390, height: 900 });
    await openFilters(page);
    const search = page.getByLabel(users ? "Buscar usuários" : "Buscar fornecedores", { exact: true });
    await search.fill(users ? f.users[2].username : f.supplier.name);
    await expect(list.getByRole("listitem")).toHaveCount(1);
    const deactivate = card.getByRole("button", { name: `Desativar ${person}`, exact: true });
    await deactivate.click();
    const dialog = page.getByRole("dialog", {
      name: users ? "Desativar usuário" : "Desativar fornecedor",
      exact: true,
    });
    await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(card).toContainText("Ativo");
    await deactivate.click();
    await dialog.getByRole("button", { name: "Desativar", exact: true }).click();
    if (!users) {
      await expect(card).toHaveCount(0);
      await selectOption(page.getByLabel("Situação do cadastro", { exact: true }), "all");
      await expect(page).toHaveURL(/status=all/);
      await page.reload();
      await openFilters(page);
      await expect(page.getByLabel("Situação do cadastro", { exact: true })).toHaveAttribute("value", "all");
    }
    await expect(card).toContainText("Inativo");
    await expect(deactivate).toHaveCount(0);
    if (!users) await expect(card).toContainText("Cadastro desativado");
    await selectOption(page.getByLabel("Situação do cadastro", { exact: true }), "active");
    await expect(page.getByText("Nenhum resultado para estes filtros", { exact: true })).toBeVisible();
    await selectOption(page.getByLabel("Situação do cadastro", { exact: true }), "inactive");
    await expect(card).toBeVisible();
    await search.fill("registro-inexistente-para-a-busca");
    await expect(page.getByText("Nenhum resultado para estes filtros", { exact: true })).toBeVisible();
    await search.fill("");
    await selectOption(page.getByLabel("Situação do cadastro", { exact: true }), users ? "" : "all");
    await expectNoHorizontalOverflow(page);
  });
