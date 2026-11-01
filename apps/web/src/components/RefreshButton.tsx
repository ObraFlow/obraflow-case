import type { ComponentProps } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./RefreshButton.module.css";

type Props = ComponentProps<typeof Button> & { refreshing: boolean; iconOnly?: boolean };

/** Fetching and recovery remain owned by the caller. */
export function RefreshButton({
  refreshing,
  iconOnly = false,
  children = "Atualizar",
  disabled,
  className = "",
  "aria-label": label,
  ...props
}: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      {...props}
      className={`${styles.button} ${className}`}
      disabled={disabled || refreshing}
      aria-busy={refreshing}
      aria-label={refreshing && iconOnly ? "Atualizando..." : label}
    >
      <RefreshCw aria-hidden="true" className={refreshing ? styles.spinning : undefined} />
      {iconOnly ? (
        <span className="sr-only">{refreshing ? "Atualizando..." : children}</span>
      ) : (
        <span className={`${styles.labels} action-label`}>
          <span aria-hidden={refreshing} className={refreshing ? styles.hidden : undefined}>
            {children}
          </span>
          <span aria-hidden={!refreshing} className={!refreshing ? styles.hidden : undefined}>
            Atualizando...
          </span>
        </span>
      )}
    </Button>
  );
}
