"use client";

import { useState } from "react";
import { DialogFaixa } from "@/components/regras/dialog-faixa";
import { DialogRemoverFaixa } from "@/components/regras/dialog-remover-faixa";
import { Button } from "@/components/ui/button";
import type { RegraDto, UsuarioDto } from "@/lib/dto";
import { formatarFaixa } from "@/lib/money";

/**
 * Botões "Editar" e "Remover" de uma linha da tabela, cada um com seu dialog. O nome
 * acessível inclui a faixa, porque a tabela repete os mesmos dois botões em cada linha.
 * "Remover" é destrutivo e fica em vermelho, como o "Rejeitar" do detalhe do pedido.
 */
export function AcoesFaixa({
  faixa,
  faixas,
  usuarios,
}: {
  faixa: RegraDto;
  faixas: RegraDto[];
  usuarios: UsuarioDto[];
}) {
  const [editando, setEditando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const descricaoFaixa = formatarFaixa(faixa.minCents, faixa.maxCents);

  return (
    <div className="flex justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 md:h-7"
        aria-label={`Editar faixa ${descricaoFaixa}`}
        onClick={() => setEditando(true)}
      >
        Editar
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 text-rejeitado hover:text-rejeitado md:h-7"
        aria-label={`Remover faixa ${descricaoFaixa}`}
        onClick={() => setRemovendo(true)}
      >
        Remover
      </Button>
      {editando && (
        <DialogFaixa
          obraId={faixa.obraId}
          usuarios={usuarios}
          faixas={faixas}
          faixa={faixa}
          aoFechar={() => setEditando(false)}
        />
      )}
      {removendo && <DialogRemoverFaixa faixa={faixa} aoFechar={() => setRemovendo(false)} />}
    </div>
  );
}
