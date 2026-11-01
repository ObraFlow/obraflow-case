import { test, expect } from "@playwright/test";
import { approvalLevel, cents, decimal } from "../../src/features/coa/thresholds";
import { levelColor } from "../../src/features/coa/levelColor";
import { orderViews, viewCounts } from "../../src/features/purchase-orders/list/orderViews";

test.describe("cents and decimal", () => {
  test("cents reads decimal strings exactly, without floating point", () => {
    expect(cents("10000.00")).toBe(1000000n);
    expect(cents("10000")).toBe(1000000n);
    expect(cents("0.5")).toBe(50n);
    expect(cents("0.05")).toBe(5n);
    expect(cents("0")).toBe(0n);
    expect(cents("9999999999999999.99")).toBe(999999999999999999n);
  });

  test("cents rejects anything the API amount contract would reject", () => {
    for (const value of ["", "abc", "-1", "1,5", "1.234", "10000000000000000", " 1", "1 "]) {
      expect(cents(value), JSON.stringify(value)).toBeNull();
    }
  });

  test("decimal is the exact inverse of cents", () => {
    expect(decimal(0n)).toBe("0.00");
    expect(decimal(5n)).toBe("0.05");
    expect(decimal(1000000n)).toBe("10000.00");
    for (const value of ["0.00", "0.01", "9.99", "10000.00", "50000.01", "9999999999999999.99"]) {
      expect(decimal(cents(value)!)).toBe(value);
    }
  });
});

test.describe("approvalLevel", () => {
  const ladder = [cents("10000.00")!, cents("50000.00")!];

  test("limits are inclusive: a total at the limit stays on that level", () => {
    expect(approvalLevel(ladder, cents("0.01")!)).toBe(0);
    expect(approvalLevel(ladder, cents("10000.00")!)).toBe(0);
    expect(approvalLevel(ladder, cents("10000.01")!)).toBe(1);
    expect(approvalLevel(ladder, cents("50000.00")!)).toBe(1);
    expect(approvalLevel(ladder, cents("50000.01")!)).toBe(2);
  });

  test("the last level has no limit", () => {
    expect(approvalLevel(ladder, cents("9999999999999999.99")!)).toBe(ladder.length);
  });

  test("a ladder with one approver always resolves to the first level", () => {
    expect(approvalLevel([], 0n)).toBe(0);
    expect(approvalLevel([], cents("9999999999999999.99")!)).toBe(0);
  });
});

test("levelColor repeats a four-colour cycle by position", () => {
  expect([0, 1, 2, 3, 4, 5].map(levelColor)).toEqual([
    "var(--coa-level-1)",
    "var(--coa-level-2)",
    "var(--coa-level-3)",
    "var(--coa-level-4)",
    "var(--coa-level-1)",
    "var(--coa-level-2)",
  ]);
});

test("viewCounts maps the list distribution onto the view tabs", () => {
  const counts = viewCounts({
    total: 12,
    actionableByMe: 3,
    byStatus: { PENDING: 7, APPROVED: 3, REJECTED: 2 },
  });
  expect(counts).toEqual({ all: 12, mine: 3, pending: 7, approved: 3, rejected: 2 });
  expect(Object.keys(counts)).toEqual(orderViews.map((view) => view.key));
});
