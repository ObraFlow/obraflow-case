import { test, expect, type Page } from "@playwright/test";
import type { InjectOptions } from "fastify";
import { openFilters } from "../support/filters";
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
let token: string, projectId: string, supplierId: string, oldName: string, newName: string, supplierName: string;
test.beforeAll(async () => {
  database = await loadDatabase();
  server = await startServer();
});
test.beforeEach(async () => {
  f = await createFixture();
  token = server.jwt.sign({ sub: f.admin.id });
  oldName = `Obra auditoria ${f.project.id}`;
  newName = `Obra corrigida ${f.project.id}`;
  supplierName = `Fornecedor auditoria ${f.project.id}`;
  const mutate = async (method: InjectOptions["method"], path: string, payload?: object) => {
    const response = await server.inject({
      method,
      url: `/api/v1${path}`,
      headers: { authorization: `Bearer ${token}` },
      payload,
    });
    expect(response.statusCode, response.body).toBeLessThan(300);
    return response.statusCode === 204 ? undefined : response.json();
  };
  projectId = (await mutate("POST", "/projects", { name: oldName })).id;
  const path = `/projects/${projectId}`;
  await mutate("POST", path + "/members", { userId: f.users[2].id });
  await mutate("DELETE", path + `/members/${f.users[2].id}`);
  await mutate("POST", path + "/members", { userId: f.users[2].id });
  await mutate("PATCH", path, { name: newName });
  await mutate("POST", path + "/archive");
  await mutate("POST", path + "/reactivate");
  supplierId = (await mutate("POST", "/suppliers", { name: supplierName })).id;
  await mutate("DELETE", `/suppliers/${supplierId}`);
});
test.afterEach(async () => {
  if (projectId) {
    await database.query("DELETE FROM project_lifecycle_events WHERE project_id=$1", [projectId]);
    await database.query("DELETE FROM project_members WHERE project_id=$1", [projectId]);
    await database.query("DELETE FROM projects WHERE id=$1", [projectId]);
  }
  if (supplierId) await database.query("DELETE FROM suppliers WHERE id=$1", [supplierId]);
  await f?.cleanup();
});
test.afterAll(async () => {
  await stopApi(server, database);
});
async function enter(page: Page) {
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await signInAs(page, token);
  await page.goto(`/admin/audit?projectId=${projectId}`);
}

for (const width of [1440, 390])
  test(`project and membership snapshots and supplier attribution are readable in the audit drawer at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme: width === 390 ? "dark" : "light" });
    await enter(page);
    await expect(page.getByRole("navigation", { name: "Paginação da auditoria" })).toContainText("7 eventos");
    await openFilters(page, "Filtros de auditoria");
    const drawer = page.getByRole("dialog"),
      articles = page.getByRole("region", { name: "Histórico de auditoria" }).getByRole("article");
    for (const [type, label, name, state] of [
      ["PROJECT_CREATED", "Obra criada", oldName, "Ativa"],
      ["PROJECT_MEMBER_ADDED", "Membro adicionado", oldName, "Ativa"],
      ["PROJECT_MEMBER_REMOVED", "Membro removido", oldName, "Ativa"],
      ["PROJECT_RENAMED", "Obra renomeada", newName, "Ativa"],
      ["PROJECT_ARCHIVED", "Obra arquivada", newName, "Arquivada"],
      ["PROJECT_REACTIVATED", "Obra reativada", newName, "Ativa"],
    ]) {
      await selectOption(page.getByLabel("Tipo de evento", { exact: true }), type);
      await expect(articles.first()).toContainText(label);
      await articles.first().getByRole("button", { name: "Ver detalhes", exact: true }).click();
      await expect(drawer.getByRole("heading", { name: label, exact: true })).toBeVisible();
      await expect(drawer).toContainText(name);
      await expect(drawer).toContainText(f.admin.displayName);
      await expect(drawer.getByText(state, { exact: true })).toBeVisible();
      if (type === "PROJECT_RENAMED") await expect(drawer).toContainText(oldName);
      if (type.includes("MEMBER")) {
        await expect(drawer).toContainText(f.users[2].displayName);
        await expect(drawer).toContainText(f.users[2].username);
        await drawer.getByRole("button", { name: "Referências técnicas", exact: true }).click();
        await expect(drawer).toContainText(f.users[2].id);
      }
      await expect(drawer.getByRole("link", { name: "Abrir obra", exact: true })).toHaveAttribute(
        "href",
        `/admin/projects/${projectId}`,
      );
      await expect(drawer.getByRole("button", { name: /Salvar|Remover|Arquivar|Reativar|Editar/ })).toHaveCount(0);
      await drawer.getByRole("button", { name: "Fechar detalhes", exact: true }).click();
    }
    await selectOption(page.getByLabel("Obra", { exact: true }), "");
    for (const [type, label, state] of [
      ["SUPPLIER_CREATED", "Fornecedor criado", "Ativo"],
      ["SUPPLIER_DISABLED", "Fornecedor desativado", "Inativo"],
    ]) {
      await selectOption(page.getByLabel("Tipo de evento", { exact: true }), type);
      const supplier = articles.filter({ hasText: supplierName });
      await expect(supplier.getByRole("heading", { name: label, exact: true })).toBeVisible();
      await supplier.getByRole("button", { name: "Ver detalhes", exact: true }).click();
      await expect(drawer.getByRole("heading", { name: label, exact: true })).toBeVisible();
      await expect(drawer).toContainText(f.admin.displayName);
      await expect(drawer).toContainText("Global · sem vínculo com uma obra");
      await expect(drawer.getByText(state, { exact: true })).toBeVisible();
      await expect(drawer.getByRole("link", { name: "Abrir fornecedor", exact: true })).toHaveAttribute(
        "href",
        `/admin/suppliers?${new URLSearchParams({ q: supplierName, status: "all" })}`,
      );
      await drawer.getByRole("button", { name: "Fechar detalhes", exact: true }).click();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
