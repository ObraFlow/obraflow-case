import { cn } from "@/lib/utils";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "./button";

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="mb-2 grid size-10 place-items-center rounded-[10px] border bg-surface-2 text-subtle-foreground">
        <Icon className="size-5" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {description && (
        <p className="max-w-[360px] text-muted-foreground text-pretty">
          {description}
        </p>
      )}
      {action && <div className="mt-2.5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-1.5 px-6 py-16 text-center"
    >
      <div className="mb-2 grid size-10 place-items-center rounded-[10px] bg-danger-muted text-danger">
        <AlertTriangle className="size-5" />
      </div>
      <p className="text-sm font-semibold">Algo deu errado</p>
      <p className="max-w-[360px] text-muted-foreground text-pretty">
        {message ?? "Não foi possível carregar os dados."}
      </p>
      {onRetry && (
        <Button variant="secondary" className="mt-2.5" onClick={onRetry}>
          <RefreshCw />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
