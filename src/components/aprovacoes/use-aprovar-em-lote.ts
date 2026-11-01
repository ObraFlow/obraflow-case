"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { avisarPendenciasMudaram } from "@/components/layout/sino-pendencias";
import type { ResultadoLoteDto } from "@/lib/dto";
import { aprovarEmLoteAction } from "@/server/actions/decisoes";

/**
 * Aprova os pedidos marcados na lista. A action nunca falha por um pedido: cada um passa
 * ou entra em `falhas` com a mensagem do domínio, e os dois casos viram toast. Quando algo
 * falhou, a lista está desatualizada (outra pessoa decidiu antes), então recarrega.
 */
export function useAprovarEmLote({
  aoConcluir,
}: {
  aoConcluir?: (resultado: ResultadoLoteDto) => void;
} = {}) {
  const router = useRouter();

  const { execute, isPending } = useAction(aprovarEmLoteAction, {
    onSuccess({ data }) {
      const n = data.aprovados.length;
      if (n > 0) {
        toast.success(n === 1 ? "1 pedido aprovado." : `${n} pedidos aprovados.`);
      }
      if (data.falhas.length > 0) {
        toast.error(
          data.falhas.length === 1
            ? "1 pedido não foi aprovado."
            : `${data.falhas.length} pedidos não foram aprovados.`,
          { description: data.falhas.map((f) => `#${f.pedidoId}: ${f.mensagem}`).join(" ") },
        );
        router.refresh();
      }
      avisarPendenciasMudaram();
      aoConcluir?.(data);
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Não foi possível aprovar os pedidos. Tente de novo.");
      router.refresh();
    },
  });

  return {
    aprovar: (pedidoIds: number[]) => execute({ pedidoIds }),
    enviando: isPending,
  };
}
