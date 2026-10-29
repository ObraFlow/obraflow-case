"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ObraDto } from "@/lib/dto";

/**
 * A obra escolhida vive na URL (`/regras?obra=1`): link compartilhável, botão voltar
 * funciona e a página (RSC) carrega as faixas certas sem estado no client.
 * `useTransition` desabilita o select enquanto as faixas da outra obra não chegam;
 * `replace` porque trocar de obra é trocar de contexto, não empilhar histórico.
 */
export function SeletorObra({ obras, obraId }: { obras: ObraDto[]; obraId: number }) {
  const router = useRouter();
  const [navegando, iniciarNavegacao] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      Obra
      <select
        value={obraId}
        disabled={navegando}
        aria-busy={navegando || undefined}
        onChange={(evento) => {
          const destino = `/regras?obra=${evento.target.value}`;
          iniciarNavegacao(() => router.replace(destino));
        }}
        className="h-[38px] max-w-72 rounded-sm border border-input bg-card pr-7 pl-2 text-sm text-foreground transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
      >
        {obras.map((obra) => (
          <option key={obra.id} value={obra.id}>
            {obra.nome}
          </option>
        ))}
      </select>
    </label>
  );
}
