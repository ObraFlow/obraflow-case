import styles from "./FieldFeedback.module.css";

/** Two reserved lines (one when `compact`) keep validation from moving adjacent controls. */
export function FieldFeedback({ id, message, compact }: { id: string; message?: string; compact?: boolean }) {
  return (
    <p
      id={id}
      className={compact ? `${styles.feedback} ${styles.compact}` : styles.feedback}
      aria-live="polite"
      aria-atomic="true"
      tabIndex={message ? 0 : undefined}
    >
      {message}
    </p>
  );
}
