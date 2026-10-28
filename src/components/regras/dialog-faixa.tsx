"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { RegraDto, UsuarioDto } from "@/lib/dto";
import { centavosDeTexto, formatarFaixa, textoDeCentavos } from "@/lib/money";
import { faixaFormSchema, paraSalvarFaixaInput, type FaixaFormInput } from "@/lib/schemas/regra";
import { salvarFaixaAction } from "@/server/actions/regras";

type Props = {
  obraId: number;
  usuarios: UsuarioDto[];
  /** Todas as faixas da obra: para mostrar quem é herdado das faixas abaixo. */
  faixas: RegraDto[];
  /** Presente = editar esta faixa; ausente = criar. */
  faixa?: RegraDto;
  /** Ao criar a partir de uma lacuna: valores já preenchidos com o buraco. */
  sugestao?: { minCents: number; maxCents: number | null };
  aberto: boolean;
  aoFechar: () => void;
};

function valoresIniciais(
  obraId: number,
  faixa?: RegraDto,
  sugestao?: Props["sugestao"],
): FaixaFormInput {
  if (!faixa) {
    return {
      obraId,
      minimo: sugestao ? textoDeCentavos(sugestao.minCents) : "",
      maximo: sugestao?.maxCents != null ? textoDeCentavos(sugestao.maxCents) : "",
      semTeto: sugestao ? sugestao.maxCents === null : false,
      aprovadores: [{ usuarioId: "" }],
    };
  }
  return {
    id: faixa.id,
    obraId,
    minimo: textoDeCentavos(faixa.minCents),
    maximo: faixa.maxCents === null ? "" : textoDeCentavos(faixa.maxCents),
    semTeto: faixa.maxCents === null,
    aprovadores: faixa.niveis.map((nivel) => ({ usuarioId: String(nivel.usuarioId) })),
  };
}

/** Botões pequenos no desktop, mas com 40px de alvo de toque no celular. */
const CLASSE_BOTAO_LINHA = "h-10 md:h-7";

/**
 * Criar ou editar uma faixa. O form segura texto em reais (`faixaFormSchema`); no submit
 * `paraSalvarFaixaInput` converte para centavos e a action valida de novo com o contrato
 * da API. Erros de domínio (sobreposição, aprovador inexistente) voltam como `serverError`
 * e aparecem no Alert, porque a correção é aqui no form, não em um toast.
 * Reordenação por botões "Subir"/"Descer": teclado e celular, sem dependência de arrastar.
 */
