import { test, expect, type Page } from "@playwright/test";
import { auditQuerySchema } from "@dokimos/shared";
import { normalizeOrdersQuery } from "../../src/features/purchase-orders/list/ordersQuery";
import { normalizeAuditQuery } from "../../src/features/audit/auditQuery";

const projectId = "11111111-1111-4111-8111-111111111111";
test("orders admit supported values without mutating browser context or admitting duplicates", () => {
  const raw = new URLSearchParams({
    projectId,
    status: "APPROVED",
    page: "2",
    pageSize: "100",
    actionableByMe: "false",
    mode: "preview",
    utm_source: "review",
  });
  const before = raw.toString();
  raw.append("status", "REJECTED");
  expect(Object.fromEntries(normalizeOrdersQuery(raw))).toEqual({
    projectId,
    status: "APPROVED",
    page: "2",
    pageSize: "100",
    actionableByMe: "false",
  });
  expect(raw.toString()).toBe(before + "&status=REJECTED");
  for (const page of ["0", "-1", "1.5", "01", "2147483648", "Infinity", ""]) {
    expect(
      normalizeOrdersQuery(
        new URLSearchParams({
          page,
          pageSize: "101",
          status: "bad",
          actionableByMe: "yes",
          projectId: "bad",
          event: "drawer",
        }),
      ).size,
    ).toBe(0);
  }
});

test("audit keeps strict valid timestamps and clears malformed or inverted bounds", () => {
  const raw = new URLSearchParams({
    projectId,
    eventType: "SUPPLIER_RENAMED",
    from: "2026-10-29T03:00:00.000Z",
    to: "2026-10-30T12:30:00-03:00",
    page: "2",
    pageSize: "10",
    event: "drawer",
    utm_source: "review",
  });
  const query = normalizeAuditQuery(raw);
  expect(query.has("event")).toBe(false);
  expect(query.has("utm_source")).toBe(false);
  expect(query.get("to")).toBe("2026-10-30T12:30:00-03:00");
  expect(auditQuerySchema.safeParse(Object.fromEntries(query)).success).toBe(true);
  expect(raw.get("event")).toBe("drawer");
  expect(
    normalizeAuditQuery(
      new URLSearchParams({
        from: "2026-10-31T00:00:00Z",
        to: "2026-10-30T00:00:00Z",
        eventType: "bad",
        page: "1e2",
        pageSize: "999",
        projectId: "bad",
      }),
    ).size,
  ).toBe(0);
  expect(normalizeAuditQuery(new URLSearchParams({ from: "2026-10-30T12:00:00.123456Z", to: "not-a-date" })).size).toBe(
    0,
  );
});

async function setup(page: Page) {
  const calls: URL[] = [];
  await page.addInitScript(() => sessionStorage.setItem("obraflow.accessToken", "query-boundary-fixture"));
  await page.route("https://i.pravatar.cc/**", (route) => route.abort());
  await page.route("**/api/v1/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/auth/me"))
      return route.fulfill({
        json: { id: projectId, username: "admin", displayName: "Admin", role: "ADMIN", isActive: true },
      });
    if (url.pathname.endsWith("/projects"))
      return route.fulfill({
        json: {
          data: [
            {
              id: projectId,
              name: "Obra",
              isActive: true,
              coaVersion: 1,
              membership: { count: 1, activeCount: 1, isMember: true },
            },
          ],
        },
      });
    if (url.pathname.endsWith("/purchase-orders") || url.pathname.endsWith("/audit/events")) {
      calls.push(url);
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
  return calls;
}

test("malformed order URLs retain UI context and load a valid default list", async ({ page }) => {
  const calls = await setup(page);
  await page.goto(
    "/purchase-orders?status=invalid&page=0&pageSize=1000&projectId=invalid&actionableByMe=maybe&mode=preview&utm_source=review",
  );
  await expect(page.getByRole("heading", { name: "Nenhum pedido encontrado", exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page).toHaveURL(/utm_source=review/);
  await expect(page).toHaveURL(/mode=preview/);
  await expect(page.getByRole("button", { name: /^Todos/ })).toHaveAttribute("aria-pressed", "true");
  expect(calls.some((url) => url.searchParams.size === 0)).toBe(true);
  for (const url of calls)
    expect(
      [...url.searchParams.keys()].every((key) => ["page", "pageSize", "status", "actionableByMe"].includes(key)),
    ).toBe(true);
});

test("valid order bookmarks preserve filters and browser context through view changes and Back", async ({ page }) => {
  const calls = await setup(page);
  await page.goto(`/purchase-orders?projectId=${projectId}&status=PENDING&page=2&pageSize=10&utm_source=review`);
  await expect(page.getByRole("button", { name: /^Pendentes/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Sua decisão/ }).click();
  await expect(page).toHaveURL(/actionableByMe=true/);
  await expect(page).not.toHaveURL(/page=2|status=/);
  await expect(page).toHaveURL(/utm_source=review/);
  await page.goBack();
  await expect(page.getByRole("button", { name: /^Pendentes/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/page=2/);
  expect(calls.every((url) => !url.searchParams.has("utm_source"))).toBe(true);
});

test("audit drops unknown/malformed API inputs while preserving UI URL parameters", async ({ page }) => {
  const calls = await setup(page);
  await page.goto(
    "/admin/audit?eventType=invalid&projectId=bad&page=-1&pageSize=0&from=invalid&to=invalid&utm_source=review",
  );
  await expect(page.getByRole("heading", { name: "Nenhum evento encontrado", exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByLabel("Tipo de evento", { exact: true })).toContainText("Todos os tipos");
  expect(calls.at(-1)!.searchParams.size).toBe(0);
  await page.getByRole("button", { name: "Limpar filtros", exact: true }).click();
  await expect(page).toHaveURL(/utm_source=review/);
});

test.describe("external audit bookmark", () => {
  test.use({ timezoneId: "America/Sao_Paulo" });
  test("ISO offsets reach the API unchanged while the date picker shows included local days", async ({ page }) => {
    const calls = await setup(page);
    const from = "2026-10-29T15:20:00-03:00",
      to = "2026-10-30T15:20:00-03:00";
    await page.goto(`/admin/audit?${new URLSearchParams({ from, to, eventType: "ORDER_CREATED", dialog: "help" })}`);
    await expect(page.getByRole("heading", { name: "Nenhum evento encontrado", exact: true })).toBeVisible();
    expect(calls.at(-1)!.searchParams.get("from")).toBe(from);
    expect(calls.at(-1)!.searchParams.get("to")).toBe(to);
    expect(calls.every((url) => !url.searchParams.has("dialog"))).toBe(true);
    await page.getByRole("button", { name: /^Período / }).click();
    await expect(page.getByLabel("De", { exact: true })).toHaveValue("29/10/2026");
    await expect(page.getByLabel("Até", { exact: true })).toHaveValue("30/10/2026");
    await expect(page).toHaveURL(/dialog=help/);
  });
});
