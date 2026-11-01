import { test, expect, type Page } from "@playwright/test";
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
let token: string;
test.beforeAll(async () => {
  database = await loadDatabase();
  server = await startServer();
});
test.beforeEach(async () => {
  f = await createFixture();
  token = server.jwt.sign({ sub: f.admin.id });
});
test.afterEach(async () => {
  await f?.cleanup();
});
test.afterAll(async () => {
  await stopApi(server, database);
});
async function enter(page: Page, path = "/admin/suppliers") {
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await signInAs(page, token);
  await page.goto(path);
}
const dialog = (page: Page) => page.getByRole("dialog", { name: "Renomear fornecedor", exact: true });

for (const width of [1440, 320])
  test(`active supplier rename validates, preserves dismissed drafts and exposes historical audit details at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: width === 320 ? "dark" : "light" });
    await enter(page);
    await page.getByRole("button", { name: `Renomear ${f.supplier.name}`, exact: true }).click();
    const form = dialog(page);
    const input = form.getByLabel("Nome do fornecedor", { exact: true });
    await input.fill("  ");
    await form.getByRole("button", { name: "Salvar nome" }).click();
    await expect(form.getByText("Informe o nome do fornecedor.", { exact: true })).toBeVisible();
    const name = `Fornecedor corrigido ${f.supplier.id}`;
    await input.fill(`  ${name}  `);
    await form.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.getByRole("button", { name: `Renomear ${f.supplier.name}`, exact: true }).click();
    await expect(input).toHaveValue(`  ${name}  `);
    await form.getByRole("button", { name: "Salvar nome" }).click();
    await expect(form).toBeHidden();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await page.reload();
    const card = page.getByRole("listitem", { name, exact: true });
    await expect(card.getByRole("button", { name: `Renomear ${name}`, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // A later rename changes the catalog name, while the first event retains its payload.
    const laterName = `Fornecedor atual ${f.supplier.id}`;
    expect(
      (
        await server.inject({
          method: "PATCH",
          url: `/api/v1/suppliers/${f.supplier.id}`,
          headers: { authorization: `Bearer ${token}` },
          payload: { name: laterName },
        })
      ).statusCode,
    ).toBe(200);
    await page.goto("/admin/audit");
    await openFilters(page, "Filtros de auditoria");
    await selectOption(page.getByLabel("Tipo de evento", { exact: true }), "SUPPLIER_RENAMED");
    await expect(page).toHaveURL(/eventType=SUPPLIER_RENAMED/);
    const events = page.getByRole("article", { name: `Fornecedor renomeado · ${laterName}`, exact: true });
    await expect(events).toHaveCount(2);
    await events.last().getByRole("button", { name: "Ver detalhes", exact: true }).click();
    const details = page.getByRole("dialog", { name: "Fornecedor renomeado", exact: true });
    await expect(details.getByText(f.supplier.name, { exact: true })).toBeVisible();
    await expect(details.getByText(name, { exact: true })).toBeVisible();
    await expect(details.getByText(f.admin.displayName, { exact: true })).toBeVisible();
    await expect(details.getByRole("link", { name: "Abrir fornecedor", exact: true })).toHaveAttribute(
      "href",
      `/admin/suppliers?${new URLSearchParams({ q: laterName, status: "all" })}`,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

test("inactive suppliers have no rename action, including a restored rename URL", async ({ page }) => {
  expect(
    (
      await server.inject({
        method: "DELETE",
        url: `/api/v1/suppliers/${f.supplier.id}`,
        headers: { authorization: `Bearer ${token}` },
      })
    ).statusCode,
  ).toBe(204);
  await enter(page, `/admin/suppliers?rename=${f.supplier.id}`);
  await expect(
    dialog(page).getByText("Este fornecedor está inativo e não pode ser renomeado.", { exact: true }),
  ).toBeVisible();
  await expect(dialog(page).getByRole("button", { name: "Salvar nome" })).toBeDisabled();
  await dialog(page).getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("button", { name: `Renomear ${f.supplier.name}`, exact: true })).toHaveCount(0);
});

test("concurrent deactivation blocks rename and refresh preserves the input without replay", async ({ page }) => {
  await enter(page);
  await page.getByRole("button", { name: `Renomear ${f.supplier.name}`, exact: true }).click();
  await dialog(page).getByLabel("Nome do fornecedor", { exact: true }).fill("Rascunho preservado");
  expect(
    (
      await server.inject({
        method: "DELETE",
        url: `/api/v1/suppliers/${f.supplier.id}`,
        headers: { authorization: `Bearer ${token}` },
      })
    ).statusCode,
  ).toBe(204);
  let writes = 0;
  page.on("request", (request) => {
    if (request.method() === "PATCH") writes++;
  });
  await dialog(page).getByRole("button", { name: "Salvar nome" }).click();
  await expect(dialog(page).getByRole("button", { name: "Salvar nome" })).toBeDisabled();
  await dialog(page).getByRole("button", { name: "Consultar estado atual do fornecedor" }).click();
  await expect(
    dialog(page).getByText("Este fornecedor está inativo e não pode ser renomeado.", { exact: true }),
  ).toBeVisible();
  await expect(dialog(page).getByLabel("Nome do fornecedor", { exact: true })).toHaveValue("Rascunho preservado");
  await expect(dialog(page).getByRole("button", { name: "Salvar nome" })).toBeDisabled();
  expect(writes).toBe(1);
});

test("pending rename blocks dismissal and repeat writes; a lost response requires an explicit read", async ({
  page,
}) => {
  let writes = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/v1/suppliers/${f.supplier.id}`, async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    writes++;
    await gate;
    await route.fetch();
    return route.fulfill({
      status: 503,
      json: { error: { code: "LOST", message: "Resposta indisponível.", details: [] } },
    });
  });
  await enter(page);
  await page.getByRole("button", { name: `Renomear ${f.supplier.name}`, exact: true }).click();
  await dialog(page).getByLabel("Nome do fornecedor", { exact: true }).fill("Nome confirmado no servidor");
  await dialog(page).getByRole("button", { name: "Salvar nome" }).click();
  await expect(dialog(page).getByRole("button", { name: "Salvando…" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole("button", { name: "Cancelar", exact: true })).toBeDisabled();
  release();
  await expect(dialog(page).getByText(/Resultado incerto/)).toBeVisible();
  await expect(dialog(page).getByRole("button", { name: "Salvar nome" })).toBeDisabled();
  await dialog(page).getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: `Renomear ${f.supplier.name}`, exact: true }).click();
  await expect(dialog(page).getByLabel("Nome do fornecedor", { exact: true })).toHaveValue(
    "Nome confirmado no servidor",
  );
  await expect(dialog(page).getByRole("button", { name: "Salvar nome" })).toBeDisabled();
  await dialog(page).getByRole("button", { name: "Consultar estado atual do fornecedor" }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(page.getByRole("heading", { name: "Nome confirmado no servidor", exact: true })).toBeVisible();
  expect(writes).toBe(1);
});
