import { test, expect, type Page } from "@playwright/test";

const projectId = "11111111-1111-4111-8111-111111111111";
async function fixture(page: Page) {
  const state = { failure: false, role: "ADMIN", requests: [] as string[] };
  await page.addInitScript(() => sessionStorage.setItem("obraflow.accessToken", "feedback-fixture"));
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await page.route("**/api/v1/**", (route) => {
    const url = new URL(route.request().url());
    state.requests.push(url.pathname + url.search);
    if (route.request().method() !== "GET") throw new Error("Feedback checks must not write.");
    if (url.pathname.endsWith("/auth/me"))
      return route.fulfill({
        json: { id: projectId, username: "admin", displayName: "Administrador", isActive: true, role: state.role },
      });
    if (url.pathname.endsWith("/projects"))
      return route.fulfill({
        json: {
          data: [
            {
              id: projectId,
              name: "Obra de demonstração",
              isActive: true,
              coaVersion: 1,
              membership: { count: 1, activeCount: 1, isMember: true },
            },
          ],
        },
      });
    if (url.pathname.endsWith("/purchase-orders") || url.pathname.endsWith("/audit/events")) {
      if (state.failure)
        return route.fulfill({
          status: 503,
          json: { error: { code: "UNAVAILABLE", message: "Consulta indisponível. Tente novamente.", details: [] } },
        });
      return route.fulfill({
        json: {
          data: [],
          pagination: {
            page: Number(url.searchParams.get("page") ?? 1),
            pageSize: Number(url.searchParams.get("pageSize") ?? 20),
            total: 0,
          },
          distribution: { total: 0, byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0 }, actionableByMe: 0 },
        },
      });
    }
    return route.fulfill({ json: { data: [] } });
  });
  return state;
}

for (const [width, colorScheme] of [
  [1440, "light"],
  [390, "dark"],
] as const) {
  test(`read errors and empty recovery preserve context at ${width}/${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    const state = await fixture(page);
    state.failure = true;
    const query = `projectId=${projectId}&status=REJECTED&pageSize=10`;
    await page.goto(`/purchase-orders?${query}`);
    const error = page.getByRole("alert");
    await expect(error).toContainText("Consulta indisponível");
    await expect(error.locator('svg[aria-hidden="true"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Consultar contagens novamente", exact: true })).toHaveCount(0);
    state.failure = false;
    await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Nenhum pedido encontrado", exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("projectId")).toBe(projectId);
    expect(new URL(page.url()).searchParams.get("status")).toBe("REJECTED");
    await page.getByRole("button", { name: "Limpar filtros", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Nenhum pedido cadastrado", exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("pageSize")).toBe("10");
    expect(new URL(page.url()).searchParams.has("projectId")).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("unavailable order/audit pages return directly while preserving filters and page size", async ({ page }) => {
  await fixture(page);
  for (const route of ["/purchase-orders", "/admin/audit"]) {
    await page.goto(`${route}?projectId=${projectId}&pageSize=10&page=999`);
    await expect(page.getByRole("heading", { name: "Página indisponível", exact: true })).toBeVisible();
    await expect(
      page.getByRole("navigation", {
        name: route.includes("audit") ? "Paginação da auditoria" : "Paginação",
        exact: true,
      }),
    ).not.toContainText("Página 999 de");
    await expect(page.getByRole("button", { name: "Anterior", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Voltar à primeira página", exact: true }).click();
    await expect(page).toHaveURL(/page=1/);
    const params = new URL(page.url()).searchParams;
    expect(params.get("projectId")).toBe(projectId);
    expect(params.get("pageSize")).toBe("10");
  }
});

test("error without retry and initial catalog empty state use icons and safe actions", async ({ page }) => {
  const state = await fixture(page);
  state.role = "USER";
  await page.goto("/admin/users");
  await expect(page.getByRole("alert")).toContainText("Você não tem permissão");
  await expect(page.getByRole("alert").locator('svg[aria-hidden="true"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toHaveCount(0);
  state.role = "ADMIN";
  await page.goto("/admin/suppliers");
  const empty = page.getByRole("heading", { name: "Nenhum fornecedor cadastrado", exact: true }).locator("..");
  await expect(empty.locator('svg[aria-hidden="true"]').first()).toBeVisible();
  await empty.getByRole("button", { name: "Criar primeiro fornecedor", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Novo fornecedor", exact: true })).toBeVisible();
});

test("mobile close, calendar and shell actions have comfortable targets without overflow", async ({ page }) => {
  await fixture(page);
  await page.setViewportSize({ width: 320, height: 667 });
  await page.goto("/admin/suppliers");
  await expect(page.getByRole("heading", { name: "Nenhum fornecedor cadastrado", exact: true })).toBeVisible();
  for (const name of ["Abrir navegação", "Abrir conta"]) {
    const bounds = (await page
      .getByRole("button", { name: name === "Abrir conta" ? /^Abrir conta/ : name, exact: name !== "Abrir conta" })
      .boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .getByRole("heading", { name: "Nenhum fornecedor cadastrado", exact: true })
    .locator("..")
    .getByRole("button")
    .click();
  const close = page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true });
  const bounds = (await close.boundingBox())!;
  expect(bounds.width).toBeGreaterThanOrEqual(44);
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  await close.click();
});
