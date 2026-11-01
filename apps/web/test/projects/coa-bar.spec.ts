import { thresholdCents } from "../support/threshold-value";
import { confirmSave } from "../support/save-confirmation";
import { selectOption } from "../support/select";
import { test, expect, type Page, type APIRequestContext, type Locator } from "@playwright/test";
import {
  createFixture,
  loadDatabase,
  startServer,
  stopApi,
  type Database,
  type Fixture,
  type Server,
} from "../support/api";

const API = "http://127.0.0.1:4100/api/v1";
let server: Server;
let database: Database;
let f: Fixture;
let headers: { authorization: string };
test.beforeAll(async () => {
  database = await loadDatabase();
  server = await startServer();
});
test.beforeEach(async () => {
  f = await createFixture();
  headers = { authorization: `Bearer ${server.jwt.sign({ sub: f.admin.id })}` };
});
test.afterEach(async () => {
  await f?.cleanup();
});
test.afterAll(async () => {
  await stopApi(server, database);
});
const tick = (page: Page, index: number) => page.getByRole("slider").nth(index - 1);
const value = (page: Page, index: number) =>
  page.getByRole("button", { name: `Editar limite após ${f.users[index - 1].displayName}`, exact: false });
async function money(page: Page, index: number, amount: string) {
  await value(page, index).click();
  const input = page.getByRole("textbox", { name: `Limite após ${f.users[index - 1].displayName} (R$)`, exact: true });
  await input.fill(amount);
  await input.press("Enter");
}
async function enter(page: Page, count = 2) {
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await page.addInitScript(
    (token) => sessionStorage.setItem("obraflow.accessToken", token),
    server.jwt.sign({ sub: f.admin.id }),
  );
  await page.goto(`/admin/projects/${f.project.id}`);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  for (let i = 0; i < count; i++) {
    if (i) await page.getByRole("button", { name: "Adicionar nível", exact: true }).click();
    await selectOption(page.getByLabel(`Aprovador do nível ${i + 1}`, { exact: true }), f.users[i].id);
  }
  if (count > 1) {
    await money(page, 1, "10000.00");
  }
  if (count > 2) await money(page, 2, "15000.00");
}
async function thirdMember(request: APIRequestContext) {
  expect(
    (
      await request.post(`${API}/projects/${f.project.id}/members`, { headers, data: { userId: f.users[2].id } })
    ).status(),
  ).toBe(201);
}
async function drag(page: Page, slider: Locator, fraction: number) {
  await slider.scrollIntoViewIfNeeded();
  const handle = (await slider.boundingBox())!,
    track = (await slider.locator("..").boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  try {
    await page.mouse.move(track.x + track.width * fraction, handle.y + handle.height / 2);
  } finally {
    await page.mouse.up();
  }
}
async function publish(page: Page, version = 1) {
  await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
  await confirmSave(page);
  await expect(page.getByTestId("coa-view").getByText(`Versão: ${version}`, { exact: true })).toBeVisible();
}
async function saved(request: APIRequestContext) {
  return await (await request.get(`${API}/projects/${f.project.id}/coa`, { headers })).json();
}

test("one approver has one unlimited segment and no movable monetary boundary", async ({ page, request }) => {
  await enter(page, 1);
  await expect(page.getByRole("slider")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remover nível de Approver 0", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Adicionar nível", exact: true }).click();
  await expect(page.getByRole("slider")).toHaveCount(1);
  await page.getByRole("button", { name: "Remover nível de Approver 1", exact: true }).click();
  await expect(page.getByRole("slider")).toHaveCount(0);
  expect((await saved(request)).coaVersion).toBe(0);
  await publish(page);
  expect((await saved(request)).bands).toEqual([{ upperLimit: null, approverId: f.users[0].id }]);
  await expect(page.getByTestId("coa-view").getByRole("slider")).toHaveCount(0);
  await expect(page.getByTestId("coa-view").locator("[data-coa-boundary]")).toHaveCount(0);
});

