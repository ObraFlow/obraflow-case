import { describe, expect, it } from "vitest";
import { lineTotalCents } from "./money";

describe("lineTotalCents", () => {
  it("arredonda o resultado de uma quantidade decimal", () => {
    expect(lineTotalCents(2.345, 100)).toBe(235);
    expect(lineTotalCents(2.346, 100)).toBe(235);
  });
});
