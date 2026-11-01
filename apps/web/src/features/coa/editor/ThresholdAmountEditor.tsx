import { useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { brl } from "@/lib/format";
import { cents, decimal } from "../thresholds";
import styles from "./ThresholdAmountEditor.module.css";

export function ThresholdAmountEditor({
  name,
  value,
  minimum,
  maximum,
  domainMaximum = false,
  disabled,
  serverError,
  onConfirm,
  onOpenChange,
}: {
  name: string;
  value: bigint;
  minimum: bigint;
  maximum: bigint;
  domainMaximum?: boolean;
  disabled?: boolean;
  serverError?: string;
  onConfirm: (value: bigint) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false),
    [text, setText] = useState(decimal(value));
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  function changeOpen(next: boolean) {
    if (next) {
      setText(decimal(value));
      setError(serverError ?? "");
    }
    setOpen(next);
    onOpenChange(next);
  }
  function confirm() {
    const parsed = cents(text.trim().replace(",", "."));
    if (parsed === null) {
      setError("Use um valor válido com até 16 dígitos inteiros e 2 casas decimais.");
      input.current?.focus();
      return;
    }
    if (parsed < minimum || parsed > maximum) {
      setError(
        domainMaximum
          ? `Informe um valor a partir de ${brl(decimal(minimum))}.`
          : `Informe um valor de ${brl(decimal(minimum))} até ${brl(decimal(maximum))}.`,
      );
      input.current?.focus();
      return;
    }
    onConfirm(parsed);
    changeOpen(false);
  }
  return (
    <Popover.Root modal open={open} onOpenChange={changeOpen}>
      <Popover.Trigger
        type="button"
        disabled={disabled}
        className={styles.trigger}
        aria-label={`Editar limite após ${name}: ${brl(decimal(value))}`}
        aria-invalid={!!serverError}
        aria-description={serverError || "Clique para informar o valor exato."}
      >
        {brl(decimal(value))}
        <Pencil size={12} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Backdrop className={styles.backdrop} />
        <Popover.Positioner
          className={styles.positioner}
          side="top"
          align="center"
          sideOffset={8}
          collisionPadding={12}
        >
          <Popover.Popup className={styles.popup} initialFocus={input}>
            <Popover.Title className={styles.title}>Editar limite</Popover.Title>
            <Popover.Close
              render={<Button type="button" variant="ghost" size="icon-sm" className={styles.close} />}
              aria-label="Fechar"
            >
              <X aria-hidden="true" />
            </Popover.Close>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                confirm();
              }}
              noValidate
            >
              <MoneyInput
                ref={input}
                label={`Limite após ${name} (R$)`}
                value={text}
                onValueChange={(next) => {
                  setText(next);
                  setError("");
                }}
                minimum={decimal(minimum)}
                maximum={domainMaximum ? undefined : decimal(maximum)}
                error={error}
                onFocus={(event) => event.currentTarget.select()}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Confirmar ajusta apenas o rascunho. Publique a alçada para aplicar.
              </p>
              <div className={styles.actions}>
                <Popover.Close render={<Button type="button" variant="outline" />}>Cancelar</Popover.Close>
                <Button type="submit">Confirmar</Button>
              </div>
            </form>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
