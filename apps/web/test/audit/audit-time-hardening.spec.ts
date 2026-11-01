import { test, expect } from "@playwright/test";

for (const timezoneId of ["UTC", "America/Sao_Paulo", "Asia/Tokyo"])
  test.describe(timezoneId, () => {
    test.use({ timezoneId });
    test("external exclusive upper timestamps describe the last included calendar day", async ({ page }) => {
      await page.goto("/login");
      const result = await page.evaluate(async () => {
        const path = "/src/features/audit/auditDateRange.ts",
          dates = await import(path);
        return dates.auditDateRange(new URLSearchParams({ from: "2026-10-29T03:00:00Z", to: "2026-10-30T12:30:00Z" }));
      });
      expect(result.to).toBe("2026-10-30");
    });
  });

test.describe("midnight DST gap", () => {
  test.use({ timezoneId: "America/Sao_Paulo" });
  test("the exclusive next midnight is built independently when the selected day starts at 01:00", async ({ page }) => {
    await page.goto("/login");
    const result = await page.evaluate(async () => {
      const path = "/src/features/audit/auditDateRange.ts",
        dates = await import(path);
      const bounds = dates.auditDateBounds({ from: "2018-11-04", to: "2018-11-04" });
      return { bounds, restored: dates.auditDateRange(new URLSearchParams(bounds)) };
    });
    expect(result.bounds).toEqual({ from: "2018-11-04T03:00:00.000Z", to: "2018-11-05T02:00:00.000Z" });
    expect(result.restored).toEqual({ from: "2018-11-04", to: "2018-11-04" });
  });
});

test.describe("fall-back day", () => {
  test.use({ timezoneId: "America/New_York" });
  test("a repeated hour remains inside the selected calendar day", async ({ page }) => {
    await page.goto("/login");
    const result = await page.evaluate(async () => {
      const path = "/src/features/audit/auditDateRange.ts",
        dates = await import(path);
      return dates.auditDateBounds({ from: "2026-11-01", to: "2026-11-01" });
    });
    expect(result).toEqual({ from: "2026-11-01T04:00:00.000Z", to: "2026-11-02T05:00:00.000Z" });
  });
});
