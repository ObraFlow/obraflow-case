"use client";

import { useRef, useState } from "react";
import { useFormState, type FieldArrayWithId, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { centavosDeTexto, formatarCentavos, textoDeCentavos } from "@/lib/money";
import type { PedidoFormInput } from "@/lib/schemas/pedido";
import { cn } from "@/lib/utils";

const UNIDADES_SUGERIDAS = ["un", "kg", "m", "m²", "m³", "sc", "L", "h"];

/**
 * Abaixo de `lg`: duas colunas (descrição inteira; quantidade + unidade; preço + total).
 * `minmax(0,1fr)` em vez de `1fr`: a largura mínima intrínseca do <input> (uns 170px) não
 * pode virar a largura mínima da coluna, senão a segunda coluna sai da tela no celular.
 */
const COLUNAS =
  "grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_110px_90px_140px_130px_80px] lg:items-start lg:gap-x-3";

const CLASSE_ROTULO = "text-xs font-semibold text-muted-foreground lg:sr-only";

/**
 * Itens do pedido: um grid que é tabela no desktop e blocos de duas colunas no celular, com
 * o MESMO markup (um input por campo, como o react-hook-form espera). Total do item é só
 * leitura, calculado pelo domínio; o server recalcula e persiste.
 *
 * O item adicionado depois da primeira renderização entra com `linha-entra` (docs/design.md
 * > Movimento): os ids que existiam ao montar são "conhecidos"; qualquer outro é novo.
 * O preço é reescrito ao sair do campo ("1500" → "1.500,00"), para o valor entendido ficar
 * visível antes de enviar.
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
  const [idsIniciais] = useState(() => new Set(itens.map((campo) => campo.id)));
  const botaoAdicionar = useRef<HTMLButtonElement>(null);

  const formatarPreco = (indice: number, texto: string) => {
    const cents = centavosDeTexto(texto);
    if (cents === null || cents < 0) return;
    form.setValue(`itens.${indice}.precoUnitario`, textoDeCentavos(cents), {
      shouldValidate: true,
    });
  };

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
        const numero = indice + 1;
        const id = (nome: string) => `item-${indice}-${nome}`;
        return (
          <div
            key={campo.id}
            className={cn(
              "grid gap-3 border-b border-linha pb-3",
              COLUNAS,
              !idsIniciais.has(campo.id) && "anima-linha-entra-a",
            )}
          >
            <span className="col-span-2 text-xs font-semibold text-muted-foreground lg:hidden">
              Item {numero}
            </span>

            <Field
              className="col-span-2 gap-1 lg:col-span-1"
              data-invalid={!!erro?.descricao || undefined}
            >
              <FieldLabel htmlFor={id("descricao")} className={CLASSE_ROTULO}>
                Descrição do item {numero}
              </FieldLabel>
              <Input
                id={id("descricao")}
                placeholder="Ex.: Cimento CP-II 50 kg"
                aria-invalid={!!erro?.descricao || undefined}
                className="h-[38px] rounded-sm"
                {...form.register(`itens.${indice}.descricao` as const)}
              />
              <FieldError errors={[erro?.descricao]} />
            </Field>

            <Field className="min-w-0 gap-1" data-invalid={!!erro?.quantidade || undefined}>
              <FieldLabel htmlFor={id("quantidade")} className={CLASSE_ROTULO}>
                Quantidade do item {numero}
              </FieldLabel>
              <Input
                id={id("quantidade")}
                inputMode="decimal"
                placeholder="Ex.: 2,5"
                aria-invalid={!!erro?.quantidade || undefined}
                className="h-[38px] rounded-sm tabular-nums"
                {...form.register(`itens.${indice}.quantidade` as const)}
              />
              <FieldError errors={[erro?.quantidade]} />
            </Field>

            <Field className="min-w-0 gap-1" data-invalid={!!erro?.unidade || undefined}>
              <FieldLabel htmlFor={id("unidade")} className={CLASSE_ROTULO}>
                Unidade do item {numero}
              </FieldLabel>
              <Input
                id={id("unidade")}
                list="unidades-sugeridas"
                placeholder="un"
                aria-invalid={!!erro?.unidade || undefined}
                className="h-[38px] rounded-sm"
                {...form.register(`itens.${indice}.unidade` as const)}
              />
              <FieldError errors={[erro?.unidade]} />
            </Field>

            <Field className="min-w-0 gap-1" data-invalid={!!erro?.precoUnitario || undefined}>
              <FieldLabel htmlFor={id("preco")} className={CLASSE_ROTULO}>
                Preço unitário do item {numero} (R$)
              </FieldLabel>
              <Input
                id={id("preco")}
                inputMode="decimal"
                placeholder="Ex.: 34,90"
                aria-invalid={!!erro?.precoUnitario || undefined}
                className="h-[38px] rounded-sm text-right tabular-nums"
                {...form.register(`itens.${indice}.precoUnitario` as const, {
                  onBlur: (evento) => formatarPreco(indice, evento.target.value),
                })}
              />
              <FieldError errors={[erro?.precoUnitario]} />
            </Field>

            <div className="flex min-w-0 flex-col justify-end gap-1 text-sm lg:h-[38px] lg:items-end lg:justify-center">
              <span className="text-xs font-semibold text-muted-foreground lg:sr-only">
                Total do item {numero}
              </span>
              <output
                className="flex h-[38px] items-center font-medium tabular-nums lg:h-auto"
                aria-live="polite"
              >
                {total === null ? (
                  <span className="text-muted-foreground">Preencha o item</span>
                ) : (
                  formatarCentavos(total)
                )}
              </output>
            </div>

            <div className="col-span-2 flex flex-col gap-1 lg:col-span-1 lg:items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-fit lg:h-[38px]"
                disabled={unico}
                onClick={() => {
                  aoRemover(indice);
                  // O botão clicado some com a linha; o foco vai para um lugar estável.
                  botaoAdicionar.current?.focus();
                }}
                aria-label={`Remover item ${numero}`}
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
          ref={botaoAdicionar}
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
