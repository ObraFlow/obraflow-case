import { test, expect } from "@playwright/test";

const projectId = "00000000-0000-4000-8000-000000000001";
const people = ["John", "Mary", "Alex"].map((displayName, index) => ({
  id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  displayName,
  username: displayName,
  isActive: true,
  role: "USER",
}));
let writes = 0;

for (const width of [320, 390, 1440])
  for (const colorScheme of ["light", "dark"] as const)
    test(`extreme exact amounts keep bounded ARIA positions at ${width}px/${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      const trigger = page.getByRole("button", { name: "Editar limite após Mary", exact: false });
      const slider = page.getByRole("slider", { name: "Limite após Mary", exact: true });
      for (const [input, announced] of [
        ["90071992547409.92", "R$ 90.071.992.547.409,92"],
        ["90071992547409.93", "R$ 90.071.992.547.409,93"],
        ["9999999999999999.99", "R$ 9.999.999.999.999.999,99"],
      ]) {
        await trigger.press("Enter");
        const dialog = page.getByRole("dialog", { name: "Editar limite", exact: true });
        await dialog.getByRole("textbox").fill(input);
        await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
        await expect(slider).toHaveAttribute("aria-valuetext", announced);
        if (width < 600) {
          const bounds = (await trigger.boundingBox())!;
          expect(bounds.height, "Exact amount remains readable instead of stacking tiny fragments").toBeLessThanOrEqual(
            48,
          );
          expect(bounds.x).toBeGreaterThanOrEqual(0);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
          await expect(page.getByText("Limite após Mary", { exact: true })).toBeVisible();
          await expect(page.getByText("Alex · Sem limite superior", { exact: true })).toBeVisible();
          for (const [index, name] of ["John", "Mary", "Alex"].entries()) {
            const row = page.locator(`[data-person-section="${index}"]`);
            await expect(row.getByText(`Nível ${index + 1}`, { exact: true })).toBeVisible();
            const label = row.getByRole("combobox").locator("span").first();
            await expect(label).toContainText(name);
            expect(await label.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
          }
          const previous = (await page
            .getByRole("button", { name: "Editar limite após John", exact: false })
            .boundingBox())!;
          expect(bounds.y).toBeGreaterThan(previous.y + previous.height);
        }
        const numeric = await slider.evaluate((element) =>
          ["aria-valuemin", "aria-valuenow", "aria-valuemax"].map((attribute) =>
            Number(element.getAttribute(attribute)),
          ),
        );
        expect(numeric.every(Number.isFinite)).toBe(true);
        expect(numeric[0]).toBe(0);
        expect(numeric[2]).toBe(100);
        expect(numeric[1]).toBeGreaterThanOrEqual(0);
        expect(numeric[1]).toBeLessThanOrEqual(100);
        await trigger.press("Enter");
        await expect(dialog.getByRole("textbox")).toHaveValue(input);
        await dialog.getByRole("textbox").press("Escape");
      }
      await slider.press("ArrowLeft");
      await expect(slider).toHaveAttribute("aria-valuetext", "R$ 9.999.999.999.999.998,99");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(writes).toBe(0);
    });
test.beforeEach(async ({ page }) => {
  writes = 0;
  await page.addInitScript(() => sessionStorage.setItem("obraflow.accessToken", "amount-editor-fixture"));
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "PUT") {
      writes++;
      return route.fulfill({
        status: 500,
        json: { error: { code: "UNEXPECTED_WRITE", message: "Somente edição local.", details: [] } },
      });
    }
    if (path.endsWith("/auth/me")) return route.fulfill({ json: { ...people[0], role: "ADMIN" } });
    if (path.endsWith("/projects"))
      return route.fulfill({
        json: {
          data: [
            {
              id: projectId,
              name: "Limites de aprovação",
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
    if (path.endsWith("/coa"))
      return route.fulfill({
        json: {
          projectId,
          coaVersion: 1,
          bands: people.map((person, index) => ({
            approverId: person.id,
            upperLimit: ["2500.00", "10000.00", null][index],
          })),
        },
      });
    return route.fulfill({ json: { data: [] } });
  });
  await page.goto(`/admin/projects/${projectId}`);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
});

test("amount dialog owns applicable bounds and validation; Confirm applies only to the local ladder", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Editar limite após John", exact: false }).click();
  const dialog = page.getByRole("dialog", { name: "Editar limite", exact: true });
  const input = dialog.getByRole("textbox", { name: "Limite após John (R$)", exact: true });
  await expect(input).toBeFocused();
  await expect(dialog.getByText("Limite após John (R$)", { exact: true })).toBeVisible();
  await expect(dialog).toContainText("Confirmar ajusta apenas o rascunho");
  await expect(dialog.getByText(/Salve o valor no rascunho/)).toHaveCount(0);
  await expect(dialog.getByText("Máximo", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Mínimo", { exact: true })).toBeVisible();
  await expect(dialog.getByText("R$ 0,01", { exact: true })).toBeVisible();
  await expect(dialog.getByText("R$ 9.999,99", { exact: true })).toBeVisible();
  await input.fill("10000");
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("R$ 9.999,99");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert")).toHaveCount(1);
  await expect(
    page.getByRole("slider", { name: "Limite após John", exact: true, includeHidden: true }),
  ).toHaveAttribute("aria-valuetext", "R$ 2.500,00");
  await input.fill("9999.99");
  await input.press("Tab");
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "Limite após John", exact: true, includeHidden: true }),
  ).toHaveAttribute("aria-valuetext", "R$ 2.500,00");
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Editar limite após John", exact: false })).toBeFocused();
  await expect(page.getByRole("slider", { name: "Limite após John", exact: true })).toHaveAttribute(
    "aria-valuetext",
    "R$ 9.999,99",
  );
  expect(writes).toBe(0);
});

test("Close, Escape and outside dismissal discard input and restore focus without publication", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Editar limite após Mary", exact: false });
  const dialog = page.getByRole("dialog", { name: "Editar limite", exact: true });
  for (const action of ["close", "escape", "outside"] as const) {
    await trigger.press(action === "escape" ? "Space" : "Enter");
    const input = dialog.getByRole("textbox");
    await expect(dialog.getByText("R$ 2.500,01", { exact: true })).toBeVisible();
    await expect(dialog.getByText(/Máximo/)).toHaveCount(0);
    await expect(dialog.getByText("R$ 9.999.999.999.999.999,99", { exact: true })).toHaveCount(0);
    await input.fill("0.001");
    await input.press("Enter");
    await expect(dialog.getByRole("alert")).toBeVisible();
    if (action === "close") await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
    if (action === "escape") await input.press("Escape");
    if (action === "outside") await page.mouse.click(4, 4);
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toHaveText("R$ 10.000,00");
    await expect(trigger).toBeFocused();
  }
  await trigger.click();
  await expect(dialog.getByRole("textbox")).toHaveValue("10000.00");
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  expect(writes).toBe(0);
});

test("anchored amount editor is bounded and keyboard accessible on short mobile and dark screens", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 600 },
    { width: 320, height: 360 },
  ]) {
    await page.setViewportSize(viewport);
    await page.getByRole("button", { name: "Editar limite após Mary", exact: false }).click();
    const dialog = page.getByRole("dialog", { name: "Editar limite", exact: true });
    await expect(dialog.getByRole("textbox")).toBeFocused();
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Initial input focus; the header close control precedes the form in DOM order.
    const input = dialog.getByRole("textbox");
    const confirm = dialog.getByRole("button", { name: "Confirmar", exact: true });
    const close = dialog.getByRole("button", { name: "Fechar", exact: true });
    const cancel = dialog.getByRole("button", { name: "Cancelar", exact: true });
    await page.keyboard.press("Tab");
    await expect(cancel).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(input).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(cancel).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(input).toBeFocused();
    await page.keyboard.press("Escape");
  }
  expect(writes).toBe(0);
});
