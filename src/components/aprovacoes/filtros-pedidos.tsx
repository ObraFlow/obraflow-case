"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  temFiltroAtivo,
  urlDaLista,
  type FiltrosDaLista,
} from "@/components/aprovacoes/url-da-lista";
import type { StatusPedido } from "@/domain/alcada/tipos";
import type { ObraDto } from "@/lib/dto";

const CLASSE_SELECT =
  "h-[38px] w-full rounded-sm border border-input bg-card pr-7 pl-2 text-sm transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60";

/**
 * Filtros da lista. Tudo vive na URL: os selects navegam ao mudar e a busca ao enviar
 * (Enter ou "Buscar"), então a página continua Server Component e o link é compartilhável.
 * Os valores atuais vêm por prop do server; não há `useSearchParams` (suspenderia o App Shell).
 *
 * A navegação roda em `useTransition`: enquanto a lista nova não chega, os controles ficam
 * desabilitados e "Buscar" vira "Buscando…", para o clique ter retorno imediato. É
 * `router.replace`, não `push`: trocar filtro refina a mesma lista, e o botão Voltar do
 * navegador deve sair da lista, não desfazer filtro por filtro.
 */
export function FiltrosPedidos({ obras, valores }: { obras: ObraDto[]; valores: FiltrosDaLista }) {
  const router = useRouter();
  const [busca, setBusca] = useState(valores.busca);
  const [navegando, iniciarNavegacao] = useTransition();

  const navegar = (mudanca: Partial<FiltrosDaLista>) =>
    iniciarNavegacao(() => router.replace(urlDaLista({ ...valores, busca, ...mudanca })));

  const temFiltro = temFiltroAtivo(valores);

  return (
    <form
      role="search"
      aria-label="Filtrar pedidos"
      aria-busy={navegando || undefined}
      className="flex flex-wrap items-end gap-3"
      onSubmit={(evento) => {
        evento.preventDefault();
        navegar({ busca: busca.trim() });
      }}
    >
      {/* No celular, Obra e Situação dividem a linha; a busca ocupa a seguinte inteira. */}
      <label className="flex basis-[calc(50%-0.375rem)] flex-col gap-1 text-xs font-semibold text-muted-foreground sm:basis-auto">
        Obra
        <select
          className={CLASSE_SELECT}
          value={valores.obraId ?? ""}
          disabled={navegando}
          onChange={(evento) =>
            navegar({ obraId: evento.target.value ? Number(evento.target.value) : null })
          }
        >
          <option value="">Todas</option>
          {obras.map((obra) => (
            <option key={obra.id} value={obra.id}>
              {obra.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex basis-[calc(50%-0.375rem)] flex-col gap-1 text-xs font-semibold text-muted-foreground sm:basis-auto">
        Situação
        <select
          className={CLASSE_SELECT}
          value={valores.status ?? ""}
          disabled={navegando}
          onChange={(evento) =>
            navegar({ status: (evento.target.value || null) as StatusPedido | null })
          }
        >
          <option value="">Todas</option>
          <option value="PENDENTE">Pendente</option>
          <option value="APROVADO">Aprovado</option>
          <option value="REJEITADO">Rejeitado</option>
        </select>
      </label>

      <label className="flex min-w-0 flex-1 basis-56 flex-col gap-1 text-xs font-semibold text-muted-foreground">
        Buscar
        <Input
          type="search"
          placeholder="Número, obra ou fornecedor"
          value={busca}
          disabled={navegando}
          onChange={(evento) => setBusca(evento.target.value)}
          className="h-[38px] rounded-sm"
        />
      </label>

      <div className="flex gap-2">
        <Button type="submit" variant="outline" className="h-[38px]" disabled={navegando}>
          {navegando ? "Buscando…" : "Buscar"}
        </Button>
        {temFiltro && (
          <Button
            type="button"
            variant="ghost"
            className="h-[38px]"
            disabled={navegando}
            onClick={() => {
              setBusca("");
              iniciarNavegacao(() => router.replace(urlDaLista({ filtro: valores.filtro })));
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>
    </form>
  );
}
