import { test, expect, type Page } from "@playwright/test";

const projectId = "11111111-1111-4111-8111-111111111111",
  userId = "22222222-2222-4222-8222-222222222222",
  supplierId = "33333333-3333-4333-8333-333333333333";
async function fixture(page: Page) {
  const state = {
    projects: true,
    member: true,
    previewFailure: false,
    referenceFailure: false,
    supplierFailure: false,
    activeSupplier: true,
    coaVersion: 1,
    role: "USER",
  };
  await page.addInitScript(() => sessionStorage.setItem("obraflow.accessToken", "new-order-ux-fixture"));
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await page.route("**/api/v1/**", (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname;
    if (route.request().method() !== "GET") throw new Error("New-order presentation checks must not write.");
    const unavailable = () =>
      route.fulfill({
        status: 503,
        json: { error: { code: "UNAVAILABLE", message: "Consulta indisponível.", details: [] } },
      });
    if (path.endsWith("/auth/me"))
      return route.fulfill({
        json: { id: userId, username: "joao", displayName: "João", isActive: true, role: state.role },
      });
    if (path.endsWith("/projects"))
      return state.referenceFailure
        ? unavailable()
        : route.fulfill({
            json: {
              data: state.projects
                ? [
                    {
                      id: projectId,
                      name: "Residencial Vista Norte",
                      isActive: true,
                      coaVersion: state.coaVersion,
                      membership: { count: 1, activeCount: 1, isMember: state.member },
                    },
                  ]
                : [],
            },
          });
    if (path.endsWith("/suppliers"))
      return state.supplierFailure
        ? unavailable()
        : route.fulfill({
            json: { data: [{ id: supplierId, name: "Concretos Horizonte", isActive: state.activeSupplier }] },
          });
    if (path.endsWith("/members"))
      return route.fulfill({ json: { data: state.member ? [{ userId, displayName: "João", isActive: true }] : [] } });
    if (path.endsWith("/coa"))
      return state.previewFailure
        ? unavailable()
        : route.fulfill({ json: { projectId, coaVersion: 1, bands: [{ approverId: userId, upperLimit: null }] } });
    return route.fulfill({
      json: {
        data: [],
        pagination: { page: 1, pageSize: Number(url.searchParams.get("pageSize") ?? 20), total: 0 },
        distribution: { total: 0, byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0 }, actionableByMe: 0 },
      },
    });
  });
  return state;
}

for (const role of ["USER", "ADMIN"])
  test(`list explains missing creation prerequisites for ${role}`, async ({ page }) => {
    const state = await fixture(page);
    state.role = role;
    state.coaVersion = 0;
    state.activeSupplier = false;
    await page.goto("/purchase-orders");
    await expect(
      page.getByText("Suas obras ainda não têm uma alçada publicada. Solicite a configuração para criar pedidos.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Não há fornecedores ativos para novos pedidos. Solicite um cadastro ao administrador.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Novo pedido", exact: true })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Gerenciar fornecedores", exact: true })).toHaveCount(
      role === "ADMIN" ? 1 : 0,
    );
    await expect(page.getByRole("link", { name: "Configurar alçadas nas obras", exact: true })).toHaveCount(
      role === "ADMIN" ? 1 : 0,
    );
    state.coaVersion = 1;
    await page.getByRole("button", { name: "Atualizar", exact: true }).click();
    await expect(page.getByText("Suas obras ainda não têm uma alçada publicada.", { exact: false })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Novo pedido", exact: true })).toBeDisabled();
    state.activeSupplier = true;
    await page.getByRole("button", { name: "Atualizar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Novo pedido", exact: true })).toBeEnabled();
  });

