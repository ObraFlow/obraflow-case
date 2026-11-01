import { test, expect, type Page, type Locator, type TestInfo } from "@playwright/test";
import { openAccount } from "../support/account";
import { signInAs } from "../support/session";

let token: string;
test.beforeAll(async ({ request }) => {
  const auth = await request.post("/api/v1/auth/login", {
    data: { username: "admin", password: process.env.SEED_ADMIN_PASSWORD ?? "demo-admin-2026" },
  });
  expect(auth.ok()).toBe(true);
  token = (await auth.json()).accessToken;
});
test.beforeEach(async ({ page }) => {
  await signInAs(page, token);
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
});
test.setTimeout(90000);

async function evidence(page: Page, info: TestInfo, name: string, fullPage = false) {
  const focus = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null,
      skip = document.querySelector<HTMLAnchorElement>(".skip-link");
    const rect = (node: Element | null) =>
      node
        ? (() => {
            const r = node.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          })()
        : null;
    return {
      active: {
        tag: active?.tagName,
        id: active?.id,
        label: active?.getAttribute("aria-label"),
        role: active?.getAttribute("role"),
        rect: rect(active),
      },
      skip: {
        focused: active === skip,
        rect: rect(skip),
        position: skip && getComputedStyle(skip).position,
        clipPath: skip && getComputedStyle(skip).clipPath,
      },
      scroll: { x: scrollX, y: scrollY },
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
    };
  });
  await info.attach(`${name}-focus.json`, {
    body: JSON.stringify({ fullPage, ...focus }, null, 2),
    contentType: "application/json",
  });
}
// Allow subpixel clipping at rounded scroll-container borders; actions are also clicked.
async function tabTo(page: Page, target: Locator, limit = 45) {
  for (let i = 0; i < limit && !(await target.evaluate((e) => e === document.activeElement)); i++)
    await page.keyboard.press("Tab");
  await expect(target).toBeFocused();
  await expect(target).toBeInViewport({ ratio: 0.98 });
}

for (const viewport of [{ width: 390, height: 844 }])
  test(`compact creation discovers errors and preserves local fields at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    let writes = 0;
    await page.route("**/api/v1/**", (route) => {
      if (route.request().method() === "GET") return route.continue();
      writes++;
      return route.fulfill({
        status: 503,
        json: { error: { code: "CAPTURE_GUARD", message: "No writes expected.", details: [] } },
      });
    });
    for (const kind of ["suppliers", "projects", "users"] as const) {
      await page.goto(`/admin/${kind}`);
      const trigger = page.getByRole("button", {
        name: kind === "users" ? "Adicionar usuário" : kind === "suppliers" ? "Adicionar fornecedor" : "Adicionar obra",
        exact: true,
      });
      await trigger.click();
      const form = page.getByRole("dialog", {
        name: kind === "users" ? "Novo usuário" : kind === "suppliers" ? "Novo fornecedor" : "Nova obra",
        exact: true,
      });
      const name = form.getByLabel(
        kind === "users" ? "Nome de exibição" : kind === "suppliers" ? "Nome do fornecedor" : "Nome da obra",
        { exact: true },
      );
      await expect(name).toBeEnabled();
      await expect(form.locator("legend")).toHaveCount(0);
      expect((await form.boundingBox())!.height).toBeLessThan(kind === "users" ? 930 : 480);
      await evidence(page, info, `compact-${kind}-${viewport.width}x${viewport.height}-empty`);
      await form
        .getByRole("button", {
          name: kind === "users" ? "Criar usuário" : kind === "suppliers" ? "Criar fornecedor" : "Criar obra",
          exact: true,
        })
        .click();
      await expect(name).toBeFocused();
      await expect(name).toHaveAttribute("aria-invalid", "true");
      await evidence(page, info, `compact-${kind}-${viewport.width}x${viewport.height}-invalid`);
      await name.fill("Cadastro para revisão");
      if (kind === "users") {
        await form.getByLabel("Usuário", { exact: true }).fill("helena.revisao");
        await form.getByLabel("Senha inicial", { exact: true }).fill("private-initial-password");
        await form.getByRole("button", { name: "Mostrar senha inicial", exact: true }).click();
        await expect(form.getByLabel("Senha inicial", { exact: true })).toHaveAttribute("type", "text");
        await form.getByRole("button", { name: "Ocultar senha inicial", exact: true }).click();
      }
      await evidence(page, info, `compact-${kind}-${viewport.width}x${viewport.height}-filled`);
      await page.keyboard.press("Escape");
      await expect(form).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await evidence(page, info, `compact-${kind}-${viewport.width}x${viewport.height}-dismissed`);
      await trigger.click();
      await expect(name).toHaveValue("Cadastro para revisão");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    expect(writes).toBe(0);
  });

for (const height of [667])
  for (const theme of ["light"] as const)
    test(`account menu fits the phone viewport and its actions are reachable by keyboard at 390x${height}/${theme}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width: 390, height });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/purchase-orders");
      await openAccount(page);
      const menu = page.getByRole("dialog"),
        profile = menu.getByRole("button", { name: "Trocar perfil", exact: true }),
        logout = menu.getByRole("button", { name: "Logout", exact: true });
      const box = (await menu.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
      await expect(profile).toBeInViewport({ ratio: 0.98 });
      await expect(logout).toBeInViewport({ ratio: 0.98 });
      await page.getByRole("radio", { name: "Sistema", exact: true }).focus();
      await tabTo(page, profile);
      await evidence(page, info, `account-menu-keyboard-${height}-${theme}`);
      await profile.click();
      const personas = page.getByRole("dialog", { name: "Trocar perfil", exact: true });
      await expect(personas).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(personas).toHaveCount(0);
      await expect(page.getByRole("group", { name: "Aparência", exact: true })).toHaveCount(0);
      await openAccount(page);
      await logout.click();
      await expect(page).toHaveURL(/\/login$/);
    });
