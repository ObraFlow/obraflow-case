import { test, expect, type Page, type Request } from "@playwright/test";

const id = "11111111-1111-4111-8111-111111111111";
const supplier = (name: string) => ({ id, name, isActive: true });
async function identity(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("obraflow.accessToken", "read-consistency-fixture"));
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: { id, username: "admin", displayName: "Admin", role: "ADMIN", isActive: true } }),
  );
}

test("an obsolete catalog refresh cannot overwrite a later confirmed supplier reconciliation", async ({ page }) => {
  await identity(page);
  let serverName = "Nome original",
    writes = 0,
    hold = false;
  let release!: () => void, started!: () => void, done!: () => void, settled!: () => void;
  let oldRequest: Request | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const readStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  const readDone = new Promise<void>((resolve) => {
    done = resolve;
  });
  const readSettled = new Promise<void>((resolve) => {
    settled = resolve;
  });
  page.on("requestfinished", (request) => {
    if (request === oldRequest) settled();
  });
  page.on("requestfailed", (request) => {
    if (request === oldRequest) settled();
  });
  await page.route("**/api/v1/suppliers**", async (route) => {
    if (route.request().method() === "PATCH") {
      writes++;
      serverName = route.request().postDataJSON().name;
      return route.fulfill({
        status: 503,
        json: { error: { code: "LOST", message: "Resposta indisponível.", details: [] } },
      });
    }
    const snapshot = supplier(serverName);
    if (hold) {
      hold = false;
      oldRequest = route.request();
      started();
      await gate;
      await route.fulfill({ json: { data: [snapshot] } }).catch(() => undefined);
      done();
      return;
    }
    return route.fulfill({ json: { data: [snapshot] } });
  });
  try {
    await page.goto("/admin/suppliers");
    await page.getByRole("button", { name: "Renomear Nome original", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Renomear fornecedor", exact: true });
    await dialog.getByLabel("Nome do fornecedor", { exact: true }).fill("Nome enviado");
    await dialog.getByRole("button", { name: "Salvar nome", exact: true }).click();
    await expect(dialog.getByText(/Resultado incerto/)).toBeVisible();
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    hold = true;
    await page.getByRole("button", { name: "Atualizar fornecedores", exact: true }).click();
    await readStarted;
    // Another successful admin write follows the older read's database snapshot.
    serverName = "Nome mais recente";
    await page.goBack();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Consultar estado atual do fornecedor", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Salvar nome", exact: true })).toBeEnabled();
    await expect(dialog.getByLabel("Nome do fornecedor", { exact: true })).toHaveValue("Nome enviado");
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    release();
    await readDone;
    await readSettled;
    expect(oldRequest!.failure()).not.toBeNull();
    await expect(page.getByRole("heading", { name: "Nome mais recente", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nome enviado", exact: true })).toHaveCount(0);
    expect(writes).toBe(1);
  } finally {
    release();
  }
});

test("malformed successful supplier creation preserves the draft and requires acknowledgement instead of retry", async ({
  page,
}) => {
  await identity(page);
  let writes = 0;
  await page.route("**/api/v1/suppliers", (route) => {
    if (route.request().method() === "POST") {
      writes++;
      return route.fulfill({ status: 201, body: "{invalid JSON" });
    }
    return route.fulfill({ json: { data: [supplier("Fornecedor existente")] } });
  });
  await page.goto("/admin/suppliers");
  await page.getByRole("button", { name: "Adicionar fornecedor", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Novo fornecedor", exact: true });
  await dialog.getByLabel("Nome do fornecedor", { exact: true }).fill("Novo nome preservado");
  await dialog.getByRole("button", { name: "Criar fornecedor", exact: true }).click();
  await expect(dialog.getByText(/Resultado incerto/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Criar fornecedor", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Adicionar fornecedor", exact: true }).click();
  await expect(dialog.getByLabel("Nome do fornecedor", { exact: true })).toHaveValue("Novo nome preservado");
  await expect(dialog.getByRole("button", { name: "Criar fornecedor", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Liberar novo envio", exact: true })).toBeVisible();
  expect(writes).toBe(1);
});
