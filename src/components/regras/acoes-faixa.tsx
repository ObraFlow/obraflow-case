"use client";

import { useState } from "react";
import { DialogFaixa } from "@/components/regras/dialog-faixa";
import { DialogRemoverFaixa } from "@/components/regras/dialog-remover-faixa";
import { Button } from "@/components/ui/button";
import type { RegraDto, UsuarioDto } from "@/lib/dto";

/** Botões "Editar" e "Remover" de uma linha da tabela, cada um com seu dialog. */
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

  return (
    <div className="flex justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 md:h-7"
        onClick={() => setEditando(true)}
      >
        Editar
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 md:h-7"
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
          aberto={editando}
          aoFechar={() => setEditando(false)}
        />
      )}
      {removendo && (
        <DialogRemoverFaixa faixa={faixa} aberto={removendo} aoFechar={() => setRemovendo(false)} />
      )}
    </div>
  );
}
