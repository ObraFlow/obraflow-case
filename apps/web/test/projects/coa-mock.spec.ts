import { thresholdCents } from "../support/threshold-value";
import { confirmSave } from "../support/save-confirmation";
import { selectOption } from "../support/select";
import { test, expect, type Page } from "@playwright/test";

const names = ["John", "Mary", "Alex", "Emma", "David"];
const ids = Object.fromEntries(
  names.map((name, index) => [name, `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`]),
);
let writes = 0;
const track = (page: Page) => page.getByRole("group", { name: "Limites da alçada de aprovação", exact: true });
async function ratio(page: Page, index = 0) {
  const bar = (await track(page).boundingBox())!,
    tick = (await page.getByRole("slider").nth(index).boundingBox())!;
  return (tick.x + tick.width / 2 - bar.x) / bar.width;
}
async function hold(page: Page, fraction: number, index = 0) {
  // Let focus restoration/scroll unlocking complete before starting a new gesture
  // when this interaction test has deliberately paused the browser clock.
  await page.clock.runFor(100);
  const slider = page.getByRole("slider").nth(index);
  await slider.scrollIntoViewIfNeeded();
  const tick = (await slider.boundingBox())!,
    bar = (await track(page).boundingBox())!;
  await page.mouse.move(tick.x + tick.width / 2, tick.y + tick.height / 2);
  await page.mouse.down();
  await page.mouse.move(bar.x + bar.width * fraction, bar.y + bar.height / 2);
}
test.beforeEach(async ({ page }) => {
  writes = 0;
  const projectId = "00000000-0000-4000-8000-000000000001";
  await page.addInitScript(() => sessionStorage.setItem("obraflow.accessToken", "mock-preview"));
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  let saved = {
    projectId,
    coaVersion: 1,
    bands: [
      { approverId: ids.John!, upperLimit: "2500.00" as string | null },
      { approverId: ids.Mary!, upperLimit: null as string | null },
    ],
  };
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "PUT" && path.endsWith("/coa")) {
      writes++;
      const input = route.request().postDataJSON();
      expect(Object.keys(input).sort()).toEqual(["bands", "expectedCoaVersion"]);
      if (input.expectedCoaVersion !== saved.coaVersion)
        return route.fulfill({
          status: 409,
          json: { error: { code: "COA_VERSION_CONFLICT", message: "Versao desatualizada.", details: [] } },
        });
      saved = {
        ...saved,
        coaVersion: saved.coaVersion + (JSON.stringify(input.bands) === JSON.stringify(saved.bands) ? 0 : 1),
        bands: input.bands,
      };
      return route.fulfill({ json: saved });
    }
    if (path.endsWith("/members"))
      return route.fulfill({
        json: { data: names.map((name) => ({ userId: ids[name], displayName: name, isActive: true })) },
      });
    if (path.endsWith("/users"))
      return route.fulfill({
        json: {
          data: names.map((name) => ({
            id: ids[name],
            username: name,
            displayName: name,
            role: "USER",
            isActive: true,
          })),
        },
      });
    if (path.endsWith("/auth/me"))
      return route.fulfill({ json: { id: projectId, username: "admin", displayName: "Admin", role: "ADMIN" } });
    if (path.endsWith("/projects"))
      return route.fulfill({
        json: {
          data: [
            {
              id: projectId,
              name: "Mock project",
              isActive: true,
              coaVersion: 1,
              membership: { count: 1, activeCount: 1, isMember: true },
            },
          ],
        },
      });
    if (path.endsWith("/coa")) return route.fulfill({ json: saved });
    return route.fulfill({ json: { data: [] } });
  });
  await page.goto(`/admin/projects/${projectId}`);
  await expect(page.getByRole("heading", { name: "Alçada de aprovação" }).first()).toBeVisible();
  await expect(page.getByTestId("coa-view")).toBeVisible();
  await expect(page.getByRole("slider")).toHaveCount(0);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
});

