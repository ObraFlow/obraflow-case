import { test, expect } from "@playwright/test";

const projectId = "00000000-0000-4000-8000-000000000001";
const names = ["John", "Mary", "Alex", "Emma"];
const people = names.map((displayName, index) => ({
  id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  displayName,
  username: displayName,
  isActive: true,
  role: "USER",
}));
let bands: { approverId: string; upperLimit: string | null }[], writes: number;
test.beforeEach(async ({ page }) => {
  writes = 0;
  bands = people.map((person, index) => ({
    approverId: person.id,
    upperLimit: ["2500.00", "10000.00", "20000.00", null][index],
  }));
  await page.addInitScript(() => sessionStorage.setItem("obraflow.accessToken", "coa-view-fixture"));
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await page.route("**/api/v1/**", (route) => {
    if (route.request().method() !== "GET") writes++;
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me")) return route.fulfill({ json: { ...people[0], role: "ADMIN" } });
    if (path.endsWith("/projects"))
      return route.fulfill({
        json: {
          data: [
            {
              id: projectId,
              name: "CoA publicada",
              isActive: true,
              coaVersion: 1,
              membership: { count: 1, activeCount: 1, isMember: true },
            },
          ],
        },
      });
    if (path.endsWith("/members"))
      return route.fulfill({
        json: {
          data: people.map((person) => ({ userId: person.id, displayName: person.displayName, isActive: true })),
        },
      });
    if (path.endsWith("/users")) return route.fulfill({ json: { data: people } });
    if (path.endsWith("/coa")) return route.fulfill({ json: { projectId, coaVersion: bands.length ? 1 : 0, bands } });
    return route.fulfill({ json: { data: [] } });
  });
  await page.goto(`/admin/projects/${projectId}`);
  await expect(page.getByTestId("coa-view")).toBeVisible();
});

test("hover highlights each saved range and explains its exact cumulative approval prefix", async ({ page }) => {
  const view = page.getByTestId("coa-view"),
    first = view.getByTestId("coa-range-1");
  const height = (await first.locator("[data-coa-segment]").boundingBox())!.height;
  const viewHeight = (await view.boundingBox())!.height;
  await first.hover();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toContainText("Pedidos até R$ 2.500,00 precisam da confirmação apenas de John.");
  await expect
    .poll(async () => (await first.locator("[data-coa-segment]").boundingBox())!.height)
    .toBeGreaterThan(height * 1.5);
  expect((await view.boundingBox())!.height).toBeCloseTo(viewHeight, 1);
  await view.getByTestId("coa-range-2").hover();
  await expect(tooltip).toContainText("Pedidos entre R$ 2.500,01 e R$ 10.000,00 precisam da aprovação de:");
  await expect(tooltip.getByRole("listitem")).toHaveText(["John", "Mary"]);
  await view.getByTestId("coa-range-3").hover();
  await expect(tooltip).toContainText("Pedidos entre R$ 10.000,01 e R$ 20.000,00 precisam da aprovação de:");
  await expect(tooltip.getByRole("listitem")).toHaveText(["John", "Mary", "Alex"]);
  await view.getByTestId("coa-range-4").hover();
  await expect(tooltip).toContainText("Pedidos acima de R$ 20.000,00 precisam da confirmação de:");
  await expect(tooltip.getByRole("listitem")).toHaveText(names);
  await page.mouse.move(1, 1);
  await expect(tooltip).not.toBeVisible();
  await expect(view.locator("figure").getByRole("button")).toHaveCount(1);
  await expect(view.getByRole("button", { name: "Testar um valor", exact: true })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(view.getByRole("slider")).toHaveCount(0);
  expect(writes).toBe(0);
});

test("range descriptions are keyboard/touch accessible and bounded in narrow light/dark layouts", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width: 320, height: 620 });
    await page.getByRole("button", { name: "Editar", exact: true }).focus();
    const range = page.getByTestId("coa-range-3");
    await range.focus();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip.getByRole("listitem")).toHaveText(["John", "Mary", "Alex"]);
    const box = (await tooltip.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await range.press("Escape");
    await expect(tooltip).not.toBeVisible();
    await expect(range).toBeFocused();
  }
  const touch = await page.context().newCDPSession(page);
  await touch.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await page.getByRole("button", { name: "Editar", exact: true }).focus();
  const last = page.getByTestId("coa-range-4");
  await last.scrollIntoViewIfNeeded();
  const box = (await last.boundingBox())!;
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
  });
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.getByRole("tooltip").getByRole("listitem")).toHaveText(names);
  expect(writes).toBe(0);
});

test("a single unlimited approver and an unconfigured ladder have truthful read-only descriptions", async ({
  page,
}) => {
  bands = [{ approverId: people[0].id, upperLimit: null }];
  await page.reload();
  const view = page.getByTestId("coa-view");
  await view.getByTestId("coa-range-1").focus();
  await expect(page.getByRole("tooltip")).toContainText(
    "Pedidos de qualquer valor precisam da confirmação apenas de John.",
  );
  await expect(view.locator("[data-coa-boundary]")).toHaveCount(0);
  bands = [];
  await page.reload();
  await expect(view).toContainText("Nenhuma alçada configurada.");
  await expect(view.locator("[data-coa-segment]")).toHaveCount(0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  expect(writes).toBe(0);
});

test("range cards keep exact limits and the cumulative sequence without repeated approver copy", async ({ page }) => {
  const view = page.getByTestId("coa-view");
  const cards = view.getByRole("list", { name: "Faixas e cadeias efetivas" }).getByRole("listitem");
  await expect(cards).toHaveCount(4);
  await expect(cards.nth(0)).toContainText("De R$ 0,00 até R$ 2.500,00");
  await expect(cards.nth(1)).toContainText("De R$ 2.500,01 até R$ 10.000,00");
  await expect(cards.nth(3)).toContainText("Acima de R$ 20.000,00");
  for (let index = 0; index < 4; index++) {
    await expect(cards.nth(index)).toContainText(`Nível ${index + 1}`);
    await expect(cards.nth(index)).toContainText(names.slice(0, index + 1).join(" → "));
    await expect(cards.nth(index)).not.toContainText("Acrescenta ");
  }
  for (const width of [1440, 320])
    for (const theme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height: 750 });
      await page.emulateMedia({ colorScheme: theme });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await cards.evaluateAll((nodes) => nodes.every((node) => node.scrollWidth <= node.clientWidth))).toBe(
        true,
      );
    }
  expect(writes).toBe(0);
});

test("value testing and history disclose independently and retain the entered monetary value", async ({ page }) => {
  const view = page.getByTestId("coa-view");
  const tester = view.getByRole("button", { name: "Testar um valor", exact: true });
  const history = view.getByRole("button", { name: "Versões da alçada", exact: true });
  await tester.click();
  const value = view.getByLabel("Valor para simular (R$)", { exact: true });
  await value.fill("12500,01");
  await value.press("Tab");
  const formatted = await value.inputValue();
  await expect(view).toContainText("3 aprovações necessárias");
  await history.click();
  await expect(tester).toHaveAttribute("aria-expanded", "true");
  await tester.click();
  await expect(value).toBeHidden();
  await expect(history).toHaveAttribute("aria-expanded", "true");
  await tester.click();
  await expect(value).toHaveValue(formatted);
  await expect(view).toContainText("3 aprovações necessárias");
  expect(writes).toBe(0);
});
