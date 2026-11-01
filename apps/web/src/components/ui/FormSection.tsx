import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./FormSection.module.css";

/** CMAPP's fieldset/legend section pattern, adapted to ObraFlow's theme tokens. */
export function FormSection({
  children,
  className,
  title,
  description,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  title: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const titleId = useId();
  return (
    <fieldset disabled={disabled} aria-labelledby={titleId} className={cn(styles.section, className)}>
      <legend className={styles.legend}>
        <span id={titleId}>{title}</span>
      </legend>
      {description && <p className={styles.description}>{description}</p>}
      {children}
    </fieldset>
  );
}