test("mock approval bar adds people and constrains pointer/keyboard ticks without publishing", async ({ page }) => {
  const sliders = page.getByRole("slider", { includeHidden: true });
  const first = sliders.nth(0);
  await expect(sliders).toHaveCount(1);
  await expect(first).toHaveAttribute("aria-valuetext", "R$ 2.500,00");
  const editBox = (await page.getByRole("button", { name: "Publicar alçada", exact: true }).boundingBox())!;
  const addBox = (await page.getByRole("button", { name: "Adicionar nível" }).boundingBox())!;
  expect(editBox.x).toBeGreaterThan(addBox.x + addBox.width);
  expect(addBox.y).toBe(editBox.y);
  await page.getByRole("combobox", { name: "Aprovador do nível 1" }).click();
  await expect(page.getByRole("option", { name: "Mary", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(first).toHaveCSS("cursor", "grab");
  await expect(page.getByRole("button", { name: "Publicar alçada", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar alçada" })).toHaveCount(0);

  await page.getByRole("button", { name: "Adicionar nível" }).click();
  await expect(sliders).toHaveCount(2);
  await expect(page.getByRole("combobox", { name: "Aprovador do nível 3" })).toHaveAttribute("value", ids.Alex!);
  const bar = (await page.getByRole("group", { name: "Limites da alçada de aprovação" }).boundingBox())!;
  const tick = (await first.boundingBox())!;
  await page.mouse.move(tick.x + tick.width / 2, tick.y + tick.height / 2);
  await page.mouse.down();
  await expect(first).toHaveCSS("cursor", "grabbing");
  await page.mouse.move(bar.x + bar.width * 0.95, bar.y + bar.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(first).toHaveAttribute("aria-valuetext", "R$ 26.249,99");
  await expect(sliders.nth(1)).toHaveAttribute("aria-valuetext", "R$ 26.250,00");
  await first.press("ArrowRight");
  await expect(first).toHaveAttribute("aria-valuetext", "R$ 26.249,99");
  await first.press("Home");
  await expect(first).toHaveAttribute("aria-valuetext", "R$ 0,01");
  await first.press("ArrowRight");
  await expect(first).toHaveAttribute("aria-valuetext", "R$ 1,01");
  await selectOption(page.getByRole("combobox", { name: "Aprovador do nível 1" }), ids.Emma!);
  await expect(first).toHaveAccessibleName("Limite após Emma");

  await page.getByRole("button", { name: "Adicionar nível" }).click();
  await page.getByRole("button", { name: "Adicionar nível" }).click();
  await expect(sliders).toHaveCount(4);
  await expect(page.getByRole("combobox", { name: "Aprovador do nível 4" })).toHaveAttribute("value", ids.John!);
  await expect(page.getByRole("combobox", { name: "Aprovador do nível 5" })).toHaveAttribute("value", ids.David!);
  await expect(page.getByRole("button", { name: "Adicionar nível" })).toHaveCount(0);
  const assigned = await page
    .getByRole("combobox", { name: /^Aprovador do nível/ })
    .evaluateAll((elements) => elements.map((element) => (element as HTMLSelectElement).value));
  expect(new Set(assigned).size).toBe(5);
  await page.setViewportSize({ width: 390, height: 844 });
  const previousEnd = await thresholdCents(sliders.nth(3));
  await sliders.nth(3).press("End");
  expect(await thresholdCents(sliders.nth(3))).toBeGreaterThan(previousEnd);
  expect(await ratio(page, 3)).toBeCloseTo(0.8, 3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(writes).toBe(0);
  await page.reload();
  await expect(page.getByTestId("coa-view")).toBeVisible();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(sliders).toHaveCount(1);
  await expect(first).toHaveAttribute("aria-valuetext", "R$ 2.500,00");
});

test("name handles preview swaps, commit only on drop, and support cancellation, keyboard and touch", async ({
  page,
}) => {
  const firstPerson = page.getByRole("combobox", { name: "Aprovador do nível 1" });
  const secondPerson = page.getByRole("combobox", { name: "Aprovador do nível 2" });
  const startDrag = async (name: string, target = secondPerson) => {
    const handle = page.getByRole("button", { name: `Arrastar ${name} para trocar` });
    await handle.hover();
    const from = (await handle.boundingBox())!;
    const to = (await target.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 6 });
  };
  await startDrag("John");
  const draggedPerson = page.getByTestId("dragged-person");
  await expect(draggedPerson).toHaveText("John");
  const targetBox = (await secondPerson.boundingBox())!;
  const previewBox = (await draggedPerson.boundingBox())!;
  expect(previewBox.x - (targetBox.x + targetBox.width / 2)).toBeCloseTo(14, 0);
  expect(previewBox.y - (targetBox.y + targetBox.height / 2)).toBeCloseTo(14, 0);
  await expect(page.getByLabel("Editor da alçada de aprovação", { exact: true }).getByRole("status")).toHaveText(
    "Trocar John por Mary",
  );
  await expect(page.getByText("Trocar John por Mary", { exact: true }).last()).toBeVisible();
  await expect(firstPerson).toHaveAttribute("value", ids.John!);
  await page.mouse.up();
  await expect(firstPerson).toHaveAttribute("value", ids.Mary!);
  await expect(draggedPerson).toHaveCount(0);
  await expect(secondPerson).toHaveAttribute("value", ids.John!);
  await expect(page.getByRole("slider")).toHaveAttribute("aria-valuetext", "R$ 2.500,00");

  await startDrag("Mary");
  await page.mouse.move(800, 100);
  await page.mouse.up();
  await expect(firstPerson).toHaveAttribute("value", ids.Mary!);
  await startDrag("Mary");
  await page.keyboard.press("Escape");
  await expect(draggedPerson).toHaveCount(0);
  await page.mouse.up();
  await expect(firstPerson).toHaveAttribute("value", ids.Mary!);

  const mary = page.getByRole("button", { name: "Arrastar Mary para trocar" });
  await mary.press("Space");
  await mary.press("ArrowRight");
  await expect(page.getByLabel("Editor da alçada de aprovação", { exact: true }).getByRole("status")).toHaveText(
    "Trocar Mary por John",
  );
  await mary.press("Escape");
  await expect(firstPerson).toHaveAttribute("value", ids.Mary!);
  await mary.press("Space");
  await mary.press("ArrowRight");
  await mary.press("Enter");
  await expect(firstPerson).toHaveAttribute("value", ids.John!);
  await expect(secondPerson).toHaveAttribute("value", ids.Mary!);

  await page.getByRole("button", { name: "Adicionar nível" }).click();
  const thirdPerson = page.getByRole("combobox", { name: "Aprovador do nível 3" });
  await startDrag("John", thirdPerson);
  await expect(page.getByLabel("Editor da alçada de aprovação", { exact: true }).getByRole("status")).toHaveText(
    "Trocar John por Alex",
  );
  await page.mouse.up();
  await expect(firstPerson).toHaveAttribute("value", ids.Alex!);
  await expect(secondPerson).toHaveAttribute("value", ids.Mary!);
  await expect(thirdPerson).toHaveAttribute("value", ids.John!);
  await expect(page.getByRole("slider").nth(0)).toHaveAttribute("aria-valuetext", "R$ 2.500,00");
  await expect(page.getByRole("slider").nth(1)).toHaveAttribute("aria-valuetext", "R$ 26.250,00");

  await page.locator("[data-person-identity]").evaluateAll(async (elements) => {
    await Promise.all(
      elements.flatMap((element) => element.getAnimations().map((animation) => animation.finished.catch(() => {}))),
    );
  });
  const touch = await page.context().newCDPSession(page);
  await touch.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await page.setViewportSize({ width: 390, height: 844 });
  const alex = page.getByRole("button", { name: "Arrastar Alex para trocar" });
  // Both touch endpoints must be on screen; scrolling only the first control can
  // leave the second row below the viewport after the responsive layout change.
  await page.locator("[data-person-section]").first().locator("..").scrollIntoViewIfNeeded();
  await expect(secondPerson).toBeInViewport({ ratio: 1 });
  await expect(alex).toBeInViewport({ ratio: 1 });
  const from = (await alex.boundingBox())!;
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2 }],
  });
  await expect(alex).toHaveAttribute("aria-pressed", "true");
  await expect(draggedPerson).toHaveText("Alex");
  // Focus/capture can scroll the workspace. Measure the destination after touchStart,
  // using the real post-resize layout rather than stale desktop/focus coordinates.
  await expect(secondPerson).toBeInViewport({ ratio: 1 });
  const to = (await secondPerson.boundingBox())!;
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: to.x + to.width / 2, y: to.y + to.height / 2 }],
  });
  await expect(page.getByLabel("Editor da alçada de aprovação", { exact: true }).getByRole("status")).toHaveText(
    "Trocar Alex por Mary",
  );
  await expect(draggedPerson).toHaveText("Alex");
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(firstPerson).toHaveAttribute("value", ids.Mary!);
  await expect(secondPerson).toHaveAttribute("value", ids.Alex!);
  await expect(draggedPerson).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(writes).toBe(0);
});

