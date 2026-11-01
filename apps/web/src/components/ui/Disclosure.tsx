import type { ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./Disclosure.module.css";

export type DisclosureProps = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function Disclosure({
  title,
  icon,
  children,
  open,
  defaultOpen,
  onOpenChange,
  disabled,
  className,
}: DisclosureProps) {
  return (
    <Collapsible.Root
      data-slot="disclosure"
      className={cn(styles.root, className)}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      disabled={disabled}
    >
      <Collapsible.Trigger data-slot="disclosure-trigger" className={styles.trigger}>
        <span className={styles.label}>
          {icon && (
            <span className={styles.icon} aria-hidden="true">
              {icon}
            </span>
          )}
          <span>{title}</span>
        </span>
        <ChevronDown className={styles.chevron} size={18} aria-hidden="true" />
      </Collapsible.Trigger>
      <Collapsible.Panel data-slot="disclosure-panel" className={styles.panel} keepMounted>
        <div className={styles.content}>{children}</div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
