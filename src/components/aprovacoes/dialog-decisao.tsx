"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm, useFormState, useWatch } from "react-hook-form";
import { CampoMotivo } from "@/components/aprovacoes/campo-motivo";
import { useRegistrarDecisao } from "@/components/aprovacoes/use-registrar-decisao";
import { CadeiaAlcada } from "@/components/alcada/cadeia-alcada";
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
import { formatarQuantidade } from "@/lib/quantidade";
import { rejeicaoFormSchema, type RejeicaoFormInput } from "@/lib/schemas/decisao";

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
        aria-label={`Decidir pedido #${pedido.id}`}
        onClick={() => setAberto(true)}
      >
        Decidir
      </Button>
      {aberto && <ConteudoDecisao pedido={pedido} aoFechar={() => setAberto(false)} />}
    </>
  );
}

function ConteudoDecisao({ pedido, aoFechar }: { pedido: PedidoResumo; aoFechar: () => void }) {
  const [itens, setItens] = useState<EstadoItens>({ estado: "carregando" });
  const [tentativa, setTentativa] = useState(0);
  const [rejeitando, setRejeitando] = useState(false);

  const tentarDeNovo = () => {
    setItens({ estado: "carregando" });
    setTentativa((atual) => atual + 1);
  };

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
  }, [pedido.id, tentativa]);

  const form = useForm<RejeicaoFormInput>({
    resolver: zodResolver(rejeicaoFormSchema),
    defaultValues: { motivo: "" },
    mode: "onChange",
  });
  const { errors: erros, isValid } = useFormState({ control: form.control });
  const motivo = useWatch({ control: form.control, name: "motivo" });

  // Sucesso ou erro, o dialog fecha: a lista chega revalidada (ou recarregada) do server.
  const { aprovar, rejeitar, enviando } = useRegistrarDecisao({
    aoConcluir: aoFechar,
    aoFalhar: aoFechar,
  });

  const confirmarRejeicao = form.handleSubmit((valores) => rejeitar(pedido.id, valores.motivo));

  return (
    <Dialog
      open
      onOpenChange={(abrir) => {
        if (!abrir && !enviando) aoFechar();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tabular-nums">
            Decidir o pedido #{pedido.id}
          </DialogTitle>
          <DialogDescription className="tabular-nums">
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

          <ItensDoDialog estado={itens} tentarDeNovo={tentarDeNovo} />

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
                disabled={enviando}
                onClick={() => setRejeitando(false)}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                form="form-rejeicao"
                disabled={!isValid || enviando}
                className="bg-rejeitado text-on-color hover:bg-rejeitado/85"
              >
                {enviando ? "Rejeitando…" : "Rejeitar pedido"}
              </Button>
            </>
          ) : (
            <>
              {/* Aprovar só depois de ver os itens; rejeitar pode, porque é o caminho
                  conservador e exige motivo. */}
              {itens.estado !== "pronto" && (
                <p className="text-sm text-muted-foreground sm:mr-auto">
                  {itens.estado === "carregando"
                    ? "Aprovar libera quando os itens carregarem."
                    : "Aprovar só com os itens carregados."}
                </p>
              )}
              <Button type="button" variant="ghost" disabled={enviando} onClick={aoFechar}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-rejeitado"
                disabled={enviando}
                onClick={() => setRejeitando(true)}
              >
                Rejeitar
              </Button>
              <Button
                type="button"
                disabled={enviando || itens.estado !== "pronto"}
                onClick={() => aprovar(pedido.id)}
              >
                {enviando ? "Aprovando…" : "Aprovar"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItensDoDialog({
  estado,
  tentarDeNovo,
}: {
  estado: EstadoItens;
  tentarDeNovo: () => void;
}) {
  if (estado.estado === "carregando") {
    return (
      <div
        role="status"
        className="flex flex-col gap-2"
        aria-busy="true"
        aria-label="Carregando itens"
      >
        <Skeleton className="h-4 w-full rounded-sm" />
        <Skeleton className="h-4 w-4/5 rounded-sm" />
      </div>
    );
  }
  if (estado.estado === "erro") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-rejeitado">
          Não foi possível carregar os itens: {estado.mensagem}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={tentarDeNovo}>
          Tentar novamente
        </Button>
      </div>
    );
  }
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-foreground text-left text-xs font-semibold text-muted-foreground">
          <th scope="col" className="py-1.5 pr-2">
            Item
          </th>
          <th scope="col" className="py-1.5 pr-2 text-right whitespace-nowrap">
            Qtd.
          </th>
          <th scope="col" className="py-1.5 text-right whitespace-nowrap">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {estado.pedido.itens.map((item) => (
          <tr key={item.id} className="border-b border-linha last:border-b-0">
            <td className="py-1.5 pr-2">{item.descricao}</td>
            <td className="py-1.5 pr-2 text-right whitespace-nowrap tabular-nums">
              {formatarQuantidade(item.quantidade)} {item.unidade}
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
