import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const tones: Record<Tone, { pill: string; dot: string }> = {
  success: { pill: "bg-success-muted text-success", dot: "bg-success-icon" },
  warning: { pill: "bg-warning-muted text-warning", dot: "bg-warning-icon" },
  danger: { pill: "bg-danger-muted text-danger", dot: "bg-danger-icon" },
  info: { pill: "bg-primary-soft text-primary-text", dot: "bg-primary" },
  neutral: {
    pill: "bg-muted text-muted-foreground",
    dot: "bg-subtle-foreground",
  },
};

export function Badge({
  tone = "neutral",
  dot = true,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-xs font-medium",
        t.pill,
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}
