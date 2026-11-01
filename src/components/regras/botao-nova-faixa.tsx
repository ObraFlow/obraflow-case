"use client";

import { useState } from "react";
import { DialogFaixa } from "@/components/regras/dialog-faixa";
import { Button } from "@/components/ui/button";
import type { RegraDto, UsuarioDto } from "@/lib/dto";

export function BotaoNovaFaixa({
  obraId,
  faixas,
  usuarios,
  rotulo = "Nova faixa",
  rotuloAcessivel,
  variante = "default",
  sugestao,
}: {
  obraId: number;
  faixas: RegraDto[];
  usuarios: UsuarioDto[];
  rotulo?: string;
  /** Nome para leitor de tela quando o mesmo rótulo se repete na página (uma lacuna por linha). */
  rotuloAcessivel?: string;
  variante?: "default" | "outline";
  /** Preenche mínimo e máximo (ex.: a lacuna que o usuário quer fechar). */
  sugestao?: { minCents: number; maxCents: number | null };
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variante}
        size={variante === "outline" ? "sm" : "default"}
        className={variante === "outline" ? "h-10 md:h-7" : undefined}
        aria-label={rotuloAcessivel}
        onClick={() => setAberto(true)}
      >
        {rotulo}
      </Button>
      {aberto && (
        <DialogFaixa
          obraId={obraId}
          faixas={faixas}
          usuarios={usuarios}
          sugestao={sugestao}
          aoFechar={() => setAberto(false)}
        />
      )}
    </>
  );
}
