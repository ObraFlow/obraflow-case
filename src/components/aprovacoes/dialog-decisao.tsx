"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useFormState, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { CampoMotivo } from "@/components/aprovacoes/campo-motivo";
import { CadeiaAlcada } from "@/components/alcada/cadeia-alcada";
import { avisarPendenciasMudaram } from "@/components/layout/sino-pendencias";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { mensagemDeErro } from "@/lib/api/client";
import { obterPedido } from "@/lib/api/pedidos";
import { niveisDoPedido } from "@/lib/cadeia";
import { formatarData } from "@/lib/datas";
import type { PedidoDetalhe, PedidoResumo } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";
import { rejeicaoFormSchema, type RejeicaoFormInput } from "@/lib/schemas/decisao";
import { registrarDecisaoAction } from "@/server/actions/decisoes";

type EstadoItens =
  | { estado: "carregando" }
  | { estado: "erro"; mensagem: string }
  | { estado: "pronto"; pedido: PedidoDetalhe };

/**
 * "Decidir" na linha da lista: um botão abre este dialog com o resumo do pedido, os itens
 * (lidos por ky em GET /api/pedidos/{id} ao abrir, o terceiro canal da arquitetura) e os
 * botões Aprovar / Rejeitar. Rejeitar revela o motivo no mesmo dialog. Quem aprova vários
 * pedidos por dia não precisa sair da lista, e ainda vê o que está aprovando.
 */
export function DialogDecisao({ pedido }: { pedido: PedidoResumo }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="relative h-10 md:h-8"
        onClick={() => setAberto(true)}
      >
        Decidir
      </Button>
      {aberto && <ConteudoDecisao pedido={pedido} aoFechar={() => setAberto(false)} />}
    </>
  );
}

function ConteudoDecisao({ pedido, aoFechar }: { pedido: PedidoResumo; aoFechar: () => void }) {
  const router = useRouter();
  const [itens, setItens] = useState<EstadoItens>({ estado: "carregando" });
  const [rejeitando, setRejeitando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    obterPedido(pedido.id)
      .then((detalhe) => {
        if (!cancelado) setItens({ estado: "pronto", pedido: detalhe });
      })
      .catch(async (causa: unknown) => {
        const mensagem = await mensagemDeErro(causa);
        if (!cancelado) setItens({ estado: "erro", mensagem });
      });
    return () => {
      cancelado = true;
    };
  }, [pedido.id]);

  const form = useForm<RejeicaoFormInput>({
    resolver: zodResolver(rejeicaoFormSchema),
    defaultValues: { motivo: "" },
    mode: "onChange",
  });
  const { errors: erros, isValid } = useFormState({ control: form.control });
  const motivo = useWatch({ control: form.control, name: "motivo" });

  const { execute, isPending } = useAction(registrarDecisaoAction, {
    onSuccess({ data, input }) {
      toast.success(
        input.tipo === "REJEITAR"
          ? `Pedido #${data.id} rejeitado.`
          : data.status === "APROVADO"
            ? `Pedido #${data.id} aprovado. Cadeia concluída.`
            : `Pedido #${data.id} aprovado. Agora aguarda ${data.aprovadorAtualNome}.`,
      );
      avisarPendenciasMudaram();
      aoFechar();
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Não foi possível registrar a decisão. Tente de novo.");
      router.refresh();
      aoFechar();
    },
  });

  const confirmarRejeicao = form.handleSubmit((valores) =>
    execute({ pedidoId: pedido.id, tipo: "REJEITAR", motivo: valores.motivo }),
  );

  return (
    <Dialog
      open
      onOpenChange={(abrir) => {
        if (!abrir && !isPending) aoFechar();
      }}
    >
      <DialogContent className="rounded-sm sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tabular-nums">
            Decidir o pedido #{pedido.id}
          </DialogTitle>
          <DialogDescription>
            {pedido.obraNome}. Fornecedor {pedido.fornecedorNome}, emitido em{" "}
            {formatarData(pedido.dataPedido)} por {pedido.criadoPorNome}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CadeiaAlcada niveis={niveisDoPedido(pedido)} />
            <span className="text-lg font-bold tabular-nums">
              {formatarCentavos(pedido.totalCents)}
            </span>
          </div>

          <ItensDoDialog estado={itens} />

          {rejeitando ? (
            <form
              id="form-rejeicao"
              onSubmit={confirmarRejeicao}
              noValidate
              className="flex flex-col gap-2 border-t border-linha pt-4"
            >
              <CampoMotivo
                id="decisao-motivo"
                registro={form.register("motivo")}
                erro={erros.motivo}
                valor={motivo ?? ""}
                autoFocus
              />
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Detalhes completos em{" "}
              <Link
                href={`/aprovacoes/${pedido.id}`}
                className="font-medium underline underline-offset-4"
              >
                abrir o pedido
              </Link>
              .
            </p>
          )}
        </div>

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {rejeitando ? (
            <>
              {!isValid && (
                <p className="text-sm text-muted-foreground sm:mr-auto">
                  Informe o motivo para rejeitar.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setRejeitando(false)}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                form="form-rejeicao"
                disabled={!isValid || isPending}
                className="bg-rejeitado text-white hover:bg-rejeitado/85"
              >
                {isPending ? "Rejeitando…" : "Confirmar rejeição"}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" disabled={isPending} onClick={aoFechar}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-rejeitado"
                disabled={isPending}
                onClick={() => setRejeitando(true)}
              >
                Rejeitar
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={() => execute({ pedidoId: pedido.id, tipo: "APROVAR" })}
              >
                {isPending ? "Aprovando…" : "Aprovar"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItensDoDialog({ estado }: { estado: EstadoItens }) {
  if (estado.estado === "carregando") {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Carregando itens">
        <Skeleton className="h-4 w-full rounded-sm" />
        <Skeleton className="h-4 w-4/5 rounded-sm" />
      </div>
    );
  }
  if (estado.estado === "erro") {
    return (
      <p className="text-sm text-rejeitado">
        Não foi possível carregar os itens: {estado.mensagem}
      </p>
    );
  }
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-foreground text-left text-xs font-semibold text-muted-foreground">
          <th className="py-1.5 pr-2">Item</th>
          <th className="py-1.5 pr-2 text-right whitespace-nowrap">Qtd.</th>
          <th className="py-1.5 text-right whitespace-nowrap">Total</th>
        </tr>
      </thead>
      <tbody>
        {estado.pedido.itens.map((item) => (
          <tr key={item.id} className="border-b border-linha last:border-b-0">
            <td className="py-1.5 pr-2">{item.descricao}</td>
            <td className="py-1.5 pr-2 text-right whitespace-nowrap tabular-nums">
              {item.quantidade.replace(".", ",")} {item.unidade}
            </td>
            <td className="py-1.5 text-right whitespace-nowrap tabular-nums">
              {formatarCentavos(item.totalCents)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