test("supplier read failure has an independent retry and retains submission recovery", async ({ page }) => {
  const state = await fixture(page);
  state.supplierFailure = true;
  await page.addInitScript(
    ({ userId, projectId }) => sessionStorage.setItem(`obraflow.purchaseOrderSubmission.${userId}`, projectId),
    { userId, projectId },
  );
  await page.goto("/purchase-orders");
  const retry = page.getByRole("button", { name: "Consultar fornecedores novamente", exact: true });
  await expect(retry).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nenhum pedido cadastrado", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo pedido", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Revisar envio", exact: true })).toBeEnabled();
  const reads: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/")) reads.push(new URL(request.url()).pathname);
  });
  state.supplierFailure = false;
  await retry.click();
  await expect(page.getByRole("button", { name: "Novo pedido", exact: true })).toBeEnabled();
  expect(reads).toEqual(["/api/v1/suppliers"]);
});

for (const separator of [",", "."])
  test(`currency typing keeps whole reais until ${separator} starts decimals`, async ({ page }) => {
    await fixture(page);
    await page.goto("/purchase-orders/new");
    const price = page.getByLabel("Preço unitário (R$)", { exact: true });
    await expect(price).toHaveAttribute("placeholder", "0,00");
    await price.pressSequentially("1234");
    await expect(price).toHaveValue("1.234,00");
    await price.press(separator);
    await price.pressSequentially("56");
    await expect(price).toHaveValue("1.234,56");
    await price.blur();
    await expect(price).toHaveValue("1.234,56");
    // Replacing existing cents, deleting the last whole digit and starting with cents.
    await price.focus();
    await price.press(separator);
    await price.pressSequentially("7");
    await price.blur();
    await expect(price).toHaveValue("1.234,70");
    await price.fill("1");
    await price.press("Home");
    await price.press("ArrowRight");
    await price.press("Backspace");
    await expect(price).toHaveValue("");
    await price.press(separator);
    await price.pressSequentially("05");
    await price.blur();
    await expect(price).toHaveValue("0,05");
  });

test("currency paste stays exact and over-precise prices remain invalid", async ({ page }) => {
  await fixture(page);
  await page.goto("/purchase-orders/new");
  const price = page.getByLabel("Preço unitário (R$)", { exact: true });
  for (const [raw, formatted] of [
    ["R$ 1.234,56", "1.234,56"],
    ["1234.56", "1.234,56"],
    ["999999999999.99", "999.999.999.999,99"],
    ["0", "0,00"],
  ]) {
    await price.fill(raw);
    await price.blur();
    await expect(price).toHaveValue(formatted);
    await expect(price).not.toHaveAttribute("aria-invalid", "true");
  }
  await price.fill("1.001");
  await price.blur();
  await expect(price).toHaveValue("1,001");
  await expect(price).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Informe um preço válido.", { exact: true })).toBeVisible();
});

test("a non-numeric price keeps what was typed, is flagged and recovers when corrected", async ({ page }) => {
  await fixture(page);
  await page.goto("/purchase-orders/new");
  const price = page.getByLabel("Preço unitário (R$)", { exact: true });
  await price.pressSequentially("123d");
  await expect(price).toHaveValue("123d,00");
  await price.pressSequentially("4");
  await expect(price).toHaveValue("123d4,00");
  await price.blur();
  await expect(price).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Informe um preço válido.", { exact: true })).toBeVisible();

  await price.focus();
  await price.press("Home");
  for (let step = 0; step < 5; step++) await price.press("ArrowRight");
  await price.press("Backspace");
  await price.press("Backspace");
  await expect(price).toHaveValue("123,00");
  await price.pressSequentially("4");
  await expect(price).toHaveValue("1.234,00");
  await price.blur();
  await expect(price).not.toHaveAttribute("aria-invalid", "true");

  await price.fill("-5");
  await price.blur();
  await expect(price).toHaveValue("-5");
  await expect(price).toHaveAttribute("aria-invalid", "true");
});

