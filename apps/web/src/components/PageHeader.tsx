import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

export function PageHeader({
  title,
  description,
  actions,
  note,
}: {
  title: string;
  description: string;
  actions: ReactNode;
  note?: string;
}) {
  return (
    <header className={styles.header}>
      <h1 className={`page-heading ${styles.title}`} tabIndex={-1}>
        {title}
      </h1>
      <p className={styles.description}>{description}</p>
      <div className={`page-actions ${styles.actions}`}>{actions}</div>
      {note && <p className={styles.note}>{note}</p>}
    </header>
  );
}
