import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOrders } from "@/hooks/queries";
import { currentApprover } from "@/lib/chain";
import { cn, initials } from "@/lib/utils";
import { useActingUser } from "@/providers/ActingUserProvider";
import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";

export function ActingUserPicker({ className }: { className?: string }) {
  const { users, actingUser, actingUserId, setActingUserId } = useActingUser();
  const { data: orders } = useOrders({});
  const [open, setOpen] = useState(false);

  const pendingByUser = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders ?? []) {
      const cur = currentApprover(o);
      if (cur) m.set(cur.userId, (m.get(cur.userId) ?? 0) + 1);
    }
    return m;
  }, [orders]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border bg-card px-2 py-1.5 text-left shadow-xs transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:shadow-focus",
          className,
        )}
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-2xs font-semibold text-primary-text">
          {actingUser ? initials(actingUser.name) : "—"}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-2xs text-subtle-foreground">
            Atuando como
          </span>
          <span className="block truncate text-xs font-medium">
            {actingUser?.name ?? "Selecionar…"}
          </span>
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-subtle-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px]">
        <div className="px-2 py-1.5 text-2xs font-medium uppercase tracking-wide text-subtle-foreground">
          Atuar como
        </div>
        {users.map((u) => {
          const count = pendingByUser.get(u.id) ?? 0;
          const active = u.id === actingUserId;
          return (
            <button
              key={u.id}
              onClick={() => {
                setActingUserId(u.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent focus-visible:outline-none focus-visible:bg-accent"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-2xs font-semibold text-primary-text">
                {initials(u.name)}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-xs font-medium">
                  {u.name}
                </span>
                {u.role && (
                  <span className="block truncate text-2xs text-subtle-foreground">
                    {u.role}
                  </span>
                )}
              </span>
              {count > 0 && (
                <span className="num inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-warning-muted px-1 text-2xs font-medium text-warning">
                  {count}
                </span>
              )}
              {active && <Check className="size-3.5 text-primary" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