test("three levels clamp pointer and keyboard movement to exact neighbors without reordering", async ({
  page,
  request,
}) => {
  await thirdMember(request);
  await enter(page, 3);
  await expect(page.getByRole("slider")).toHaveCount(2);
  await drag(page, tick(page, 1), 0.95);
  await expect(value(page, 1)).toHaveText("R$ 14.999,99");
  await tick(page, 1).press("ArrowRight");
  await expect(value(page, 1)).toHaveText("R$ 14.999,99");
  await tick(page, 1).press("Home");
  await tick(page, 1).press("ArrowLeft");
  await expect(value(page, 1)).toHaveText("R$ 0,01");
  await drag(page, tick(page, 2), 0);
  await expect(value(page, 2)).toHaveText("R$ 0,02");
  await tick(page, 2).press("ArrowLeft");
  await expect(value(page, 2)).toHaveText("R$ 0,02");
  await tick(page, 2).press("End");
  const end = await thresholdCents(tick(page, 2));
  await tick(page, 2).press("ArrowRight");
  await expect.poll(() => thresholdCents(tick(page, 2))).toBe(end + 100n);
  for (let i = 0; i < 3; i++)
    await expect(page.getByLabel(`Aprovador do nível ${i + 1}`, { exact: true })).toHaveAttribute(
      "value",
      f.users[i].id,
    );
  await publish(page);
  expect((await saved(request)).bands.map((band: { upperLimit: string | null }) => band.upperLimit)).toEqual([
    "0.01",
    `${(end + 100n) / 100n}.${String((end + 100n) % 100n).padStart(2, "0")}`,
    null,
  ]);
  await expect(page.getByTestId("coa-view").locator("[data-coa-boundary]")).toHaveCount(2);
});

test("precise values synchronize with ticks and publish beyond the default visual axis", async ({ page, request }) => {
  await thirdMember(request);
  await enter(page, 3);
  await money(page, 1, "12345.67");
  await expect(tick(page, 1)).toHaveAttribute("aria-valuetext", "R$ 12.345,67");
  await money(page, 2, "12345.68");
  await tick(page, 1).press("ArrowRight");
  await expect(value(page, 1)).toHaveText("R$ 12.345,67");
  await value(page, 1).click();
  const input = page.getByRole("textbox", { name: "Limite após Approver 0 (R$)", exact: true });
  await input.fill("12345.68");
  await input.press("Enter");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: "Publicar alçada", exact: true, includeHidden: true })).toBeDisabled();
  await input.press("Escape");
  await money(page, 2, "135107988821114.86");
  await money(page, 1, "90071992547409.91");
  await expect(tick(page, 1)).toHaveAttribute("aria-valuetext", "R$ 90.071.992.547.409,91");
  expect((await saved(request)).coaVersion).toBe(0);
  await publish(page);
  expect((await saved(request)).bands.map((band: { upperLimit: string | null }) => band.upperLimit)).toEqual([
    "90071992547409.91",
    "135107988821114.86",
    null,
  ]);
});

test("touch dragging and keyboard controls remain usable on mobile in light and dark themes", async ({ browser }) => {
  await database.query("UPDATE users SET display_name=$1 WHERE id=$2", [
    "Responsável pela Engenharia e pelas Compras da Obra",
    f.users[1].id,
  ]);
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.emulateMedia({ colorScheme: "dark" });
    await enter(page);
    await expect(page.locator("html")).toHaveClass(/dark/);
    await tick(page, 1).scrollIntoViewIfNeeded();
    const box = (await tick(page, 1).boundingBox())!;
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 30, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(value(page, 1)).not.toHaveText("R$ 10.000,00");
    await tick(page, 1).focus();
    await page.keyboard.press("Home");
    await expect(value(page, 1)).toHaveText("R$ 0,01");
    await page.getByLabel("Aprovador do nível 2", { exact: true }).focus();
    await expect(page.getByLabel("Aprovador do nível 2", { exact: true })).toBeFocused();
    const range = page
      .getByRole("group", { name: "Limites da alçada de aprovação", exact: true })
      .locator(":scope > div")
      .nth(1);
    const darkAccent = await range.evaluate((element) => getComputedStyle(element).backgroundColor);
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    expect(await range.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(darkAccent);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 700 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  } finally {
    await context.close();
  }
});

test("a bar-edited draft survives a real version conflict until explicit reconciliation and publication", async ({
  page,
  request,
}) => {
  await enter(page);
  await publish(page);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await tick(page, 1).press("ArrowRight");
  await expect(value(page, 1)).toHaveText("R$ 10.001,00");
  expect(
    (
      await request.put(`${API}/projects/${f.project.id}/coa`, {
        headers,
        data: {
          expectedCoaVersion: 1,
          bands: [
            { upperLimit: "15000.00", approverId: f.users[0].id },
            { upperLimit: null, approverId: f.users[1].id },
          ],
        },
      })
    ).status(),
  ).toBe(200);
  let writes = 0;
  page.on("request", (req) => {
    if (req.method() === "PUT") writes++;
  });
  await page.getByRole("button", { name: "Publicar alçada", exact: true }).click();
  await confirmSave(page);
  await expect(page.getByRole("region", { name: "Reconciliação da alçada" })).toContainText("Versão publicada 2");
  await expect(value(page, 1)).toHaveText("R$ 10.001,00");
  expect(writes).toBe(1);
  await page.getByRole("button", { name: "Manter rascunho", exact: true }).click();
  expect(writes).toBe(1);
  await publish(page, 3);
  expect(writes).toBe(2);
});
