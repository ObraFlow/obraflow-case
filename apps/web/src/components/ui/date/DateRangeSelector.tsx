import { useEffect, useId, useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { CalendarDays } from "lucide-react";
import { displayDate, isoDate, localToday, parseDate, readDate } from "@/lib/calendarDate";
import { DateRangeCalendar } from "./DateRangeCalendar";
import { Button } from "../button";
import styles from "./DateRangeSelector.module.css";

export type DateRange = { from: string; to: string };
export type DateRangeSelectorProps = {
  value: DateRange;
  onValueChange: (value: DateRange) => void;
  label?: string;
  disabled?: boolean;
};

/** The applied period as the trigger shows it; either end may be open. */
function periodSummary({ from, to }: DateRange) {
  if (from && to) return `${displayDate(from)} – ${displayDate(to)}`;
  if (from) return `A partir de ${displayDate(from)}`;
  if (to) return `Até ${displayDate(to)}`;
  return "Todo o período";
}

export function DateRangeSelector({ value, onValueChange, label = "Período", disabled }: DateRangeSelectorProps) {
  const id = useId(),
    from = useRef<HTMLInputElement>(null),
    to = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => ({ from: displayDate(value.from), to: displayDate(value.to) }));
  const [error, setError] = useState("");
  const [calendarKey, setCalendarKey] = useState(0);
  useEffect(() => {
    setDraft({ from: displayDate(value.from), to: displayDate(value.to) });
    setError("");
  }, [value.from, value.to]);
  function changeOpen(next: boolean) {
    if (next) {
      setDraft({ from: displayDate(value.from), to: displayDate(value.to) });
      setError("");
      setCalendarKey((previous) => previous + 1);
    }
    setOpen(next);
  }
  function apply() {
    const start = draft.from ? readDate(draft.from) : "",
      end = draft.to ? readDate(draft.to) : "";
    if (start === null || end === null) {
      setError("Informe datas válidas.");
      (start === null ? from : to).current?.focus();
      return;
    }
    if (start && end && start > end) {
      setError("A data final deve ser igual ou posterior à inicial.");
      to.current?.focus();
      return;
    }
    onValueChange({ from: start, to: end });
    setOpen(false);
  }
  function preset(days: number) {
    const end = localToday(),
      start = parseDate(end)!;
    start.setUTCDate(start.getUTCDate() - days + 1);
    setDraft({ from: displayDate(isoDate(start)), to: displayDate(end) });
    setError("");
    setCalendarKey((previous) => previous + 1);
  }
  const selected = { from: readDate(draft.from) ?? "", to: readDate(draft.to) ?? "" };
  const summary = periodSummary(value);
  return (
    <div className={styles.field}>
      <label id={`${id}-label`}>{label}</label>
      <Popover.Root open={open} onOpenChange={changeOpen}>
        <Popover.Trigger disabled={disabled} className={styles.trigger} aria-labelledby={`${id}-label ${id}-value`}>
          <span id={`${id}-value`}>{summary}</span>
          <CalendarDays size={17} aria-hidden="true" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner className={styles.positioner} sideOffset={6} align="end" collisionPadding={12}>
            <Popover.Popup className={styles.popup} initialFocus={from}>
              <div className={styles.content}>
                <Popover.Title className={styles.title}>{label}</Popover.Title>
                <div className={styles.presets} aria-label="Períodos rápidos">
                  <Button type="button" variant="outline" size="sm" onClick={() => preset(1)}>
                    Hoje
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => preset(7)}>
                    Últimos 7 dias
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => preset(30)}>
                    Últimos 30 dias
                  </Button>
                </div>
                <div
                  className={styles.inputs}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      apply();
                    }
                  }}
                >
                  {(["from", "to"] as const).map((key) => (
                    <div key={key}>
                      <label htmlFor={`${id}-${key}`}>{key === "from" ? "De" : "Até"}</label>
                      <input
                        ref={key === "from" ? from : to}
                        id={`${id}-${key}`}
                        type="text"
                        inputMode="numeric"
                        placeholder="dd/mm/aaaa"
                        value={draft[key]}
                        aria-invalid={!!error}
                        aria-describedby={error ? `${id}-error` : undefined}
                        onChange={(event) => {
                          setDraft((previous) => ({ ...previous, [key]: event.target.value }));
                          setError("");
                          if (readDate(event.target.value)) setCalendarKey((previous) => previous + 1);
                        }}
                      />
                    </div>
                  ))}
                </div>
                <p className={styles.hint} aria-live="polite">
                  {selected.from && !selected.to
                    ? "Selecione a data final ou aplique sem data final."
                    : "Selecione a data inicial e depois a final. Inclui os dois dias."}
                </p>
                <DateRangeCalendar
                  key={calendarKey}
                  value={selected}
                  onChoose={(day) => {
                    const next =
                      selected.from && !selected.to
                        ? {
                            from: day < selected.from ? day : selected.from,
                            to: day < selected.from ? selected.from : day,
                          }
                        : { from: day, to: "" };
                    setDraft({ from: displayDate(next.from), to: displayDate(next.to) });
                    setError("");
                  }}
                />
                {error && (
                  <p id={`${id}-error`} role="alert" className="field-error">
                    {error}
                  </p>
                )}
              </div>
              <div className={styles.footer}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    onValueChange({ from: "", to: "" });
                    setOpen(false);
                  }}
                >
                  Limpar período
                </Button>
                <Popover.Close render={<Button type="button" variant="outline" />}>Cancelar</Popover.Close>
                <Button type="button" onClick={apply}>
                  Aplicar período
                </Button>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