test("currency separators survive deletion and regrouping preserves the caret", async ({ page }) => {
  await fixture(page);
  await page.goto("/purchase-orders/new");
  const price = page.getByLabel("Preço unitário (R$)", { exact: true });
  await price.fill("1234.56");
  await price.press("Home");
  await price.press("ArrowRight");
  await price.pressSequentially("0");
  await expect(price).toHaveValue("10.234,56");
  await price.pressSequentially("9");
  await expect(price).toHaveValue("109.234,56");
  await price.press("Home");
  for (let step = 0; step < 7; step++) await price.press("ArrowRight");
  // Delete immediately before the comma, then Backspace immediately after it.
  await price.press("Delete");
  await expect(price).toHaveValue("109.234,56");
  await price.press("Backspace");
  await expect(price).toHaveValue("109.234,56");
  await price.press("Backspace");
  await expect(price).toHaveValue("10.923,56");
});

test("localized quantities retain strict positivity and precision checks", async ({ page }) => {
  await fixture(page);
  await page.goto("/purchase-orders/new");
  const quantity = page.getByLabel("Quantidade", { exact: true });
  await quantity.fill("0,000");
  await quantity.blur();
  await expect(page.getByText("Informe uma quantidade maior que zero.", { exact: true })).toBeVisible();
  for (const raw of ["1,2345", "1,2.3", "1.2,3", "1e3"]) {
    await quantity.fill(raw);
    await quantity.blur();
    await expect(quantity).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("form").getByRole("button", { name: "Cadastrar pedido", exact: true })).toBeDisabled();
  }
  await quantity.fill("0,005");
  await quantity.blur();
  await expect(quantity).not.toHaveAttribute("aria-invalid", "true");
  await expect(quantity).toHaveValue("0,005");
});

test("no projects disables new PO and direct entry returns to the list", async ({ page }) => {
  const state = await fixture(page);
  state.projects = false;
  await page.goto("/purchase-orders");
  await expect(page.getByRole("heading", { name: "Você ainda não tem obras disponíveis", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo pedido", exact: true })).toBeDisabled();
  await page.goto("/purchase-orders/new");
  await expect(page).toHaveURL(/\/purchase-orders$/);
  await expect(page.getByRole("form", { name: "Novo pedido", exact: true })).toHaveCount(0);
});

test("ADMIN broad reads do not enable creation", async ({ page }) => {
  const state = await fixture(page);
  state.role = "ADMIN";
  state.member = false;
  await page.goto("/purchase-orders");
  await expect(page.getByText("Para criar pedidos, solicite sua inclusão em uma obra.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo pedido", exact: true })).toBeDisabled();
  await page.goto("/purchase-orders/new");
  await expect(page).toHaveURL(/\/purchase-orders$/);
});

test("failed project reads are recoverable and never interpreted as no projects", async ({ page }) => {
  const state = await fixture(page);
  state.referenceFailure = true;
  await page.goto("/purchase-orders/new");
  await expect(page.getByRole("button", { name: "Tentar novamente", exact: true })).toBeVisible();
  await page.getByLabel("Descrição", { exact: true }).fill("Concreto C30");
  state.referenceFailure = false;
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(page.getByLabel("Obra", { exact: true })).toBeEnabled();
  await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue("Concreto C30");
});

test("no-project redirect never hides an uncertain submission or its recovery entry", async ({ page }) => {
  const state = await fixture(page);
  state.projects = false;
  await page.addInitScript(
    ({ userId, projectId }) => sessionStorage.setItem(`obraflow.purchaseOrderSubmission.${userId}`, projectId),
    { userId, projectId },
  );
  await page.goto("/purchase-orders");
  await expect(page.getByRole("button", { name: "Novo pedido", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Revisar envio", exact: true }).click();
  await expect(page.getByText("O pedido pode ter sido criado.", { exact: false })).toBeVisible();
  await expect(page).toHaveURL(/\/purchase-orders\/new$/);
  expect(await page.evaluate((id) => sessionStorage.getItem(`obraflow.purchaseOrderSubmission.${id}`), userId)).toBe(
    projectId,
  );
});
