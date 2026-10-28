"use client";

import { useEffect, useState } from "react";
import { mensagemDeErro } from "@/lib/api/client";
import { previewAlcada } from "@/lib/api/regras";
import type { FaixaAplicavelDto } from "@/lib/dto";

export type EstadoPreview =
  | { estado: "aguardando" }
  | { estado: "carregando" }
  | { estado: "pronto"; resultado: FaixaAplicavelDto }
  | { estado: "erro"; mensagem: string };

type Resposta = { chave: string; resultado: FaixaAplicavelDto } | { chave: string; erro: string };

/**
 * Preview da alçada para (obra, total): chama GET /api/regras/aplicavel via ky com 300 ms
 * de espera depois da última mudança. A resposta fica amarrada à chave consultada, então
 * uma resposta atrasada de um total antigo nunca aparece. Só a resposta da rede é estado.
 */
export function usePreviewAlcada(obraId: number | null, totalCents: number | null) {
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const chave = obraId !== null && totalCents !== null ? `${obraId}:${totalCents}` : null;

  useEffect(() => {
    if (obraId === null || totalCents === null) return;

    let cancelado = false;
    const timer = setTimeout(async () => {
      const chaveConsulta = `${obraId}:${totalCents}`;
      try {
        const resultado = await previewAlcada(obraId, totalCents);
        if (!cancelado) setResposta({ chave: chaveConsulta, resultado });
      } catch (causa) {
        const erro = await mensagemDeErro(causa);
        if (!cancelado) setResposta({ chave: chaveConsulta, erro });
      }
    }, 300);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [obraId, totalCents, tentativa]);

  let preview: EstadoPreview;
  if (chave === null) preview = { estado: "aguardando" };
  else if (resposta === null || resposta.chave !== chave) preview = { estado: "carregando" };
  else if ("erro" in resposta) preview = { estado: "erro", mensagem: resposta.erro };
  else preview = { estado: "pronto", resultado: resposta.resultado };

  const tentarDeNovo = () => {
    setResposta(null);
    setTentativa((atual) => atual + 1);
  };

  return { preview, tentarDeNovo };
}
