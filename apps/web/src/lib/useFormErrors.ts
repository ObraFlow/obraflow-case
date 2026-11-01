import { useCallback, useState } from "react";

/**
 * Field feedback of one form. Two sources of messages: what the form's schema reports (shown once a
 * field was touched, or after a failed submit) and what the server returned (shown at once, dropped when
 * the field is edited). The form keeps its own values, validation and submit.
 *
 * `idPrefix` makes the error element ids unique when several forms can be mounted together.
 *
 * Used by the simple forms: users, suppliers (create and rename), projects (create and rename) and login.
 * Not used elsewhere on purpose:
 * - NewOrder: its fields are indexed item rows. Removing a row remaps every error path, and it rewrites
 *   transport messages before showing them. Both depend on the form's own item state, so a generic hook
 *   would need more options than the lines it saves.
 * - DecisionActions and the CoA threshold editor: a single message set on confirm, not tracked per field.
 */
export function useFormErrors(errors: Record<string, string>, idPrefix: string) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<Record<string, string>>({});
  const message = (field: string) => server[field] || (touched[field] ? errors[field] : undefined);
  const errorId = (field: string) => `${idPrefix}-${field}-error`;
  return {
    message,
    errorId,
    /** Attributes for the input of `field`: validity, its message element and touch on blur. */
    fieldProps: (field: string) => ({
      "aria-invalid": !!message(field),
      "aria-describedby": message(field) ? errorId(field) : undefined,
      onBlur: () => setTouched((previous) => ({ ...previous, [field]: true })),
    }),
    /** The person changed `field`, so its server message no longer applies. */
    edit: useCallback((field: string) => {
      setServer((previous) => {
        const next = { ...previous };
        delete next[field];
        return next;
      });
    }, []),
    /** A submit that cannot proceed: show the schema message of every listed field. */
    touchAll: useCallback((fields: readonly string[]) => {
      setTouched((previous) => ({ ...previous, ...Object.fromEntries(fields.map((field) => [field, true])) }));
    }, []),
    setServerErrors: setServer,
    hasServerErrors: Object.keys(server).length > 0,
    /** Back to a pristine form: nothing touched, no server messages. */
    reset: useCallback(() => {
      setTouched({});
      setServer({});
    }, []),
  };
}
