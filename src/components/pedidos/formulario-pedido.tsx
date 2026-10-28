"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useFormState, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ItensPedido } from "@/components/pedidos/itens-pedido";
import { PreviewAlcada } from "@/components/pedidos/preview-alcada";
import { usePreviewAlcada } from "@/components/pedidos/use-preview-alcada";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FornecedorDto, ObraDto } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";
import {
  paraCriarPedidoInput,
  pedidoFormSchema,
  type ItemPedidoFormInput,
  type PedidoFormInput,
} from "@/lib/schemas/pedido";
import { totaisParaExibicao } from "@/lib/totais";
import { criarPedidoAction } from "@/server/actions/pedidos";

const ITEM_EM_BRANCO: ItemPedidoFormInput = {
  descricao: "",
  quantidade: "",
  unidade: "",
  precoUnitario: "",
};

/** "AAAA-MM-DD" de hoje no fuso do browser (valor nativo do <input type="date">). */
function hojeIso(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

const CLASSE_SELECT =
  "h-[38px] w-full rounded-sm border border-input bg-card pr-7 pl-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none aria-invalid:border-destructive";

/**
 * Formulário de novo pedido. Texto em reais no form (`pedidoFormSchema`); no submit
 * `paraCriarPedidoInput` converte para centavos e a action (`criarPedidoSchema`) valida de
 * novo e recalcula os totais no server. O total e o preview da alçada aqui são só exibição.
 * Botão desabilitado enquanto há campo inválido ou valor sem faixa, com a frase do que falta.
 */
export function FormularioPedido({
  obras,
  fornecedores,
}: {
  obras: ObraDto[];
  fornecedores: FornecedorDto[];
}) {
  const router = useRouter();
  const [erroDoServidor, setErroDoServidor] = useState<string | null>(null);

  const form = useForm<PedidoFormInput>({
    resolver: zodResolver(pedidoFormSchema),
    mode: "onChange",
    defaultValues: {
      obraId: obras.length === 1 ? String(obras[0].id) : "",
      fornecedorId: fornecedores.length === 1 ? String(fornecedores[0].id) : "",
      dataPedido: "",
      observacoes: "",
      itens: [ITEM_EM_BRANCO],
    },
  });
  const itens = useFieldArray({ control: form.control, name: "itens" });

  // A data de hoje é preenchida depois de montar, no fuso do browser, para não haver
  // diferença entre o que o server renderizou e o que o client calcula.
  useEffect(() => {
    if (form.getValues("dataPedido") === "") form.setValue("dataPedido", hojeIso());
  }, [form]);

  const obraId = useWatch({ control: form.control, name: "obraId" });
  const itensDigitados = useWatch({ control: form.control, name: "itens" });
  const observacoes = useWatch({ control: form.control, name: "observacoes" });

  const totais = totaisParaExibicao(itensDigitados ?? []);
  const obraIdNumero = /^[1-9]\d*$/.test(obraId) ? Number(obraId) : null;
  const { preview, tentarDeNovo } = usePreviewAlcada(
    obraIdNumero,
    totais.completo ? totais.totalPedidoCents : null,
  );

  const { execute, isPending } = useAction(criarPedidoAction, {
    onSuccess({ data }) {
      toast.success(`Pedido #${data.pedidoId} criado: ${formatarCentavos(data.totalCents)}.`);
      router.push("/aprovacoes");
    },
    onError({ error }) {
      setErroDoServidor(
        error.serverError ?? "Não foi possível criar o pedido. Confira os campos e tente de novo.",
      );
    },
  });

  const enviar = form.handleSubmit((valores) => execute(paraCriarPedidoInput(valores)));

  // useFormState assina errors/isValid de verdade; ler form.formState direto não re-renderiza.
  const { errors: erros, isValid } = useFormState({ control: form.control });
  const itensComErro = Array.isArray(erros.itens) ? erros.itens.filter(Boolean).length : 0;
  const temFaixa = preview.estado === "pronto" && preview.resultado.faixa !== null;

  // O que ainda falta, na ordem em que o usuário preenche. Uma frase só.
  let faltando: string | null = null;
  if (!obraId) faltando = "Escolha a obra.";
  else if (erros.fornecedorId || !form.getValues("fornecedorId"))
    faltando = "Escolha o fornecedor.";
  else if (erros.dataPedido) faltando = "Informe a data do pedido.";
  else if (itensComErro > 0)
    faltando = itensComErro === 1 ? "1 item com erro." : `${itensComErro} itens com erro.`;
  else if (!totais.completo) faltando = "Preencha todos os itens.";
  else if (preview.estado === "carregando") faltando = "Verificando a alçada…";
  else if (preview.estado === "erro") faltando = "Não foi possível verificar a alçada.";
  else if (!temFaixa) faltando = "Sem faixa de alçada para este valor.";

  const podeEnviar = faltando === null && isValid && !isPending;

  return (
    <form
      onSubmit={(evento) => {
        setErroDoServidor(null);
        return enviar(evento);
      }}
      noValidate
      className="flex min-w-0 flex-col gap-6 rounded-sm border bg-card px-6 py-5"
    >
      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-3 text-lg font-bold">Dados gerais</legend>

        <Field data-invalid={!!erros.obraId || undefined}>
          <FieldLabel htmlFor="pedido-obra">Obra</FieldLabel>
          <select
            id="pedido-obra"
            aria-invalid={!!erros.obraId || undefined}
            className={CLASSE_SELECT}
            {...form.register("obraId")}
          >
            <option value="">Selecione a obra</option>
            {obras.map((obra) => (
              <option key={obra.id} value={obra.id}>
                {obra.nome}
              </option>
            ))}
          </select>
          <FieldError errors={[erros.obraId]} />
        </Field>

        <Field data-invalid={!!erros.fornecedorId || undefined}>
          <FieldLabel htmlFor="pedido-fornecedor">Fornecedor</FieldLabel>
          <select
            id="pedido-fornecedor"
            aria-invalid={!!erros.fornecedorId || undefined}
            className={CLASSE_SELECT}
            {...form.register("fornecedorId")}
          >
            <option value="">Selecione o fornecedor</option>
            {fornecedores.map((fornecedor) => (
              <option key={fornecedor.id} value={fornecedor.id}>
                {fornecedor.nome}
                {fornecedor.cnpj ? ` (${fornecedor.cnpj})` : ""}
              </option>
            ))}
          </select>
          <FieldError errors={[erros.fornecedorId]} />
        </Field>

        <Field data-invalid={!!erros.dataPedido || undefined}>
          <FieldLabel htmlFor="pedido-data">Data do pedido</FieldLabel>
          <Input
            id="pedido-data"
            type="date"
            aria-invalid={!!erros.dataPedido || undefined}
            className="h-[38px] w-fit rounded-sm"
            {...form.register("dataPedido")}
          />
          <FieldError errors={[erros.dataPedido]} />
        </Field>

        <Field data-invalid={!!erros.observacoes || undefined}>
          <FieldLabel htmlFor="pedido-observacoes">Observações internas (opcional)</FieldLabel>
          <Textarea
            id="pedido-observacoes"
            rows={2}
            placeholder="Ex.: reposição de estoque para a concretagem da laje do bloco B"
            aria-invalid={!!erros.observacoes || undefined}
            className="min-h-[38px] rounded-sm"
            {...form.register("observacoes")}
          />
          <div className="flex justify-between gap-2">
            <FieldError errors={[erros.observacoes]} />
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {(observacoes ?? "").length}/1000
            </span>
          </div>
        </Field>
      </fieldset>

      <ItensPedido
        form={form}
        itens={itens.fields}
        totaisItensCents={totais.totaisItensCents}
        aoAdicionar={() => itens.append(ITEM_EM_BRANCO)}
        aoRemover={(indice) => itens.remove(indice)}
      />

      <div className="flex flex-col gap-4 border-t-2 border-foreground pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 lg:pr-[92px]">
          <span className="text-sm font-medium">Total do pedido</span>
          <output className="text-xl font-bold tabular-nums" aria-live="polite">
            {formatarCentavos(totais.totalPedidoCents)}
            {!totais.completo && totais.totaisItensCents.some((total) => total !== null) && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                (parcial: há itens sem total)
              </span>
            )}
          </output>
        </div>

        <PreviewAlcada preview={preview} obraId={obraIdNumero} tentarDeNovo={tentarDeNovo} />

        {erroDoServidor && (
          <Alert variant="destructive" className="rounded-sm border-rejeitado">
            <AlertTitle>Não foi possível criar o pedido</AlertTitle>
            <AlertDescription>{erroDoServidor}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
          {faltando && <p className="text-sm text-muted-foreground sm:mr-auto">{faltando}</p>}
          <Button type="submit" className="h-10 lg:h-[38px]" disabled={!podeEnviar}>
            {isPending ? "Cadastrando…" : "Cadastrar pedido"}
          </Button>
        </div>
      </div>
    </form>
  );
}
