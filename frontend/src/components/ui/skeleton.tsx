import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-skeleton motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}
