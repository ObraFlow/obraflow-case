import { test, expect, type Page } from "@playwright/test";
import { appearance, closeAccount, openAccount } from "../support/account";
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
  f = await createFixture();
  token = server.jwt.sign({ sub: f.admin.id });
});
test.afterAll(async () => {
  await f?.cleanup();
  await stopApi(server, database);
});
async function enter(page: Page) {
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await signInAs(page, token);
  await page.goto("/purchase-orders");
  await expect(page.getByRole("heading", { name: "Pedidos de compra", exact: true })).toBeVisible();
}
const panel = (page: Page) => page.getByRole("dialog", { name: "Conta e preferências", exact: true });

test("desktop account is one portal surface, preserves navigation and closes with outside click or Escape", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await enter(page);
  const sidebar = page.getByRole("complementary", { name: "Menu lateral" });
  const navigation = page.getByRole("navigation", { name: "Navegação principal", exact: true });
  const before = await navigation.boundingBox();
  const accountTrigger = page.getByRole("button", { name: "Abrir painel da conta", exact: false });
  const chevron = accountTrigger.locator("svg path").first();
  await accountTrigger.hover();
  await expect
    .poll(() => chevron.evaluate((element) => getComputedStyle(element).transform))
    .toBe("matrix(1, 0, 0, 1, 0, 2)");
  await openAccount(page);
  await expect(panel(page)).toBeVisible();
  const openingDuration = await panel(page).evaluate((element) =>
    parseFloat(getComputedStyle(element).transitionDuration),
  );
  expect(openingDuration).toBeGreaterThanOrEqual(0.2);
  expect(openingDuration).toBeLessThanOrEqual(0.24);
  expect(await panel(page).evaluate((element) => element.closest("aside"))).toBeNull();
  expect(await navigation.boundingBox()).toEqual(before);
  await expect(sidebar.getByRole("button", { name: "Abrir painel da conta" })).not.toBeVisible();
  await expect(panel(page).getByText(f.admin.displayName, { exact: true })).toBeVisible();
  await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
  await expect(panel(page)).not.toHaveAttribute("aria-modal", "true");
  const settings = (await panel(page).getByRole("group", { name: "Aparência" }).boundingBox())!;
  const identity = (await panel(page).getByRole("button", { name: "Fechar painel da conta" }).boundingBox())!;
  const logout = (await panel(page).getByRole("button", { name: "Logout" }).boundingBox())!;
  expect(settings.y + settings.height).toBeLessThanOrEqual(identity.y);
  expect(identity.y + identity.height).toBeLessThanOrEqual(logout.y);
  await expect(panel(page).getByRole("separator")).toHaveCount(1);
  await expect(panel(page).getByText("Demo", { exact: true })).toBeVisible();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  const demoInfo = panel(page).getByRole("button", { name: "Sobre o modo Demo" });
  await demoInfo.hover();
  await expect(page.getByRole("tooltip")).toContainText("A troca de perfil está disponível apenas para demonstração.");
  const logoutAction = panel(page).getByRole("button", { name: "Logout", exact: true });
  // Move outside the tooltip's hover corridor before targeting another action.
  await page.mouse.move(800, 100);
  await expect(page.getByRole("tooltip")).not.toBeVisible();
  await logoutAction.hover();
  await expect
    .poll(() => logoutAction.evaluate((element) => getComputedStyle(element, "::before").transform))
    .toBe("matrix(1, 0, 0, 1, 0, 0)");
  await logoutAction.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(demoInfo).toBeFocused();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await logoutAction.focus();
  await expect(page.getByRole("tooltip")).not.toBeVisible();
  await page.getByRole("heading", { name: "Pedidos de compra", exact: true }).hover();
  // The notification section covers the lower navigation; use an uncovered link.
  await page.getByRole("link", { name: "Pedidos de compra", exact: true }).click();
  await expect(panel(page)).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Pedidos de compra", exact: true })).toBeFocused();
  await page.getByRole("link", { name: "Obras", exact: true }).click();
  await openAccount(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Abrir painel da conta", exact: false })).toBeFocused();
  await page.getByRole("button", { name: "Abrir painel da conta", exact: false }).press("Enter");
  await expect(panel(page)).toBeVisible();
  await closeAccount(page);
  await expect(page.getByRole("button", { name: "Abrir painel da conta", exact: false })).toBeFocused();
});

