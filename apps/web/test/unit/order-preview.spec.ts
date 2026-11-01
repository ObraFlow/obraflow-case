import { test, expect } from "@playwright/test";
import { orderPreview } from "../../src/features/purchase-orders/new/orderPreview";

const item = (quantity: string, unitPrice: string) => ({ description: "Material", quantity, unit: "un", unitPrice });

test("each line is rounded HALF_UP to cents before the lines are summed", () => {
  // 0.125 × 12.44 = 1.555 rounds to 1.56 per line; the total is the sum of the rounded lines.
  const preview = orderPreview([item("0.125", "12.44"), item("0.125", "12.44"), item("1", "21.00")]);
  expect(preview.lines).toEqual(["1.56", "1.56", "21.00"]);
  expect(preview.total).toBe("24.12");
  expect(preview.overflow).toBe(false);
});

test("per-line rounding differs from rounding the exact sum", () => {
  // Exact sum is 0.01 (0.005 + 0.005); per-line rounding gives 0.01 + 0.01.
  const preview = orderPreview([item("0.5", "0.01"), item("0.5", "0.01")]);
  expect(preview.lines).toEqual(["0.01", "0.01"]);
  expect(preview.total).toBe("0.02");
});

test("decimal strings never drift like binary floating point", () => {
  const preview = orderPreview([item("3", "0.10"), item("1", "0.20")]);
  expect(preview.lines).toEqual(["0.30", "0.20"]);
  expect(preview.total).toBe("0.50");
});

test("an empty order totals zero", () => {
  expect(orderPreview([])).toEqual({ lines: [], total: "0.00", overflow: false });
});

test("a line that cannot be read stays null and blocks the total", () => {
  for (const bad of [
    item("abc", "1.00"),
    item("1.0001", "1.00"),
    item("0", "1.00"),
    item("1", "1.234"),
    item("1", ""),
  ]) {
    const preview = orderPreview([item("2", "5.00"), bad]);
    expect(preview.lines).toEqual(["10.00", null]);
    expect(preview.total).toBeNull();
  }
});

test("a quantity written with a comma is not read until the form normalises it", () => {
  expect(orderPreview([item("1,5", "10.00")])).toMatchObject({ lines: [null], total: null });
});

test("a total above the stored maximum is flagged instead of overflowing", () => {
  const preview = orderPreview([item("999999999", "999999999999.99")]);
  expect(preview.overflow).toBe(true);
  expect(preview.total).not.toBeNull();
});
