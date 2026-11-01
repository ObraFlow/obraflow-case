import type { ComponentProps, ReactNode } from "react";
import { CircleAlert, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./AlertCard.module.css";

export type AlertCardVariant = "info" | "warning" | "alert" | "error";

const icons: Record<AlertCardVariant, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  alert: Info,
  error: CircleAlert,
};

/** Message card for guidance, warnings and errors. Callers can preserve live status/alert semantics. */
export function AlertCard({
  variant,
  title,
  children,
  className,
  role,
  ...props
}: Omit<ComponentProps<"div">, "title"> & { variant: AlertCardVariant; title?: ReactNode; children: ReactNode }) {
  const Icon = icons[variant];
  return (
    <div
      {...props}
      role={role ?? (variant === "error" ? "alert" : "note")}
      data-variant={variant}
      className={cn(styles.card, styles[variant], className)}
    >
      <Icon aria-hidden="true" className={styles.icon} />
      <div className={styles.content}>
        {title && <strong className={styles.title}>{title} </strong>}
        {children}
      </div>
    </div>
  );
}
