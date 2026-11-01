import { openAccount } from "../support/account";
import { test, expect } from "@playwright/test";

test("login, live seeded list/detail, session restoration and logout", async ({ page }) => {
  await page.goto("/purchase-orders");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Usuário", { exact: true }).fill("joao");
  await page.getByLabel("Senha", { exact: true }).fill(process.env.SEED_USER_PASSWORD ?? "demo-user-2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pedidos de compra", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Abrir pedido/ }).first()).toBeVisible();
  await page
    .getByRole("link", { name: /^Abrir pedido/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Histórico de aprovação" })).toBeVisible();
  await expect(page.getByText(/^Versão \d+$/, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Histórico de aprovação" })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("obraflow.accessToken"))).toBeTruthy();
  expect(await page.evaluate(() => localStorage.getItem("obraflow.accessToken"))).toBeNull();
  await openAccount(page);
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => sessionStorage.getItem("obraflow.accessToken"))).toBeNull();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Histórico de aprovação" })).not.toBeVisible();
});

test("invalid credentials remain on login; malformed saved sessions are cleared", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Informe seu usuário.")).toBeVisible();
  await page.getByLabel("Usuário", { exact: true }).fill("joao");
  await page.getByLabel("Senha", { exact: true }).fill("invalid-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Usuário ou senha inválidos");
  await expect(page.getByLabel("Usuário", { exact: true })).toHaveValue("joao");
  await page.evaluate(() => sessionStorage.setItem("obraflow.accessToken", "invalid-token"));
  await page.goto("/purchase-orders");
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => sessionStorage.getItem("obraflow.accessToken"))).toBeNull();
});

test("demo personas use credential login, stable avatars and safe sidebar/mobile switching", async ({ page }) => {
  const picker = page.getByRole("dialog", { name: "Trocar perfil", exact: true });
  // Image availability must never be required to authenticate or switch profiles.
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await page.goto("/login");
  await page.getByRole("button", { name: "Explore o fluxo de aprovação" }).click();
  await expect(page.getByRole("heading", { name: "Escolha uma persona" })).toBeFocused();
  const personas = page.getByRole("group", { name: "Personas de demonstração" });
  await expect(personas.getByRole("button")).toHaveCount(6);
  const carlosAvatar = await personas
    .getByRole("button", { name: "Entrar como Carlos", exact: false })
    .locator("img")
    .getAttribute("src");
  const loginRequest = page.waitForRequest(
    (request) => request.url().endsWith("/auth/login") && request.method() === "POST",
  );
  await personas.getByRole("button", { name: "Entrar como Carlos", exact: false }).click();
  expect((await loginRequest).postDataJSON()).toEqual({ username: "carlos", password: "demo-user-2026" });
  const sidebar = page.getByRole("complementary", { name: "Menu lateral" });
  await expect(sidebar.getByText("Carlos", { exact: true })).toBeVisible();
  await page.getByLabel("Obra", { exact: true }).click();
  await expect(page.getByRole("option", { name: "Residencial Vista Norte", exact: true })).toBeVisible();
  await expect(page.getByRole("option")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("banner")).not.toBeVisible();
  // The URL seed is deterministic; broken images fall back to initials.
  expect(carlosAvatar).toContain("carlos%40obraflow.demo");
  expect(
    await sidebar
      .getByRole("button", { name: "Abrir painel da conta", exact: false })
      .locator("img")
      .getAttribute("src"),
  ).toBe(carlosAvatar);
  await expect(sidebar.locator('[data-initials="C"]')).toBeVisible();
  expect(
    await sidebar.locator('[data-initials="C"]').evaluate((element) => getComputedStyle(element, "::before").content),
  ).toBe('"C"');
  await openAccount(page);
  await page.getByRole("button", { name: "Trocar perfil", exact: true }).click();
  await picker.getByRole("button", { name: "Entrar como Beatriz", exact: false }).click();
  await expect(page).toHaveURL(/\/purchase-orders$/);
  await expect(sidebar.getByText("Beatriz", { exact: true })).toBeVisible();
  await expect(sidebar.getByText("Carlos", { exact: true })).not.toBeVisible();
  await page.getByLabel("Obra", { exact: true }).click();
  await expect(page.getByRole("option", { name: "Centro Comercial Atlântico", exact: true })).toBeVisible();
  await expect(page.getByRole("option")).toHaveCount(2);
  await page.keyboard.press("Escape");
  const tokenBeforeFailure = await page.evaluate(() => sessionStorage.getItem("obraflow.accessToken"));
  await page.route("**/auth/login", (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: "INVALID_CREDENTIALS", message: "Usuário ou senha inválidos.", details: [] } },
    }),
  );
  await openAccount(page);
  await page.getByRole("button", { name: "Trocar perfil", exact: true }).click();
  await picker.getByRole("button", { name: "Entrar como Administrador", exact: false }).click();
  await expect(picker.getByRole("alert")).toContainText("Usuário ou senha inválidos");
  expect(await page.evaluate(() => sessionStorage.getItem("obraflow.accessToken"))).toBe(tokenBeforeFailure);
  await picker.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(sidebar.getByText("Beatriz", { exact: true })).toBeVisible();
  await page.unroute("**/auth/login");
  await page.getByRole("button", { name: "Recolher navegação" }).click();
  await openAccount(page);
  await page.getByRole("button", { name: "Trocar perfil", exact: true }).click();
  await expect(picker).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker).not.toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("group", { name: "Aparência", exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /^Abrir conta/ }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("group", { name: "Aparência", exact: true })).toBeVisible();
  await drawer.getByRole("button", { name: "Trocar perfil", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Trocar perfil", exact: true })
    .getByRole("button", { name: "Entrar como João", exact: false })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Pedidos de compra", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Abrir conta/ }).click();
  await expect(page.getByRole("dialog").getByText("João", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() =>
      [...Object.keys(localStorage), ...Object.keys(sessionStorage)].some((key) => /password|senha/i.test(key)),
    ),
  ).toBe(false);
});

test("persona selection can return to manual login and preserve the entered username", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Usuário", { exact: true }).fill("minha-conta");
  await page.getByRole("button", { name: "Explore o fluxo de aprovação" }).click();
  await page.getByRole("button", { name: "Entrar com usuário e senha" }).click();
  await expect(page.getByLabel("Usuário", { exact: true })).toHaveValue("minha-conta");
});