test("appearance changes stay open and persist; language is static and system tracks the OS", async ({ page }) => {
  await enter(page);
  await appearance(page, "Escuro");
  await expect(panel(page)).toBeVisible();
  const label = await panel(page).locator(".account-theme-label").boundingBox();
  const options = await panel(page).locator(".account-theme-options").boundingBox();
  expect(Math.abs(label!.y + label!.height / 2 - options!.y - options!.height / 2)).toBeLessThan(2);
  await expect(panel(page).getByRole("radio")).toHaveCount(3);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(panel(page).getByRole("combobox")).toHaveCount(0);
  await expect(panel(page).getByText("Português (BR)", { exact: true })).toBeVisible();
  await expect(panel(page).getByRole("button", { name: /Idioma|Português/ })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("obraflow.theme"))).toBe("dark");
  expect(await page.evaluate(() => sessionStorage.getItem("obraflow.accessToken"))).toBe(token);
  await page.reload();
  await openAccount(page);
  await expect(page.getByRole("radio", { name: "Escuro", exact: true })).toBeChecked();
  await appearance(page, "Claro");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("radio", { name: "Claro", exact: true }).press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Escuro", exact: true })).toBeChecked();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await appearance(page, "Sistema");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(panel(page)).toBeVisible();
});

test("reduced motion skips the identity animation and failed persona login preserves session and focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enter(page);
  await openAccount(page);
  const durations = await panel(page).evaluate((element) =>
    getComputedStyle(element)
      .transitionDuration.split(",")
      .map((value) => parseFloat(value)),
  );
  expect(durations.every((value) => value <= 0.001)).toBe(true);
  expect(
    await panel(page).evaluate(
      (element) =>
        element.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);
  await panel(page).getByRole("button", { name: "Fechar painel da conta" }).hover();
  await expect(
    panel(page).getByRole("button", { name: "Fechar painel da conta" }).locator("svg path").first(),
  ).toHaveCSS("transform", "none");
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/auth/login", async (route) => {
    await held;
    return route.fulfill({
      status: 401,
      json: { error: { code: "INVALID_CREDENTIALS", message: "Usuário ou senha inválidos.", details: [] } },
    });
  });
  await panel(page).getByRole("button", { name: "Trocar perfil", exact: true }).click();
  const personas = page.getByRole("dialog", { name: "Trocar perfil", exact: true });
  await personas.getByRole("button", { name: "Entrar como João", exact: false }).click();
  try {
    await expect(personas.getByRole("button", { name: "Entrar como Carlos", exact: false })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(personas).toBeVisible();
  } finally {
    release();
  }
  await expect(personas.getByRole("alert")).toContainText("Usuário ou senha inválidos");
  expect(await page.evaluate(() => sessionStorage.getItem("obraflow.accessToken"))).toBe(token);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Abrir painel da conta", exact: false })).toBeFocused();
});

test("phone account menu opens from the top-right avatar and logout clears the active session", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  await page.getByRole("button", { name: "Abrir navegação", exact: true }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("group", { name: "Aparência", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openAccount(page);
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await appearance(page, "Escuro");
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await closeAccount(page);
  await expect(page.getByRole("group", { name: "Aparência", exact: true })).toHaveCount(0);
  await openAccount(page);
  await page.getByRole("dialog").getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => sessionStorage.getItem("obraflow.accessToken"))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("obraflow.theme"))).toBe("dark");
});
