// Calendar-only ISO dates: UTC arithmetic avoids DST and timezone shifts.
export function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}
export const isoDate = (date: Date) =>
  date.getUTCFullYear() < 0
    ? "0000-01-01"
    : date.getUTCFullYear() > 9999
      ? "9999-12-31"
      : date.toISOString().slice(0, 10);
export const displayDate = (value: string) => (parseDate(value) ? value.split("-").reverse().join("/") : "");
export function readDate(text: string) {
  const value = /^\d{2}\/\d{2}\/\d{4}$/.test(text) ? text.split("/").reverse().join("-") : text;
  return parseDate(value) ? value : null;
}
/** A Date's calendar day in the local time zone (not UTC, which differs near midnight), as an ISO date. */
export function localDay(date: Date) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export const localToday = () => localDay(new Date());