test("removing segments preserves a final person, releases the pool and updates the visual maximum", async ({
  page,
}) => {
  const sliders = page.getByRole("slider", { includeHidden: true });
  const assigned = page.getByRole("combobox", { name: /^Aprovador do nível/ });
  await expect(page.getByLabel("Máximo visual (R$)", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Adicionar nível" }).click();
  await expect(
    page.getByRole("button", { name: "Remover nível de Mary", exact: true }).locator("..").getByRole("combobox"),
  ).toHaveAttribute("value", ids.Mary!);
  await page.getByRole("button", { name: "Remover nível de Mary", exact: true }).click();
  await expect(assigned).toHaveCount(2);
  await expect(assigned.nth(0)).toHaveAttribute("value", ids.John!);
  await expect(assigned.nth(1)).toHaveAttribute("value", ids.Alex!);
  await expect(sliders).toHaveAttribute("aria-valuetext", "R$ 2.500,00");
  await page.getByRole("button", { name: "Adicionar nível" }).click();
  await expect(assigned.nth(2)).toHaveAttribute("value", ids.Mary!);
  await expect(page.getByRole("button", { name: "Remover nível de John", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Remover nível de Alex", exact: true }).click();
  await expect(assigned.nth(0)).toHaveAttribute("value", ids.John!);
  await expect(sliders).toHaveAttribute("aria-valuetext", "R$ 2.500,00");
  await page.getByRole("button", { name: "Remover nível de Mary", exact: true }).click();
  await expect(assigned).toHaveCount(1);
  await expect(assigned).toHaveAttribute("value", ids.John!);
  await expect(sliders).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remover nível de John", exact: true })).toBeDisabled();
  await expect(page.getByTestId("visual-maximum-control")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Adicionar nível" }).click();
  await expect(assigned.nth(1)).toHaveAttribute("value", ids.Mary!);
  await expect(sliders).toHaveCount(1);
  await expect(page.getByLabel("Máximo visual (R$)", { exact: true })).toHaveCount(0);
  expect(writes).toBe(0);
});

test("inline money edits validate neighbor cents and expand the visual maximum only on confirmation", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Adicionar nível" }).click();
  const sliders = page.getByRole("slider", { includeHidden: true });
  await page.getByRole("button", { name: "Editar limite após John", exact: false }).click();
  const first = page.getByRole("textbox", { name: "Limite após John (R$)", exact: true });
  await expect(first).toBeFocused();
  await first.fill("0");
  await first.press("Enter");
  await expect(first).toHaveAttribute("aria-invalid", "true");
  await expect(sliders.nth(0)).toHaveAttribute("aria-valuetext", "R$ 2.500,00");
  await first.fill("26250.00");
  await first.press("Enter");
  await expect(page.getByRole("alert")).toContainText("R$ 26.249,99");
  await first.fill("26249.99");
  await first.press("Enter");
  await expect(sliders.nth(0)).toHaveAttribute("aria-valuetext", "R$ 26.249,99");

  await page.getByRole("button", { name: "Editar limite após Mary", exact: false }).click();
  const last = page.getByRole("textbox", { name: "Limite após Mary (R$)", exact: true });
  await last.fill("26249.99");
  await last.press("Enter");
  await expect(page.getByRole("alert")).toContainText("R$ 26.250,00");
  await last.fill("50000.00");
  await expect(sliders.nth(1)).toHaveAttribute("aria-valuetext", "R$ 26.250,00");
  await last.press("Enter");
  await expect(sliders.nth(1)).toHaveAttribute("aria-valuetext", "R$ 50.000,00");
  await page.getByRole("button", { name: "Editar limite após Mary", exact: false }).click();
  await last.fill("55000.00");
  await last.press("Enter");
  await page.getByRole("button", { name: "Editar limite após Mary", exact: false }).click();
  await last.fill("60500.01");
  await last.press("Enter");
  await expect(sliders.nth(1)).toHaveAttribute("aria-valuetext", "R$ 60.500,01");
  await page.getByRole("button", { name: "Editar limite após Mary", exact: false }).click();
  await last.fill("62500");
  await last.press("Tab");
  await expect(sliders.nth(1)).toHaveAttribute("aria-valuetext", "R$ 60.500,01");
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(sliders.nth(1)).toHaveAttribute("aria-valuetext", "R$ 62.500,00");
  await page.getByRole("button", { name: "Editar limite após Mary", exact: false }).click();
  await last.fill("100000");
  await last.press("Escape");
  await expect(sliders.nth(1)).toHaveAttribute("aria-valuetext", "R$ 62.500,00");
  expect(writes).toBe(0);
});

test("both people travel to their new slots after a swap; reduced motion swaps instantly", async ({ page }) => {
  const bar = page.getByRole("group", { name: "Limites da alçada de aprovação" });
  const before = await bar.boundingBox();
  const john = page.getByRole("button", { name: "Arrastar John para trocar" });
  await john.press("Space");
  await john.press("ArrowRight");
  await john.press("Enter");
  const identities = page.locator("[data-person-identity]");
  const movements = await identities.evaluateAll((elements) =>
    elements.flatMap((element) =>
      element.getAnimations().map((animation) => {
        const first = (animation.effect as KeyframeEffect).getKeyframes()[0];
        return {
          name: (element as HTMLElement).dataset.personIdentity,
          offset: new DOMMatrix(String(first.transform)).m41,
        };
      }),
    ),
  );
  expect(movements.map((movement) => movement.name).sort()).toEqual([ids.John, ids.Mary].sort());
  expect(movements.find((movement) => movement.name === ids.John)!.offset).toBeLessThan(0);
  expect(movements.find((movement) => movement.name === ids.Mary)!.offset).toBeGreaterThan(0);
  await expect
    .poll(() =>
      identities.evaluateAll(
        (elements) =>
          elements
            .flatMap((element) => element.getAnimations())
            .filter((animation) => animation.playState === "running").length,
      ),
    )
    .toBe(0);
  await expect(page.getByRole("combobox", { name: "Aprovador do nível 1" })).toHaveAttribute("value", ids.Mary!);
  await expect(page.getByRole("combobox", { name: "Aprovador do nível 2" })).toHaveAttribute("value", ids.John!);
  expect(await bar.boundingBox()).toEqual(before);
  await expect(page.getByRole("slider")).toHaveAttribute("aria-valuetext", "R$ 2.500,00");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const mary = page.getByRole("button", { name: "Arrastar Mary para trocar" });
  await mary.press("Space");
  await mary.press("ArrowRight");
  await mary.press("Enter");
  await expect(page.getByRole("combobox", { name: "Aprovador do nível 1" })).toHaveAttribute("value", ids.John!);
  expect(
    await identities.evaluateAll((elements) => elements.flatMap((element) => element.getAnimations()).length),
  ).toBe(0);
  expect(writes).toBe(0);
});

test("scale derives from saved thresholds; exact entry grows it without exposing a scale control", async ({ page }) => {
  await expect(page.getByTestId("visual-maximum-control")).toHaveCount(0);
  expect(await ratio(page)).toBeCloseTo(0.05, 3);
  const amount = page.getByRole("button", { name: "Editar limite após John", exact: false });
  await amount.click();
  await expect(page.getByRole("dialog", { name: "Editar limite", exact: true })).toBeVisible();
  const input = page.getByRole("textbox", { name: "Limite após John (R$)", exact: true });
  await input.fill("90071992547409.91");
  await input.press("Enter");
  expect(await ratio(page)).toBeCloseTo(0.8, 3);
  await expect(page.getByRole("slider")).toHaveAttribute("aria-valuetext", "R$ 90.071.992.547.409,91");
  expect(writes).toBe(0);
  await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
  await confirmSave(page);
  await expect(page.getByTestId("coa-view")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  expect(await ratio(page)).toBeCloseTo(0.8, 3);
  expect(writes).toBe(1);
});

test("holding the right edge grows continuously without backward jumps and stops on release", async ({ page }) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await hold(page, 0.9);
  const slider = page.getByRole("slider");
  let previous = await thresholdCents(slider);
  let previousRatio = await ratio(page);
  for (let sample = 0; sample < 8; sample++) {
    await page.clock.runFor(200);
    const current = await thresholdCents(slider);
    const currentRatio = await ratio(page);
    expect(current).toBeGreaterThan(previous);
    expect(currentRatio).toBeGreaterThanOrEqual(previousRatio - 0.001);
    expect(currentRatio).toBeCloseTo(0.9, 2);
    previous = current;
    previousRatio = currentRatio;
  }
  const bar = (await track(page).boundingBox())!;
  await page.mouse.move(bar.x + bar.width, bar.y + bar.height / 2);
  await page.clock.runFor(800);
  expect(await thresholdCents(slider)).toBeGreaterThan(previous);
  expect(await ratio(page)).toBeCloseTo(0.97, 2);
  await page.mouse.up();
  const released = await slider.getAttribute("aria-valuetext");
  await page.clock.runFor(1000);
  await expect(slider).toHaveAttribute("aria-valuetext", released!);
  expect(writes).toBe(0);
});

test("edge holding stops at the next cent and never rescales or reorders a blocked boundary", async ({ page }) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole("button", { name: "Adicionar nível" }).click();
  await hold(page, 0.99);
  const sliders = page.getByRole("slider", { includeHidden: true });
  await expect(sliders.nth(0)).toHaveAttribute("aria-valuetext", "R$ 26.249,99");
  const fixedRatio = await ratio(page, 1);
  await page.clock.runFor(3000);
  await expect(sliders.nth(0)).toHaveAttribute("aria-valuetext", "R$ 26.249,99");
  expect(await ratio(page, 1)).toBeCloseTo(fixedRatio, 5);
  await page.mouse.up();
  await expect(page.getByLabel("Aprovador do nível 1", { exact: true })).toHaveAttribute("value", ids.John!);
  // A previous finite boundary can prevent reaching the 50k zoom floor.
  for (const [name, value] of [
    ["Mary", "100000"],
    ["John", "60000"],
  ]) {
    await page.getByRole("button", { name: `Editar limite após ${name}`, exact: false }).press("Enter");
    const input = page.getByRole("textbox", { name: `Limite após ${name} (R$)`, exact: true });
    await input.fill(value);
    await input.press("Enter");
  }
  await hold(page, 0.25, 1);
  await page.clock.runFor(10000);
  await expect(sliders.nth(1)).toHaveAttribute("aria-valuetext", "R$ 60.000,01");
  expect(await ratio(page, 1)).toBeCloseTo(0.5, 3);
  await page.clock.runFor(1000);
  await expect(sliders.nth(1)).toHaveAttribute("aria-valuetext", "R$ 60.000,01");
  await page.mouse.up();
  expect(writes).toBe(0);
});

test("precise entry rejects fractional cents, confirms valid blur and cancels with Escape", async ({ page }) => {
  const control = page.getByRole("button", { name: "Editar limite após John", exact: false });
  await control.press("Space");
  const input = page.getByRole("textbox", { name: "Limite após John (R$)", exact: true });
  await input.fill("0.001");
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("slider", { includeHidden: true })).toHaveAttribute("aria-valuetext", "R$ 2.500,00");
  await input.fill("25000.01");
  await input.press("Tab");
  await expect(page.getByRole("slider", { includeHidden: true })).toHaveAttribute("aria-valuetext", "R$ 2.500,00");
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(control).toHaveText("R$ 25.000,01");
  expect(await ratio(page)).toBeCloseTo(0.5, 3);
  await control.press("Space");
  await input.fill("50000");
  await input.press("Escape");
  await expect(control).toBeFocused();
  await expect(control).toHaveText("R$ 25.000,01");
  expect(writes).toBe(0);
});

test("domain maximum stops held dragging and keyboard growth without exceeding exact precision", async ({ page }) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole("button", { name: "Editar limite após John", exact: false }).press("Enter");
  const input = page.getByRole("textbox", { name: "Limite após John (R$)", exact: true });
  await input.fill("9999999999999999.99");
  await input.press("Enter");
  const slider = page.getByRole("slider");
  await slider.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuetext", "R$ 9.999.999.999.999.999,99");
  const before = await ratio(page);
  await hold(page, 1);
  await page.clock.runFor(2000);
  await page.mouse.up();
  expect(await ratio(page)).toBeCloseTo(before, 5);
  await expect(slider).toHaveAttribute("aria-valuetext", "R$ 9.999.999.999.999.999,99");
  await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
  await confirmSave(page);
  await expect(page.getByTestId("coa-view")).toContainText("Até R$ 9.999.999.999.999.999,99");
  expect(writes).toBe(1);
});

test("resizing and pointer cancellation preserve money and stop the edge timer", async ({ page }) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await hold(page, 0.9);
  await page.clock.runFor(300);
  const slider = page.getByRole("slider");
  const before = await slider.getAttribute("aria-valuetext");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.runFor(300);
  await expect(slider).toHaveAttribute("aria-valuetext", before!);
  await slider.dispatchEvent("pointercancel", { pointerId: 1 });
  await page.mouse.up();
  await page.clock.runFor(1000);
  await expect(slider).toHaveAttribute("aria-valuetext", before!);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(writes).toBe(0);
});

test("mobile touch edge holding grows the threshold and remains local until save", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  const slider = page.getByRole("slider");
  await slider.scrollIntoViewIfNeeded();
  const tick = (await slider.boundingBox())!,
    bar = (await track(page).boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: tick.x + tick.width / 2, y: tick.y + tick.height / 2 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: bar.x + bar.width * 0.94, y: bar.y + bar.height / 2 }],
  });
  const moved = await thresholdCents(slider);
  await page.clock.runFor(800);
  expect(await thresholdCents(slider)).toBeGreaterThan(moved);
  expect(await ratio(page)).toBeCloseTo(0.94, 2);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const released = await slider.getAttribute("aria-valuetext");
  await page.clock.runFor(500);
  await expect(slider).toHaveAttribute("aria-valuetext", released!);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(writes).toBe(0);
});

