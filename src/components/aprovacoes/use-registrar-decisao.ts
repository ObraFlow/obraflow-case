"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { avisarPendenciasMudaram } from "@/components/layout/sino-pendencias";
import type { PedidoDetalhe } from "@/lib/dto";
import { registrarDecisaoAction } from "@/server/actions/decisoes";

export type TipoDecisao = "APROVAR" | "REJEITAR";

function mensagemDeSucesso(tipo: TipoDecisao, pedido: PedidoDetalhe): string {
  if (tipo === "REJEITAR") return `Pedido #${pedido.id} rejeitado.`;
  if (pedido.status === "APROVADO") return `Pedido #${pedido.id} aprovado. Cadeia concluída.`;
  return `Pedido #${pedido.id} aprovado. Agora aguarda ${pedido.aprovadorAtualNome}.`;
}

/**
 * Aprovar/Rejeitar, compartilhado pela faixa do detalhe e pelo dialog "Decidir" da lista.
 * Erros de domínio (não é a sua vez, passo já decidido, cadeia concluída) chegam como
 * `serverError` com a mensagem do service e viram toast. No sucesso a action já revalidou a
 * rota e o sino é avisado; no erro o client recarrega os dados, porque a página
 * provavelmente está desatualizada (outra pessoa decidiu antes).
 */
export function useRegistrarDecisao({
  aoConcluir,
  aoFalhar,
}: {
  aoConcluir?: (tipo: TipoDecisao, pedido: PedidoDetalhe) => void;
  aoFalhar?: () => void;
} = {}) {
  const router = useRouter();

  const { execute, isPending } = useAction(registrarDecisaoAction, {
    onSuccess({ data, input }) {
      toast.success(mensagemDeSucesso(input.tipo, data));
      avisarPendenciasMudaram();
      aoConcluir?.(input.tipo, data);
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Não foi possível registrar a decisão. Tente de novo.");
      router.refresh();
      aoFalhar?.();
    },
  });

  return {
    aprovar: (pedidoId: number) => execute({ pedidoId, tipo: "APROVAR" }),
    rejeitar: (pedidoId: number, motivo: string) => execute({ pedidoId, tipo: "REJEITAR", motivo }),
    enviando: isPending,
  };
}
