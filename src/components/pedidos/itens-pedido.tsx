"use client";

import { useFormState, type FieldArrayWithId, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatarCentavos } from "@/lib/money";
import type { PedidoFormInput } from "@/lib/schemas/pedido";
import { cn } from "@/lib/utils";

const UNIDADES_SUGERIDAS = ["un", "kg", "m", "m²", "m³", "sc", "L", "h"];

const COLUNAS =
  "lg:grid-cols-[minmax(0,1fr)_110px_90px_140px_130px_80px] lg:items-start lg:gap-x-3";

/**
 * Itens do pedido: um grid que é tabela no desktop e blocos empilhados no celular, com o
 * MESMO markup (um input por campo, como o react-hook-form espera). Total do item é só
 * leitura, calculado pelo domínio; o server recalcula e persiste.
 */
export function ItensPedido({
  form,
  itens,
  totaisItensCents,
  aoAdicionar,
  aoRemover,
}: {
  form: UseFormReturn<PedidoFormInput>;
  itens: FieldArrayWithId<PedidoFormInput, "itens", "id">[];
  totaisItensCents: Array<number | null>;
  aoAdicionar: () => void;
  aoRemover: (indice: number) => void;
}) {
  const { errors } = useFormState({ control: form.control, name: "itens" });
  const erros = errors.itens;
  const unico = itens.length === 1;

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-2 text-lg font-bold">Itens do pedido</legend>

      <div
        className={cn(
          "hidden border-b-2 border-foreground pb-2 text-xs font-semibold text-muted-foreground lg:grid",
          COLUNAS,
        )}
        aria-hidden="true"
      >
        <span>Descrição</span>
        <span>Quantidade</span>
        <span>Unidade</span>
        <span className="text-right">Preço unitário (R$)</span>
        <span className="text-right">Total</span>
        <span className="w-20" />
      </div>

      {itens.map((campo, indice) => {
        const erro = erros?.[indice];
        const total = totaisItensCents[indice];
        return (
          <div
            key={campo.id}
            className={cn("grid grid-cols-1 gap-3 border-b border-linha pb-3", COLUNAS)}
          >
            <span className="text-xs font-semibold text-muted-foreground lg:hidden">
              Item {indice + 1}
            </span>
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
              <span className="lg:sr-only">Descrição</span>
              <Input
                placeholder="Ex.: Cimento CP-II 50 kg"
                aria-invalid={!!erro?.descricao || undefined}
                className="h-[38px] rounded-sm"
                {...form.register(`itens.${indice}.descricao` as const)}
              />
              <FieldError errors={[erro?.descricao]} />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
              <span className="lg:sr-only">Quantidade</span>
              <Input
                inputMode="decimal"
                placeholder="Ex.: 2,5"
                aria-invalid={!!erro?.quantidade || undefined}
                className="h-[38px] rounded-sm tabular-nums"
                {...form.register(`itens.${indice}.quantidade` as const)}
              />
              <FieldError errors={[erro?.quantidade]} />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
              <span className="lg:sr-only">Unidade</span>
              <Input
                list="unidades-sugeridas"
                placeholder="un"
                aria-invalid={!!erro?.unidade || undefined}
                className="h-[38px] rounded-sm"
                {...form.register(`itens.${indice}.unidade` as const)}
              />
              <FieldError errors={[erro?.unidade]} />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
              <span className="lg:sr-only">Preço unitário (R$)</span>
              <Input
                inputMode="decimal"
                placeholder="Ex.: 34,90"
                aria-invalid={!!erro?.precoUnitario || undefined}
                className="h-[38px] rounded-sm text-right tabular-nums"
                {...form.register(`itens.${indice}.precoUnitario` as const)}
              />
              <FieldError errors={[erro?.precoUnitario]} />
            </label>

            <div className="flex items-center justify-between gap-2 text-sm lg:h-[38px] lg:justify-end">
              <span className="font-medium lg:sr-only">Total do item</span>
              <output className="font-medium tabular-nums" aria-live="polite">
                {total === null ? (
                  <span className="text-muted-foreground">Preencha o item</span>
                ) : (
                  formatarCentavos(total)
                )}
              </output>
            </div>

            <div className="flex flex-col gap-1 lg:items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-fit lg:h-[38px]"
                disabled={unico}
                onClick={() => aoRemover(indice)}
                aria-label={`Remover item ${indice + 1}`}
              >
                Remover
              </Button>
              {unico && (
                <span className="text-xs text-muted-foreground lg:sr-only">
                  O pedido precisa de pelo menos um item.
                </span>
              )}
            </div>
          </div>
        );
      })}

      <datalist id="unidades-sugeridas">
        {UNIDADES_SUGERIDAS.map((unidade) => (
          <option key={unidade} value={unidade} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-10 w-fit lg:h-[38px]"
          onClick={aoAdicionar}
        >
          Adicionar item
        </Button>
        {unico && (
          <span className="hidden text-xs text-muted-foreground lg:inline">
            O pedido precisa de pelo menos um item; por isso o último não pode ser removido.
          </span>
        )}
      </div>
    </fieldset>
  );
}