test("last tick pins at halfway while continuous zoom-out reaches the 50k floor", async ({ page }) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.getByRole("button", { name: "Editar limite após John", exact: false }).press("Enter");
  const input = page.getByRole("textbox", { name: "Limite após John (R$)", exact: true });
  await input.fill("100000");
  await input.press("Enter");
  const slider = page.getByRole("slider");
  await hold(page, 0.45);
  await expect(slider).toHaveAttribute("aria-valuetext", "R$ 62.500,00");
  expect(await ratio(page)).toBeCloseTo(0.5, 3);
  await page.clock.runFor(1000);
  expect(await thresholdCents(slider)).toBeLessThan(6250000n);
  expect(await ratio(page)).toBeCloseTo(0.5, 3);
  const bar = (await track(page).boundingBox())!;
  await page.mouse.move(bar.x + bar.width * 0.2, bar.y + bar.height / 2);
  await page.clock.runFor(10000);
  await expect(slider).toHaveAttribute("aria-valuetext", "R$ 25.000,00");
  expect(await ratio(page)).toBeCloseTo(0.5, 3);
  await page.clock.runFor(2000);
  await expect(slider).toHaveAttribute("aria-valuetext", "R$ 25.000,00");
  expect(await ratio(page)).toBeCloseTo(0.5, 3);
  // Reversing out of the sticky midpoint rejoins the pointer without a leap.
  await page.mouse.move(bar.x + bar.width * 0.6, bar.y + bar.height / 2);
  expect(await ratio(page)).toBeCloseTo(0.6, 3);
  await page.mouse.up();
  // A fresh gesture at the minimum scale can still configure smaller amounts.
  await hold(page, 0.4);
  await page.mouse.up();
  expect(await ratio(page)).toBeCloseTo(0.4, 3);
  expect(writes).toBe(0);
});

