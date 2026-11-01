import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../button";
import { isoDate, localToday, parseDate } from "@/lib/calendarDate";
import type { DateRange } from "./DateRangeSelector";
import styles from "./DateRangeSelector.module.css";

const monthOf = (date: string) => date.slice(0, 7);
function shiftMonth(month: string, offset: number) {
  const date = parseDate(`${month}-01`)!;
  date.setUTCMonth(date.getUTCMonth() + offset);
  return monthOf(isoDate(date));
}

export function DateRangeCalendar({ value, onChoose }: { value: DateRange; onChoose: (day: string) => void }) {
  const [focused, setFocused] = useState(value.from || value.to || localToday());
  // Two months are shown side by side, so the first one cannot be the last month of the supported range.
  const [month, setMonth] = useState(() => (monthOf(focused) === "9999-12" ? "9999-11" : monthOf(focused)));
  const root = useRef<HTMLDivElement>(null);
  // Focus a day only after the render that shows it; the day may be in a month that was not drawn yet.
  const requestFocus = useRef(false);
  useLayoutEffect(() => {
    if (requestFocus.current) {
      requestFocus.current = false;
      root.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
    }
  }, [focused, month]);
  function move(next: string) {
    setFocused(next);
    requestFocus.current = true;
    if (monthOf(next) < month) setMonth(monthOf(next));
    else if (monthOf(next) > shiftMonth(month, 1)) setMonth(shiftMonth(monthOf(next), -1));
  }
  function keyboard(event: KeyboardEvent, day: string) {
    const date = parseDate(day)!;
    const offset = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -date.getUTCDay(),
      End: 6 - date.getUTCDay(),
    }[event.key];
    if (offset !== undefined) {
      event.preventDefault();
      date.setUTCDate(date.getUTCDate() + offset);
      move(isoDate(date));
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const nextMonth = shiftMonth(monthOf(day), event.key === "PageUp" ? -1 : 1);
      const end = parseDate(`${nextMonth}-01`)!;
      end.setUTCMonth(end.getUTCMonth() + 1);
      end.setUTCDate(0);
      move(`${nextMonth}-${String(Math.min(date.getUTCDate(), end.getUTCDate())).padStart(2, "0")}`);
    }
  }
  return (
    <div ref={root} className={styles.calendar}>
      <div className={styles.navigation}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Mês anterior"
          disabled={month <= "0000-01"}
          onClick={() => {
            const next = shiftMonth(month, -1);
            setMonth(next);
            setFocused(`${next}-01`);
          }}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Próximo mês"
          disabled={month >= "9999-11"}
          onClick={() => {
            const next = shiftMonth(month, 1);
            setMonth(next);
            setFocused(`${next}-01`);
          }}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      <div className={styles.months}>
        {[month, shiftMonth(month, 1)].map((current) => {
          const first = parseDate(`${current}-01`)!;
          const last = new Date(first);
          last.setUTCMonth(last.getUTCMonth() + 1);
          last.setUTCDate(0);
          const cells = Array.from({ length: 42 }, (_, index) => {
            const day = index - first.getUTCDay() + 1;
            return day > 0 && day <= last.getUTCDate() ? `${current}-${String(day).padStart(2, "0")}` : null;
          });
          const title = first.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
          return (
            <div key={current} className={styles.month}>
              <p className={styles.monthTitle} aria-live="polite">
                {title}
              </p>
              <div role="grid" aria-label={title} aria-multiselectable="true">
                <div role="row" className={styles.week}>
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                    <span role="columnheader" key={day}>
                      {day}
                    </span>
                  ))}
                </div>
                {Array.from({ length: 6 }, (_, row) => (
                  <div role="row" className={styles.week} key={row}>
                    {cells.slice(row * 7, row * 7 + 7).map((day, index) => {
                      const selected =
                        !!day &&
                        (day === value.from ||
                          day === value.to ||
                          !!(value.from && value.to && day > value.from && day < value.to));
                      return (
                        <div
                          key={day ?? index}
                          role="gridcell"
                          aria-selected={selected}
                          data-endpoint={!!day && (day === value.from || day === value.to)}
                        >
                          {day && (
                            <button
                              type="button"
                              data-date={day}
                              data-today={day === localToday()}
                              tabIndex={day === focused ? 0 : -1}
                              aria-label={parseDate(day)!.toLocaleDateString("pt-BR", {
                                dateStyle: "full",
                                timeZone: "UTC",
                              })}
                              onFocus={() => setFocused(day)}
                              onKeyDown={(event) => keyboard(event, day)}
                              onClick={() => onChoose(day)}
                            >
                              {Number(day.slice(-2))}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
