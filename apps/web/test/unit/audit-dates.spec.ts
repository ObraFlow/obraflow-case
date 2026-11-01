import { test, expect } from "@playwright/test";
import { auditDateBounds, auditDateRange } from "../../src/features/audit/auditDateRange";
import { displayDate, isoDate, parseDate, readDate } from "../../src/lib/calendarDate";

// These run in the machine's own timezone. Every property is written so it holds in any zone,
// including those with a DST change inside the tested days.

test("an empty filter has no dates, in either direction", () => {
  expect(auditDateRange(new URLSearchParams())).toEqual({ from: "", to: "" });
  expect(auditDateBounds({ from: "", to: "" })).toEqual({ from: "", to: "" });
});

test("a selected day becomes local midnight, and the upper bound is the next local midnight", () => {
  const bounds = auditDateBounds({ from: "2026-10-27", to: "2026-10-28" });
  const start = new Date(bounds.from);
  const end = new Date(bounds.to);
  expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes()]).toEqual([
    2026, 9, 27, 0, 0,
  ]);
  expect([end.getFullYear(), end.getMonth(), end.getDate(), end.getHours(), end.getMinutes()]).toEqual([
    2026, 9, 29, 0, 0,
  ]);
});

test("every day of two years survives the round trip through the API bounds", () => {
  for (let time = Date.UTC(2026, 0, 1); time < Date.UTC(2028, 0, 1); time += 86_400_000) {
    const day = new Date(time).toISOString().slice(0, 10);
    const params = new URLSearchParams(auditDateBounds({ from: day, to: day }));
    expect(auditDateRange(params), day).toEqual({ from: day, to: day });
  }
});

test("an external exclusive upper bound shows the last included local day", () => {
  const midnight = new Date(2026, 9, 29).toISOString();
  expect(auditDateRange(new URLSearchParams({ to: midnight })).to).toBe("2026-10-28");
  const afternoon = new Date(2026, 9, 28, 15).toISOString();
  expect(auditDateRange(new URLSearchParams({ to: afternoon })).to).toBe("2026-10-28");
});

test("unreadable timestamps show no date", () => {
  expect(auditDateRange(new URLSearchParams({ from: "yesterday", to: "soon" }))).toEqual({ from: "", to: "" });
});

test.describe("calendar dates", () => {
  test("parseDate accepts only real calendar days", () => {
    expect(parseDate("2026-10-27")?.toISOString()).toBe("2026-10-27T00:00:00.000Z");
    for (const value of ["2026-02-31", "2026-13-01", "2026-1-1", "27/10/2026", "", "2026-10-27T00:00:00Z"]) {
      expect(parseDate(value), value).toBeNull();
    }
    expect(parseDate("2028-02-29")).not.toBeNull();
    expect(parseDate("2027-02-29")).toBeNull();
  });

  test("display and entry use the Brazilian format, storage stays ISO", () => {
    expect(displayDate("2026-10-27")).toBe("27/10/2026");
    expect(displayDate("not a date")).toBe("");
    expect(readDate("27/10/2026")).toBe("2026-10-27");
    expect(readDate("2026-10-27")).toBe("2026-10-27");
    for (const text of ["31/02/2026", "27/10/26", "", "ontem"]) expect(readDate(text), text).toBeNull();
  });

  test("isoDate stays inside the supported years", () => {
    expect(isoDate(new Date(Date.UTC(2026, 9, 27)))).toBe("2026-10-27");
    const far = new Date(0);
    far.setUTCFullYear(10000);
    expect(isoDate(far)).toBe("9999-12-31");
    const early = new Date(0);
    early.setUTCFullYear(-5);
    expect(isoDate(early)).toBe("0000-01-01");
  });
});