test("read-only CoA view mirrors the mock ladder with circular markers and Até amounts", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Adicionar nível" }).click();
  await page.getByRole("button", { name: "Adicionar nível" }).click();
  for (const [person, value] of [
    ["John", "3852.50"],
    ["Mary", "7485.02"],
    ["Alex", "10934.21"],
  ]) {
    await page.getByRole("button", { name: `Editar limite após ${person}`, exact: false }).click();
    const input = page.getByRole("textbox", { name: `Limite após ${person} (R$)`, exact: true });
    await input.fill(value);
    await input.press("Enter");
  }
  const john = page.getByRole("button", { name: "Arrastar John para trocar" });
  await john.press("Space");
  await john.press("ArrowRight");
  await john.press("ArrowRight");
  await john.press("Enter");
  await john.press("Space");
  await john.press("ArrowRight");
  await john.press("Enter");
  await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
  await confirmSave(page);
  const view = page.getByTestId("coa-view");
  await expect(view.getByRole("heading", { name: "Alçada de aprovação" })).toBeVisible();
  await expect(view.getByText("Versão: 2", { exact: true })).toBeVisible();
  for (const name of ["Alex", "Mary", "Emma", "John"])
    await expect(view.getByText(name, { exact: true })).toBeVisible();
  for (const amount of ["Até R$ 3.852,50", "Até R$ 7.485,02", "Até R$ 10.934,21"])
    await expect(view.getByText(amount, { exact: true })).toBeVisible();
  const figureButtons = view.locator("figure").getByRole("button");
  await expect(figureButtons).toHaveCount(1);
  await expect(figureButtons).toHaveAccessibleName("Testar um valor");
  await expect(figureButtons).toHaveAttribute("aria-expanded", "false");
  await expect(view.getByRole("button", { name: "Editar", exact: true })).toBeVisible();
  await expect(view.getByRole("button", { name: "Editar", exact: true })).toBeFocused();
  await expect(view.getByRole("slider")).toHaveCount(0);
  await expect(view.getByRole("combobox")).toHaveCount(0);
  await expect(view.getByRole("list", { name: "Faixas e cadeias efetivas" })).toContainText(
    "Alex → Mary → Emma → John",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await view.scrollIntoViewIfNeeded();
  for (const amount of ["Até R$ 3.852,50", "Até R$ 7.485,02", "Até R$ 10.934,21"])
    await expect(view.getByText(amount, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(view.getByText("Até R$ 3.852,50", { exact: true })).toBeVisible();
  await expect(view.getByText("Versão: 2", { exact: true })).toBeVisible();
  await view.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Publicar alçada", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancelar", exact: true })).toBeFocused();
  await expect(page.getByRole("slider").nth(2)).toHaveAttribute("aria-valuetext", "R$ 10.934,21");
  expect(writes).toBe(1);
});

test("publication review shows the proposed version and never writes on open or cancel", async ({ page }) => {
  await page.getByRole("slider").press("ArrowRight");
  const value = await page.getByRole("slider").getAttribute("aria-valuetext");
  await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Publicar alçada", exact: true });
  await expect(review).toContainText("A versão 2 substituirá a versão 1");
  await expect(review).toContainText("Pedidos existentes mantêm a versão e os aprovadores originais");
  await expect(review).toContainText("John → Mary");
  await expect(review.getByRole("button", { name: "Cancelar", exact: true })).toBeFocused();
  expect(writes).toBe(0);
  await page.keyboard.press("Escape");
  await expect(review).not.toBeVisible();
  await expect(page.getByRole("slider")).toHaveAttribute("aria-valuetext", value!);
  await expect(page.getByRole("button", { name: "Publicar alçada", exact: true })).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
  await expect(review.getByRole("button", { name: "Fechar", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(writes).toBe(0);
  await confirmSave(page);
  await expect(page.getByTestId("coa-view")).toContainText("Versão: 2");
  expect(writes).toBe(1);
});
