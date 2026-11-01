import { useId, useImperativeHandle, useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { brl } from "@/lib/format";
import styles from "./MoneyInput.module.css";

type Props = Omit<ComponentProps<"input">, "type" | "inputMode" | "value" | "onChange" | "min" | "max"> & {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  minimum?: string;
  maximum?: string;
  hideLabel?: boolean;
  error?: string;
  format?: "decimal" | "currency";
};

type CurrencyPart = "integer" | "fraction" | null;
function currencyText(value: string, part: CurrencyPart) {
  const parts = /^(\d+)(?:\.(\d*))?$/.exec(value);
  if (!parts) return value;
  const integer = parts[1].replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  // Keep an unfinished fraction editable; pad for integer entry and blur.
  // padEnd never truncates extra digits: validation still rejects excess scale.
  const fraction = part === "fraction" ? (parts[2] ?? "") : (parts[2] ?? "").padEnd(2, "0");
  return `${integer},${fraction}`;
}

function decimalText(value: string) {
  const text = value.replace(/^\s*R\$\s*/, "").replace(/[\s\u00a0]/g, "");
  if (text.includes(",")) return text.replaceAll(".", "").replace(",", ".");
  // A lone dot is a decimal separator. Grouped BRL paste includes a comma;
  // never reinterpret an over-precise decimal such as 1.001 as 1001 reais.
  return text.startsWith(".") ? `0${text}` : text;
}

function afterDigits(text: string, count: number) {
  if (!count) return 0;
  for (let index = 0, seen = 0; index < text.length; index++)
    if (/\d/.test(text[index]) && ++seen === count) return index + 1;
  return text.length;
}

/** Decimal text stays exact; the caller owns validation and confirmation. */
export function MoneyInput({
  label,
  value,
  onValueChange,
  minimum,
  maximum,
  hideLabel = false,
  error,
  format = "decimal",
  id,
  className,
  onFocus,
  onBlur,
  onKeyDown,
  ref,
  ...inputProps
}: Props) {
  const generated = useId(),
    controlId = id ?? generated;
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => input.current!, []);
  const [part, setPart] = useState<CurrencyPart>(null);
  const [editVersion, setEditVersion] = useState(0);
  const selection = useRef<{ fraction: true } | { offset: number } | { digits: number; afterDecimal: boolean } | null>(
    null,
  );
  // Grouping changes string offsets. Restore the logical digit position after
  // React commits the formatted value, including edits that keep its value.
  useLayoutEffect(() => {
    const request = selection.current,
      node = input.current;
    selection.current = null;
    if (!request || !node || document.activeElement !== node) return;
    const comma = node.value.lastIndexOf(",");
    if ("fraction" in request) node.setSelectionRange(comma + 1, node.value.length);
    else if ("offset" in request) node.setSelectionRange(request.offset, request.offset);
    else {
      const position = Math.max(
        afterDigits(node.value, request.digits),
        request.afterDecimal && comma >= 0 ? comma + 1 : 0,
      );
      node.setSelectionRange(position, position);
    }
  }, [value, part, editVersion]);
  function enterFraction() {
    if (value && !/^\d+(?:\.\d*)?$/.test(value)) return false;
    if (!value) onValueChange("0");
    selection.current = { fraction: true };
    setPart("fraction");
    setEditVersion((version) => version + 1);
    return true;
  }
  const boundsId = `${controlId}-bounds`,
    errorId = `${controlId}-error`;
  return (
    <div className={styles.section}>
      {!hideLabel && <label htmlFor={controlId}>{label}</label>}
      <div className={styles.control} data-invalid={!!error || inputProps["aria-invalid"] === true}>
        <span aria-hidden="true">R$</span>
        <input
          {...inputProps}
          ref={input}
          aria-label={hideLabel ? label : inputProps["aria-label"]}
          id={controlId}
          className={className}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={inputProps.placeholder ?? (format === "currency" ? "0,00" : undefined)}
          value={format === "currency" ? currencyText(value, part) : value}
          onChange={(event) => {
            if (format !== "currency") {
              onValueChange(event.target.value);
              return;
            }
            const native = event.nativeEvent as InputEvent;
            // Virtual keyboards may emit input without a keydown event.
            if (native.inputType === "insertText" && (native.data === "." || native.data === ",") && enterFraction())
              return;
            const text = event.target.value,
              caret = event.target.selectionStart ?? text.length;
            const comma = text.lastIndexOf(","),
              dot = text.lastIndexOf(".");
            const afterDecimal = comma >= 0 ? caret > comma : dot >= 0 && caret > dot;
            const next =
              /^,0*$/.test(text) && !afterDecimal ? "" : decimalText(text.startsWith(",") ? `0${text}` : text);
            // Not a number: keep what was typed, so validation flags it and deleting the
            // character gives the amount back, instead of normalizing it into something else.
            if (!/^\d*(?:\.\d*)?$/.test(next)) {
              selection.current = { offset: caret };
              setEditVersion((version) => version + 1);
              onValueChange(text);
              return;
            }
            const integer = next.split(".")[0],
              leadingZeros = integer.length - integer.replace(/^0+(?=\d)/, "").length;
            const digits = (text.slice(0, caret).match(/\d/g) ?? []).length;
            selection.current = {
              digits: Math.max(
                text.startsWith(",") ? 1 : 0,
                digits - leadingZeros + (text.startsWith(",") && afterDecimal ? 1 : 0),
              ),
              afterDecimal,
            };
            setPart(afterDecimal ? "fraction" : "integer");
            setEditVersion((version) => version + 1);
            onValueChange(next);
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || format !== "currency")
              return;
            if ((event.key === "." || event.key === ",") && enterFraction()) {
              event.preventDefault();
              return;
            }
            const node = event.currentTarget,
              start = node.selectionStart ?? 0,
              comma = node.value.lastIndexOf(",");
            if (start !== node.selectionEnd || comma < 0) return;
            // Cross the separator without joining cents into the whole amount.
            if ((event.key === "Backspace" && start === comma + 1) || (event.key === "Delete" && start === comma)) {
              event.preventDefault();
              const position = event.key === "Backspace" ? comma : comma + 1;
              node.setSelectionRange(position, position);
              return;
            }
            if (/^\d$/.test(event.key) && start > comma && start < node.value.length)
              node.setSelectionRange(start, start + 1);
          }}
          onFocus={(event) => {
            setPart("integer");
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setPart(null);
            if (format === "currency" && /^\d+\.$/.test(value)) onValueChange(value.slice(0, -1));
            onBlur?.(event);
          }}
          aria-invalid={!!error || inputProps["aria-invalid"]}
          aria-describedby={
            [minimum || maximum ? boundsId : "", error ? errorId : "", inputProps["aria-describedby"]]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
      </div>
      {(minimum || maximum) && (
        <dl id={boundsId} className={styles.bounds}>
          {minimum && (
            <div>
              <dt>Mínimo</dt>
              <dd>{brl(minimum)}</dd>
            </div>
          )}
          {maximum && (
            <div data-bound="maximum" data-wide={maximum.length > 14}>
              <dt>Máximo</dt>
              <dd>{brl(maximum)}</dd>
            </div>
          )}
        </dl>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
