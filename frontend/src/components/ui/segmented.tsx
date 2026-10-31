import { cn } from '@/lib/utils';

export interface SegItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function Segmented<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: SegItem<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('inline-flex gap-0.5 rounded-[7px] bg-muted p-0.5', className)}>
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          data-state={value === it.value ? 'active' : undefined}
          onClick={() => onChange(it.value)}
          className="inline-flex h-[26px] items-center rounded-[5px] px-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:shadow-focus data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:ring-1 data-[state=active]:ring-border"
        >
          {it.label}
          {it.count != null && <span className="num ml-1 text-subtle-foreground">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}