export function DialogFaixa({
  obraId,
  usuarios,
  faixas,
  faixa,
  sugestao,
  aberto,
  aoFechar,
}: Props) {
  const [erroDoServidor, setErroDoServidor] = useState<string | null>(null);

  const form = useForm<FaixaFormInput>({
    resolver: zodResolver(faixaFormSchema),
    defaultValues: valoresIniciais(obraId, faixa, sugestao),
    mode: "onTouched",
  });
  const aprovadores = useFieldArray({ control: form.control, name: "aprovadores" });
  const semTeto = useWatch({ control: form.control, name: "semTeto" });
  const minimo = useWatch({ control: form.control, name: "minimo" });

  // Quem aprova antes desta faixa (decisão 1): aprovadores das faixas com mínimo abaixo do
  // mínimo digitado, em ordem crescente. Recalcula enquanto o usuário digita o mínimo.
  const minimoCents = centavosDeTexto(minimo) ?? 0;
  const herdados = faixas
    .filter((outra) => outra.id !== faixa?.id && outra.minCents < minimoCents)
    .sort((a, b) => a.minCents - b.minCents)
    .flatMap((outra) =>
      [...outra.niveis]
        .sort((a, b) => a.ordem - b.ordem)
        .map((nivel) => ({
          nome: nivel.usuarioNome,
          faixa: formatarFaixa(outra.minCents, outra.maxCents),
        })),
    );

  const { execute, isPending } = useAction(salvarFaixaAction, {
    onSuccess() {
      toast.success(faixa ? "Faixa atualizada." : "Faixa criada.");
      aoFechar();
    },
    onError({ error }) {
      setErroDoServidor(
        error.serverError ?? "Não foi possível salvar a faixa. Confira os campos e tente de novo.",
      );
    },
  });

  const enviar = form.handleSubmit((valores) => {
    setErroDoServidor(null);
    execute(paraSalvarFaixaInput(valores));
  });

  const erros = form.formState.errors;
  const faltando = !form.formState.isValid
    ? erros.aprovadores?.root?.message ||
      erros.aprovadores?.message ||
      "Preencha os valores e os aprovadores."
    : null;

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        if (!abrir) aoFechar();
      }}
    >
      <DialogContent className="rounded-sm sm:max-w-lg">
        <form
          onSubmit={(evento) => {
            setErroDoServidor(null);
            return enviar(evento);
          }}
          noValidate
          className="flex min-w-0 flex-col gap-5"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {faixa ? "Editar faixa" : "Nova faixa"}
            </DialogTitle>
            <DialogDescription>
              Pedidos com total dentro desta faixa passam primeiro por quem aprova as faixas abaixo
              e depois pelos aprovadores desta faixa, nesta ordem.
              {faixa ? " Pedidos já criados mantêm a cadeia que copiaram." : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!erros.minimo || undefined}>
              <FieldLabel htmlFor="faixa-minimo">Valor mínimo (R$)</FieldLabel>
              <Input
                id="faixa-minimo"
                inputMode="decimal"
                placeholder="0,00"
                aria-invalid={!!erros.minimo || undefined}
                className="h-[38px] rounded-sm tabular-nums"
                {...form.register("minimo")}
              />
              <FieldError errors={[erros.minimo]} />
            </Field>

            <Field data-invalid={!!erros.maximo || undefined}>
              <FieldLabel htmlFor="faixa-maximo">Valor máximo (R$)</FieldLabel>
              <Input
                id="faixa-maximo"
                inputMode="decimal"
                placeholder="10.000,00"
                disabled={semTeto}
                aria-invalid={!!erros.maximo || undefined}
                className="h-[38px] rounded-sm tabular-nums"
                {...form.register("maximo")}
              />
              <FieldError errors={[erros.maximo]} />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-foreground"
                  {...form.register("semTeto", {
                    onChange: () => form.clearErrors("maximo"),
                  })}
                />
                Sem teto (qualquer valor acima do mínimo)
              </label>
            </Field>
          </div>

          {/* Erro do service (sobreposição etc.) fica perto dos valores, que é o que precisa mudar. */}
          {erroDoServidor && (
            <Alert variant="destructive" className="rounded-sm border-rejeitado">
              <AlertTitle>Não foi possível salvar</AlertTitle>
              <AlertDescription>{erroDoServidor}</AlertDescription>
            </Alert>
          )}

          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">
              Aprovadores desta faixa, na ordem em que decidem
            </legend>
            {herdados.length > 0 && (
              <p className="mb-1 rounded-sm bg-muted px-3 py-2 text-sm">
                Antes destes, aprovam quem já aprova as faixas abaixo:{" "}
                {herdados.map((herdado, indice) => (
                  <span key={`${herdado.nome}-${indice}`}>
                    {indice > 0 ? ", " : ""}
                    <strong>{herdado.nome}</strong>{" "}
                    <span className="text-muted-foreground">({herdado.faixa})</span>
                  </span>
                ))}
                . Não repita essas pessoas aqui.
              </p>
            )}
            {aprovadores.fields.map((campo, indice) => {
              const erro = erros.aprovadores?.[indice]?.usuarioId;
              return (
                <div key={campo.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-sm font-bold text-muted-foreground tabular-nums">
                      {indice + 1}.
                    </span>
                    <select
                      aria-label={`Aprovador ${indice + 1}`}
                      aria-invalid={!!erro || undefined}
                      className="h-[38px] min-w-0 flex-1 rounded-sm border border-input bg-card pr-7 pl-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-invalid:border-destructive"
                      {...form.register(`aprovadores.${indice}.usuarioId` as const)}
                    >
                      <option value="">Selecione</option>
                      {usuarios.map((usuario) => (
                        <option key={usuario.id} value={usuario.id}>
                          {usuario.nome}
                          {usuario.cargo ? ` (${usuario.cargo})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <FieldError errors={[erro]} className="pl-8" />
                  {/* Ordem só existe a partir de dois aprovadores; com um, não há o que mover. */}
                  {aprovadores.fields.length > 1 && (
                    <div className="ml-8 flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={CLASSE_BOTAO_LINHA}
                        disabled={indice === 0}
                        onClick={() => aprovadores.move(indice, indice - 1)}
                        aria-label={`Subir aprovador ${indice + 1}`}
                      >
                        Subir
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={CLASSE_BOTAO_LINHA}
                        disabled={indice === aprovadores.fields.length - 1}
                        onClick={() => aprovadores.move(indice, indice + 1)}
                        aria-label={`Descer aprovador ${indice + 1}`}
                      >
                        Descer
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={CLASSE_BOTAO_LINHA}
                        onClick={() => aprovadores.remove(indice)}
                        aria-label={`Remover aprovador ${indice + 1}`}
                      >
                        Remover
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`w-fit ${CLASSE_BOTAO_LINHA}`}
              onClick={() => aprovadores.append({ usuarioId: "" })}
            >
              Adicionar aprovador
            </Button>
          </fieldset>

          <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            {faltando && form.formState.isSubmitted && (
              <p className="text-sm text-muted-foreground sm:mr-auto">{faltando}</p>
            )}
            <Button type="button" variant="outline" onClick={aoFechar} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : "Salvar faixa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
