import { plural } from "@/lib/format";
import { useId, useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import styles from "./FilterBar.module.css";

/** Search and filters of a list page. Wide screens show everything in one row; on phones the search
 * stays in view and the other filters sit behind one icon button (with how many are changed from
 * their defaults) that expands and collapses them. `note` (for example "1 oculta pelos filtros") sits in the
 * same row on wide screens, and on phones appears once the filters are open, with a dot on the button while
 * it applies, so it never adds a row of its own. The page owns every value and filtering rule. */
export function FilterBar({
  label,
  search,
  activeCount,
  note,
  children,
}: {
  label: string;
  search: ReactNode;
  activeCount: number;
  note?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <section className={`panel control-row ${styles.bar}`} aria-label={label}>
      <div className={styles.search}>{search}</div>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
      >
        <SlidersHorizontal size={18} aria-hidden="true" />
        <span className="sr-only">
          Filtros{activeCount > 0 ? `: ${activeCount} ${plural(activeCount, "ativo", "ativos")}` : ""}
          {note ? `. ${note}` : ""}
        </span>
        {activeCount > 0 ? (
          <span className={styles.count} aria-hidden="true">
            {activeCount}
          </span>
        ) : note ? (
          <span className={styles.dot} aria-hidden="true" />
        ) : null}
      </button>
      <div id={bodyId} className={styles.body} data-open={open}>
        <div className={styles.inner}>
          <div className={styles.fields}>{children}</div>
        </div>
      </div>
      {note && <p className={styles.note}>{note}</p>}
    </section>
  );
}
