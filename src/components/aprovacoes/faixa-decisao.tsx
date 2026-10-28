"use client";

import { useState } from "react";
import { BotoesDecisao, type TipoDecisao } from "@/components/aprovacoes/botoes-decisao";
import { formatarData, formatarHora } from "@/lib/datas";
import type { PedidoDetalhe } from "@/lib/dto";
import { cn } from "@/lib/utils";

/**
 * A frase que explica por que os botões estão desabilitados, por caso (docs/design.md >
 * Faixa de decisão). Devolve null quando é a vez do usuário atual.
 */
function explicacao(pedido: PedidoDetalhe, usuarioAtualId: number | null): string | null {
  const ultimaDecidida = [...pedido.aprovacoes]
    .reverse()
    .find((aprovacao) => aprovacao.decididoEm !== null);
  const quando = ultimaDecidida?.decididoEm ? formatarData(ultimaDecidida.decididoEm) : null;

  if (pedido.status === "APROVADO") {
    return quando ? `Cadeia concluída em ${quando}.` : "Cadeia concluída.";
  }
  if (pedido.status === "REJEITADO") {
    const nome = ultimaDecidida?.aprovadorNome ?? "um aprovador";
    return quando ? `Rejeitado por ${nome} em ${quando}.` : `Rejeitado por ${nome}.`;
  }

  const atual = pedido.aprovadorAtualNome ?? "o próximo aprovador";
  if (usuarioAtualId === null) {
    return `Aguardando ${atual}. Escolha quem está agindo no seletor para decidir.`;
  }
  if (pedido.aprovadorAtualId === usuarioAtualId) return null;

  const minhaPosicao = pedido.aprovacoes.find((a) => a.aprovadorId === usuarioAtualId);
  if (!minhaPosicao) {
    return `Aguardando ${atual}. Você não faz parte da alçada deste pedido.`;
  }
  if (minhaPosicao.status === "APROVADA") return `Você já aprovou. Aguardando ${atual}.`;
  return `Aguardando ${atual}. Você decide no nível ${minhaPosicao.ordem + 1} de ${pedido.totalNiveis}.`;
}

/**
 * Barra no topo do detalhe. Amarela com os botões quando é a vez do usuário atual; neutra,
 * com os botões desabilitados e a frase explicando, em todos os outros casos. Depois de
 * decidir aqui, recolhe para neutra e diz a hora: o resto da página chega revalidado do server.
 */
export function FaixaDecisao({
  pedido,
  usuarioAtualId,
}: {
  pedido: PedidoDetalhe;
  usuarioAtualId: number | null;
}) {
  const [decisao, setDecisao] = useState<{ tipo: TipoDecisao; em: string } | null>(null);

  const frase = explicacao(pedido, usuarioAtualId);
  const suaVez = frase === null && decisao === null;

  const texto = decisao
    ? `Você ${decisao.tipo === "APROVAR" ? "aprovou" : "rejeitou"} às ${formatarHora(decisao.em)}.`
    : (frase ?? "É a sua vez de decidir este pedido.");

  return (
    <section
      aria-label="Decisão"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-sm px-5 py-3",
        suaVez ? "bg-sinalizacao text-foreground" : "bg-muted",
        decisao && "anima-faixa-recolhe",
      )}
    >
      <p className={cn("text-sm", suaVez ? "font-bold" : "font-medium")} aria-live="polite">
        {texto}
      </p>
      <BotoesDecisao
        pedidoId={pedido.id}
        desabilitado={!suaVez}
        aoDecidir={(tipo) => setDecisao({ tipo, em: new Date().toISOString() })}
      />
    </section>
  );
}
