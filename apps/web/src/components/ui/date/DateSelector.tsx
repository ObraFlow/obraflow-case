import { useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps, type KeyboardEvent } from "react";
import { Popover } from "@base-ui/react/popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../button";
import { FieldFeedback } from "../FieldFeedback";
import { displayDate, isoDate, localToday, parseDate, readDate } from "@/lib/calendarDate";
import styles from "./DateSelector.module.css";

// The calendar covers every year the date arithmetic supports.
const FIRST_DAY = "0000-01-01";
const LAST_DAY = "9999-12-31";

export type DateSelectorProps = Omit<
  ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "type" | "min" | "max"
> & {
  value: string;
  onValueChange: (value: string) => void;
  calendarLabel?: string;
  reserveFeedback?: boolean;
  feedbackMessage?: string;
};
export function DateSelector({
  value,
  onValueChange,
  calendarLabel = "Escolher data",
  reserveFeedback = false,
  feedbackMessage,
  disabled,
  readOnly,
  id,
  onBlur,
  ...inputProps
}: DateSelectorProps) {
  const generated = useId(),
    inputId = id ?? generated,
    errorId = `${inputId}-date-error`;
  const [text, setText] = useState(() => displayDate(value)),
    [error, setError] = useState("");
  const message = error || feedbackMessage;
  const [open, setOpen] = useState(false);
  const clamp = (date: string) => (date < FIRST_DAY ? FIRST_DAY : date > LAST_DAY ? LAST_DAY : date);
  const [focused, setFocused] = useState(() => clamp(value || localToday()));
  const [month, setMonth] = useState(() => focused.slice(0, 7));
  const days = useRef<HTMLDivElement>(null);
  // Focus a day only after the render that shows it; the day may be in a month that was not drawn yet.
  const focusRequested = useRef(false);
  useLayoutEffect(() => {
    if (focusRequested.current) {
      focusRequested.current = false;
      days.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
    }
  }, [focused, month]);
  // The value this control last emitted: only a different value from outside rewrites what the person typed.
  const lastEmitted = useRef(value);
  useEffect(() => {
    if (value !== lastEmitted.current) {
      setText(displayDate(value));
      setError("");
      lastEmitted.current = value;
    }
  }, [value]);
  function update(next: string) {
    lastEmitted.current = next;
    onValueChange(next);
  }
  function changeOpen(next: boolean) {
    if (next) {
      const day = clamp(parseDate(value) ? value : localToday());
      setFocused(day);
      setMonth(day.slice(0, 7));
    }
    setOpen(next);
  }
  function choose(day: string) {
    setText(displayDate(day));
    setError("");
    update(day);
    setOpen(false);
  }
  function move(day: string) {
    const next = clamp(day);
    focusRequested.current = true;
    setFocused(next);
    setMonth(next.slice(0, 7));
  }
  function keyboard(event: KeyboardEvent, day: string) {
    const date = parseDate(day)!;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const offset = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
        Home: -date.getUTCDay(),
        End: 6 - date.getUTCDay(),
      }[event.key]!;
      date.setUTCDate(date.getUTCDate() + offset);
      move(isoDate(date));
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      moveMonth(event.key === "PageUp" ? -1 : 1, true);
    }
  }
  function moveMonth(offset: number, focus = false) {
    const date = parseDate(`${month}-01`)!;
    date.setUTCMonth(date.getUTCMonth() + offset);
    if (date.getUTCFullYear() < 0 || date.getUTCFullYear() > 9999) return;
    const last = new Date(date);
    last.setUTCMonth(last.getUTCMonth() + 1);
    last.setUTCDate(0);
    date.setUTCDate(Math.min(Number(focused.slice(-2)), last.getUTCDate()));
    const next = clamp(isoDate(date));
    setFocused(next);
    setMonth(next.slice(0, 7));
    if (focus) move(next);
  }
  const first = parseDate(`${month}-01`)!;
  const end = new Date(first);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);
  const cells = Array.from({ length: Math.ceil((first.getUTCDay() + end.getUTCDate()) / 7) * 7 }, (_, index) => {
    const day = index - first.getUTCDay() + 1;
    return day > 0 && day <= end.getUTCDate() ? `${month}-${String(day).padStart(2, "0")}` : null;
  });
  const monthLabel = first.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className={styles.field}>
      <div className={styles.control} data-invalid={!!message || inputProps["aria-invalid"] === true}>
        <input
          {...inputProps}
          id={inputId}
          disabled={disabled}
          readOnly={readOnly}
          type="text"
          inputMode="numeric"
          placeholder={inputProps.placeholder ?? "dd/mm/aaaa"}
          value={text}
          aria-invalid={!!message || inputProps["aria-invalid"]}
          aria-describedby={
            [inputProps["aria-describedby"], message ? errorId : ""].filter(Boolean).join(" ") || undefined
          }
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            setError("");
            const parsed = readDate(next);
            update(parsed && parsed >= FIRST_DAY && parsed <= LAST_DAY ? parsed : "");
          }}
          onBlur={(event) => {
            if (text && (!readDate(text) || readDate(text)! < FIRST_DAY || readDate(text)! > LAST_DAY))
              setError("Informe uma data válida.");
            else if (readDate(text)) setText(displayDate(readDate(text)!));
            onBlur?.(event);
          }}
        />
        <Popover.Root open={open} onOpenChange={changeOpen}>
          <Popover.Trigger
            className={styles.calendarTrigger}
            disabled={disabled || readOnly}
            aria-label={calendarLabel}
          >
            <CalendarDays size={18} aria-hidden="true" />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner className={styles.positioner} sideOffset={6} align="end" collisionPadding={12}>
              <Popover.Popup
                className={styles.popup}
                initialFocus={() => days.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)}
              >
                <Popover.Title className="sr-only">{calendarLabel}</Popover.Title>
                <div className={styles.heading}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Mês anterior"
                    disabled={month <= FIRST_DAY.slice(0, 7)}
                    onClick={() => moveMonth(-1)}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <p aria-live="polite">{monthLabel}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Próximo mês"
                    disabled={month >= LAST_DAY.slice(0, 7)}
                    onClick={() => moveMonth(1)}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
                <div ref={days} role="grid" aria-label={monthLabel} className={styles.grid}>
                  <div role="row" className={styles.week}>
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                      <span role="columnheader" key={day}>
                        {day}
                      </span>
                    ))}
                  </div>
                  {Array.from({ length: cells.length / 7 }, (_, row) => (
                    <div role="row" className={styles.week} key={row}>
                      {cells.slice(row * 7, row * 7 + 7).map((day, index) => (
                        <div role="gridcell" key={day ?? index} aria-selected={!!day && day === value}>
                          {day && (
                            <button
                              type="button"
                              data-date={day}
                              data-today={day === localToday()}
                              tabIndex={day === focused ? 0 : -1}
                              disabled={day < FIRST_DAY || day > LAST_DAY}
                              aria-label={parseDate(day)!.toLocaleDateString("pt-BR", {
                                dateStyle: "full",
                                timeZone: "UTC",
                              })}
                              onFocus={() => setFocused(day)}
                              onKeyDown={(event) => keyboard(event, day)}
                              onClick={() => choose(day)}
                            >
                              {Number(day.slice(-2))}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className={styles.footer}>
                  <Button type="button" variant="ghost" size="sm" onClick={() => choose(clamp(localToday()))}>
                    Hoje
                  </Button>
                  {!inputProps.required && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => choose("")}>
                      Limpar
                    </Button>
                  )}
                  <Popover.Close render={<Button type="button" variant="outline" size="sm" />}>Fechar</Popover.Close>
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>
      {reserveFeedback ? (
        <FieldFeedback id={errorId} message={message} />
      ) : (
        message && (
          <p id={errorId} role="alert" className="field-error">
            {message}
          </p>
        )
      )}
    </div>
  );
}
