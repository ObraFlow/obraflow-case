"use client";

import type { FieldError as ErroDeCampo, UseFormRegisterReturn } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

/** Campo do motivo da rejeição, com contador. Usado pelo dialog de rejeitar e pelo de decidir. */
export function CampoMotivo({
  id,
  registro,
  erro,
  valor,
  autoFocus,
}: {
  id: string;
  registro: UseFormRegisterReturn;
  erro?: ErroDeCampo;
  valor: string;
  autoFocus?: boolean;
}) {
  return (
    <Field data-invalid={!!erro || undefined}>
      <FieldLabel htmlFor={id}>Motivo da rejeição</FieldLabel>
      <Textarea
        id={id}
        rows={3}
        autoFocus={autoFocus}
        placeholder="Ex.: quantidade acima do previsto no orçamento desta etapa"
        aria-invalid={!!erro || undefined}
        className="min-h-20 rounded-sm"
        {...registro}
      />
      <div className="flex justify-between gap-2">
        <FieldError errors={[erro]} />
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {valor.length}/500
        </span>
      </div>
    </Field>
  );
}
