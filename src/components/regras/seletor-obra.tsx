"use client";

import { useRouter } from "next/navigation";
import type { ObraDto } from "@/lib/dto";

/**
 * A obra escolhida vive na URL (`/regras?obra=1`): link compartilhável, botão voltar
 * funciona e a página (RSC) carrega as faixas certas sem estado no client.
 */
export function SeletorObra({ obras, obraId }: { obras: ObraDto[]; obraId: number }) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      Obra
      <select
        value={obraId}
        onChange={(evento) => router.push(`/regras?obra=${evento.target.value}`)}
        className="h-[38px] max-w-72 rounded-sm border border-input bg-card pr-7 pl-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
