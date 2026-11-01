import type { ReactNode } from "react";
import { CircleAlert, RefreshCw, SearchX, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import styles from "./Feedback.module.css";

type StateAction = { label: string; onClick: () => void; disabled?: boolean; pending?: boolean; icon?: LucideIcon };
type StateProps = {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  action?: StateAction;
  compact?: boolean;
};

/** Presentation only: the page owns reads, filters, drafts and reconciliation. */
export function StateCard({
  title,
  description,
  icon: Icon = SearchX,
  action,
  compact = false,
  error = false,
}: StateProps & { error?: boolean }) {
  const Heading = compact ? "h3" : "h2";
  const ActionIcon = action?.icon;
  return (
    <section
      className={styles.card}
      data-compact={compact || undefined}
      data-error={error || undefined}
      role={error ? "alert" : undefined}
      aria-busy={action?.pending || undefined}
    >
      <span className={styles.icon}>
        <Icon aria-hidden="true" size={24} />
      </span>
      <Heading>{title}</Heading>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        <Button type="button" variant="outline" disabled={action.disabled || action.pending} onClick={action.onClick}>
          {ActionIcon && <ActionIcon aria-hidden="true" />}
          {action.label}
        </Button>
      )}
    </section>
  );
}

export function EmptyState(props: StateProps) {
  return <StateCard {...props} />;
}

export function ErrorState({
  error,
  retry,
  title = "Não foi possível carregar os dados",
  compact = false,
  pending = false,
}: {
  error: unknown;
  retry?: () => void;
  title?: string;
  compact?: boolean;
  pending?: boolean;
}) {
  return (
    <StateCard
      error
      title={title}
      description={errorMessage(error)}
      icon={CircleAlert}
      compact={compact}
      action={
        retry
          ? { label: pending ? "Consultando…" : "Tentar novamente", onClick: retry, pending, icon: RefreshCw }
          : undefined
      }
    />
  );
}
