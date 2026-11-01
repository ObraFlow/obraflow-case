import type { ReactNode } from "react";
import styles from "./ListShell.module.css";

/** One frame for every list page: title and actions, optional notices, filters, the list itself and a footer
 * (pagination). On wide, tall windows the frame fills the screen and only the list scrolls, so the title,
 * filters and footer stay in view; on phones and short windows the page scrolls normally. The list's own
 * region (`.catalog-viewport` or `[data-list-region]`) takes the remaining height. Pages keep owning data,
 * filters and every state; the frame only arranges them. */
export function ListShell({
  header,
  notices,
  filters,
  footer,
  children,
}: {
  header: ReactNode;
  notices?: ReactNode;
  filters?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`page-width ${styles.shell}`}>
      <div className={styles.fixed}>{header}</div>
      {notices ? <div className={`${styles.fixed} ${styles.notices}`}>{notices}</div> : null}
      {filters ? <div className={styles.fixed}>{filters}</div> : null}
      <div className={styles.body}>{children}</div>
      {footer ? <div className={`${styles.fixed} ${styles.footer}`}>{footer}</div> : null}
    </div>
  );
}
