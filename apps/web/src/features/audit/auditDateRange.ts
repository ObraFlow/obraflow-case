import { localDay, parseDate } from "@/lib/calendarDate";
import type { DateRange } from "@/components/ui/date/DateRangeSelector";

/** Calendar days for the filter inputs, from the URL's ISO bounds (the upper bound is exclusive). */
export function auditDateRange(params: URLSearchParams): DateRange {
  const start = params.get("from"),
    end = params.get("to");
  const from = start ? new Date(start) : null,
    to = end ? new Date(end) : null;
  // The last included instant may be on this same local day for external ISO bounds.
  if (to && Number.isFinite(to.getTime())) to.setTime(to.getTime() - 1);
  return {
    from: from && Number.isFinite(from.getTime()) ? localDay(from) : "",
    to: to && Number.isFinite(to.getTime()) ? localDay(to) : "",
  };
}
/** The inverse: inclusive local days to ISO bounds, the upper one being the start of the next day. */
export function auditDateBounds(range: DateRange) {
  const boundary = (day: string, nextDay: boolean) => {
    const date = parseDate(day)!;
    // Build local midnights separately; adding 24h would be wrong on DST transitions.
    const local = new Date(0);
    local.setFullYear(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + (nextDay ? 1 : 0));
    local.setHours(0, 0, 0, 0);
    return local.toISOString();
  };
  return { from: range.from ? boundary(range.from, false) : "", to: range.to ? boundary(range.to, true) : "" };
}
