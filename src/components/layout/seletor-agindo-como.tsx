"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import type { UsuarioDto } from "@/lib/dto";
import { agirComoAction } from "@/server/actions/usuario";

/**
 * <select> nativo: acessível por teclado, funciona antes da hidratação e não precisa
 * de componente extra. Ao trocar, chama a action que grava o cookie e revalida o layout.
 *
 * O select é não controlado (`defaultValue`): a escolha do usuário aparece na hora, sem
 * esperar a revalidação. A `key` remonta o select quando o server manda outro usuário
 * (revalidação, outra aba) ou quando a action falha, voltando ao valor que vale no cookie.
 */
export function SeletorAgindoComo({
  usuarios,
  usuarioAtualId,
}: {
  usuarios: UsuarioDto[];
  usuarioAtualId: number | null;
}) {
  const [tentativasComErro, setTentativasComErro] = useState(0);

  const { execute, isPending } = useAction(agirComoAction, {
    onError({ error }) {
      toast.error(error.serverError ?? "Não foi possível trocar o usuário. Tente novamente.");
      setTentativasComErro((atual) => atual + 1);
    },
  });

  return (
    <div className="flex items-center gap-2">
      {/* No celular o rótulo encurta para "Como", para o seletor caber ao lado da marca;
          o nome completo continua para o leitor de tela. */}
      <label
        htmlFor="agindo-como"
        className="text-sm whitespace-nowrap text-white/75 max-sm:text-xs"
      >
        <span className="sm:hidden" aria-hidden="true">
          Como
        </span>
        <span className="max-sm:sr-only">Agindo como</span>
      </label>
      <select
        key={`${usuarioAtualId ?? "nenhum"}-${tentativasComErro}`}
        id="agindo-como"
        defaultValue={usuarioAtualId === null ? "" : String(usuarioAtualId)}
        disabled={isPending}
        aria-busy={isPending}
        onChange={(evento) => execute({ usuarioId: Number(evento.target.value) })}
        className="h-10 max-w-40 rounded-sm border border-white/30 bg-card pr-7 pl-2 text-sm text-foreground transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60 sm:h-8 sm:max-w-48"
      >
        <option value="" disabled>
          Selecione quem você é
        </option>
        {usuarios.map((usuario) => (
          <option key={usuario.id} value={usuario.id}>
            {usuario.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
