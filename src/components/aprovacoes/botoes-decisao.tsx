"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DialogRejeitar } from "@/components/aprovacoes/dialog-rejeitar";
import { avisarPendenciasMudaram } from "@/components/layout/sino-pendencias";
import { Button } from "@/components/ui/button";
import type { PedidoDetalhe } from "@/lib/dto";
import { cn } from "@/lib/utils";
import { registrarDecisaoAction } from "@/server/actions/decisoes";

export type TipoDecisao = "APROVAR" | "REJEITAR";

function mensagemDeSucesso(tipo: TipoDecisao, pedido: PedidoDetalhe): string {
  if (tipo === "REJEITAR") return `Pedido #${pedido.id} rejeitado.`;
  if (pedido.status === "APROVADO") return `Pedido #${pedido.id} aprovado. Cadeia concluída.`;
  return `Pedido #${pedido.id} aprovado. Agora aguarda ${pedido.aprovadorAtualNome}.`;
}

/**
 * Aprovar e Rejeitar da faixa do detalhe (a linha da lista usa o DialogDecisao). Quem
 * renderiza decide se estão habilitados e escreve a explicação ao lado; aqui só há a ação.
 * Erros de domínio (não é a sua vez, passo já decidido, cadeia concluída) chegam como
 * `serverError` com a mensagem do service e viram toast. No sucesso a action revalida a
 * rota; no erro o client recarrega os dados, porque a página provavelmente está desatualizada.
 */
export function BotoesDecisao({
  pedidoId,
  desabilitado = false,
  aoDecidir,
}: {
  pedidoId: number;
  desabilitado?: boolean;
  aoDecidir?: (tipo: TipoDecisao, pedido: PedidoDetalhe) => void;
}) {
  const router = useRouter();
  const [dialogAberto, setDialogAberto] = useState(false);

  const { execute, isPending } = useAction(registrarDecisaoAction, {
    onSuccess({ data, input }) {
      toast.success(mensagemDeSucesso(input.tipo, data));
      avisarPendenciasMudaram();
      setDialogAberto(false);
      aoDecidir?.(input.tipo, data);
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Não foi possível registrar a decisão. Tente de novo.");
      // A recusa quase sempre significa que a página está desatualizada (outra pessoa decidiu
      // antes). Recarregar os dados mostra o estado real em vez de deixar o botão enganando.
      router.refresh();
    },
  });

  const travado = desabilitado || isPending;
  const classeBotao = "h-10 lg:h-[38px]";

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        className={cn("relative", classeBotao)}
        disabled={travado}
        onClick={() => execute({ pedidoId, tipo: "APROVAR" })}
      >
        {isPending && !dialogAberto ? "Aprovando…" : "Aprovar"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className={cn("relative text-rejeitado", classeBotao)}
        disabled={travado}
        onClick={() => setDialogAberto(true)}
      >
        Rejeitar
      </Button>

      {dialogAberto && (
        <DialogRejeitar
          pedidoId={pedidoId}
          aberto={dialogAberto}
          aoFechar={() => setDialogAberto(false)}
          confirmar={(motivo) => execute({ pedidoId, tipo: "REJEITAR", motivo })}
          enviando={isPending}
        />
      )}
    </div>
  );
}
