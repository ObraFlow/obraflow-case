"use client";

import { useState } from "react";
import { DialogRejeitar } from "@/components/aprovacoes/dialog-rejeitar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Aprovar e Rejeitar da faixa do detalhe (a linha da lista usa o DialogDecisao). Quem
 * renderiza decide se estão habilitados, escreve a explicação ao lado e é dono da ação
 * (`useRegistrarDecisao` fica na FaixaDecisao, que precisa do `enviando` para se apagar).
 * Aqui só há os botões e o dialog de motivo.
 */
export function BotoesDecisao({
  pedidoId,
  desabilitado,
  enviando,
  aprovar,
  rejeitar,
}: {
  pedidoId: number;
  desabilitado: boolean;
  enviando: boolean;
  aprovar: (pedidoId: number) => void;
  rejeitar: (pedidoId: number, motivo: string) => void;
}) {
  const [dialogAberto, setDialogAberto] = useState(false);

  const travado = desabilitado || enviando;
  const classeBotao = "h-10 lg:h-[38px]";

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        className={cn("relative", classeBotao)}
        disabled={travado}
        onClick={() => aprovar(pedidoId)}
      >
        {enviando && !dialogAberto ? "Aprovando…" : "Aprovar"}
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
          aoFechar={() => setDialogAberto(false)}
          confirmar={(motivo) => rejeitar(pedidoId, motivo)}
          enviando={enviando}
        />
      )}
    </div>
  );
}
