import { test, expect } from "@playwright/test";
import { auditQuerySchema } from "@dokimos/shared";
import { normalizeAuditQuery } from "../../src/features/audit/auditQuery";
import { normalizeOrdersQuery } from "../../src/features/purchase-orders/list/ordersQuery";

// Boundary cases that complement query-boundaries.spec.ts: what is kept, one value at a time.

const projectId = "11111111-1111-4111-8111-111111111111";

test.describe("orders list query", () => {
  test("an empty URL produces an empty API query", () => {
    expect(normalizeOrdersQuery(new URLSearchParams()).size).toBe(0);
  });

  test("every order status and both view flags are accepted", () => {
    for (const status of ["PENDING", "APPROVED", "REJECTED"]) {
      expect(normalizeOrdersQuery(new URLSearchParams({ status })).get("status")).toBe(status);
    }
    for (const flag of ["true", "false"]) {
      expect(normalizeOrdersQuery(new URLSearchParams({ actionableByMe: flag })).get("actionableByMe")).toBe(flag);
    }
  });

  test("page and page size stop at the API limits", () => {
    const accepted = (name: string, value: string) =>
      normalizeOrdersQuery(new URLSearchParams({ [name]: value })).has(name);
    expect(accepted("page", "1")).toBe(true);
    expect(accepted("page", "2147483647")).toBe(true);
    expect(accepted("page", "2147483648")).toBe(false);
    expect(accepted("pageSize", "100")).toBe(true);
    expect(accepted("pageSize", "101")).toBe(false);
  });

  test("browser-only context never reaches the API", () => {
    const query = normalizeOrdersQuery(new URLSearchParams({ projectId, mode: "create", event: "x", returnTo: "/a" }));
    expect([...query.keys()]).toEqual(["projectId"]);
  });
});

test.describe("audit list query", () => {
  const from = "2026-10-29T03:00:00.000Z";
  const to = "2026-10-30T03:00:00.000Z";

  test("a valid event type and project are kept, an unknown type is dropped", () => {
    expect(normalizeAuditQuery(new URLSearchParams({ eventType: "COA_REVISED", projectId })).get("eventType")).toBe(
      "COA_REVISED",
    );
    expect(normalizeAuditQuery(new URLSearchParams({ eventType: "SOMETHING_ELSE" })).has("eventType")).toBe(false);
    expect(normalizeAuditQuery(new URLSearchParams({ projectId: "not-a-uuid" })).has("projectId")).toBe(false);
  });

  test("a single bound is kept, an empty or inverted range is cleared", () => {
    expect(normalizeAuditQuery(new URLSearchParams({ from })).get("from")).toBe(from);
    expect(normalizeAuditQuery(new URLSearchParams({ to })).get("to")).toBe(to);
    expect(normalizeAuditQuery(new URLSearchParams({ from: to, to: from })).size).toBe(0);
    expect(normalizeAuditQuery(new URLSearchParams({ from, to: from })).size).toBe(0);
  });

  test("unreadable timestamps are dropped", () => {
    expect(normalizeAuditQuery(new URLSearchParams({ from: "yesterday", to: "2026-13-45" })).size).toBe(0);
  });

  test("whatever is kept satisfies the API contract", () => {
    const query = normalizeAuditQuery(
      new URLSearchParams({
        eventType: "STEP_APPROVED",
        projectId,
        from,
        to,
        page: "3",
        pageSize: "50",
        event: "drawer",
      }),
    );
    expect(auditQuerySchema.safeParse(Object.fromEntries(query)).success).toBe(true);
    expect(query.has("event")).toBe(false);
  });
});
