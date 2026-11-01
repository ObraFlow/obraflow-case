import { useId, type ComponentProps } from "react";
import { Select } from "@base-ui/react/select";
import { Check, ChevronsUpDown, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./Selectors.module.css";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export type SingleSelectProps = Pick<
  ComponentProps<"button">,
  "id" | "className" | "onBlur" | "aria-label" | "aria-labelledby" | "aria-describedby" | "aria-invalid"
> & {
  options: readonly SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  required?: boolean;
  name?: string;
  emptyMessage?: string;
};

/** One controlled string value; `""` means no selection unless an option uses it (for example "Todos"). */
export function SingleSelect({
  options,
  value,
  onValueChange,
  placeholder = "Selecione…",
  disabled,
  readOnly,
  loading,
  required,
  name,
  emptyMessage = "Nenhuma opção disponível.",
  className,
  ...trigger
}: SingleSelectProps) {
  const generatedId = useId();
  const label = options.find((option) => option.value === value)?.label ?? value;
  return (
    <Select.Root<string, false>
      value={value}
      onValueChange={(next, details) => {
        // Reference refreshes must not silently clear a page-owned draft selection.
        if (details.reason !== "none") onValueChange(next ?? "");
      }}
      items={options}
      disabled={disabled || loading}
      readOnly={readOnly}
      required={required}
      name={name}
      modal={false}
    >
      <Select.Trigger
        {...trigger}
        id={trigger.id ?? generatedId}
        value={value}
        className={cn(styles.trigger, className)}
        aria-busy={loading || undefined}
      >
        <span className={styles.selection} data-placeholder={!label}>
          {loading ? "Carregando…" : label || placeholder}
        </span>
        <Select.Icon className={styles.icon}>
          {loading ? <LoaderCircle size={16} aria-hidden="true" /> : <ChevronsUpDown size={16} aria-hidden="true" />}
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          className={styles.positioner}
          align="start"
          sideOffset={5}
          collisionPadding={12}
          alignItemWithTrigger={false}
        >
          <Select.Popup className={styles.popup}>
            <Select.List className={styles.list}>
              {!options.length && (
                <div className={styles.empty} role="status">
                  {emptyMessage}
                </div>
              )}
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  data-option-value={option.value}
                  className={styles.option}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className={styles.indicator}>
                    <Check size={16} aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
