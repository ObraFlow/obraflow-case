import { useState } from "react";
import styles from "./NewOrderPage.module.css";

/**
 * Field feedback of the order form. Kept local instead of useFormErrors: the item rows are indexed paths (removing
 * a row remaps every error, see `removeItemAt`) and transport messages are rewritten in `fieldError`. Both depend
 * on this form's item state, so the shared hook would need more options than the lines it saves.
 *
 * `errors` are the client-side messages for the current values. A message shows once its field was touched;
 * messages from the server show at once and clear when that field is edited.
 */
export function useOrderFieldErrors(errors: Record<string, string>) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  function edit(field: string) {
    setServerErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      if (field.startsWith("items.")) delete next.items;
      return next;
    });
  }
  function fieldError(field: string) {
    const message = serverErrors[field] ?? (touched[field] ? errors[field] : undefined);
    if (!message) return;
    const transportError = message.includes("decimal com ponto") || message.includes("maior que zero");
    if (transportError && field.endsWith(".unitPrice")) return "Informe um preço válido.";
    if (transportError && field.endsWith(".quantity"))
      return message.includes("maior que zero")
        ? "Informe uma quantidade maior que zero."
        : "Use até 9 dígitos inteiros e 3 casas decimais, separados por vírgula ou ponto (ex.: 1,5).";
    return message;
  }
  function feedback(field: string) {
    const message = fieldError(field);
    return message ? (
      <p id={`error-${field}`} className={styles.feedback} aria-live="polite" tabIndex={-1}>
        {message}
      </p>
    ) : null;
  }
  function accessibility(field: string) {
    return {
      "aria-invalid": Boolean(fieldError(field)),
      "aria-describedby": fieldError(field) ? `error-${field}` : undefined,
      onBlur: () => setTouched((previous) => ({ ...previous, [field]: true })),
    };
  }
  /** Transport field paths use indices: drop the removed row's feedback and renumber the rows after it. */
  function removeItemAt(index: number) {
    function remap<T>(previous: Record<string, T>) {
      return Object.fromEntries(
        Object.entries(previous).flatMap(([field, value]) => {
          if (field === "items") return [];
          const match = /^items\.(\d+)(\..*)?$/.exec(field);
          if (!match) return [[field, value]];
          const itemIndex = Number(match[1]);
          return itemIndex === index
            ? []
            : [[`items.${itemIndex > index ? itemIndex - 1 : itemIndex}${match[2] ?? ""}`, value]];
        }),
      );
    }
    setTouched(remap);
    setServerErrors(remap);
  }

  return { serverErrors, setServerErrors, setTouched, edit, fieldError, feedback, accessibility, removeItemAt };
}

export type OrderFieldErrors = ReturnType<typeof useOrderFieldErrors>;
