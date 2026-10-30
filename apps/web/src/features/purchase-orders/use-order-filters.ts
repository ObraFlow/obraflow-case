'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { OrderStatus, PurchaseOrderFilters } from '@/lib/api/types';

// Estado da tela na URL (?aba=pendentes&obra=1&busca=voto&pedido=9): sobrevive ao recarregar,
// pode ser compartilhado e permite ao "Novo pedido" redirecionar já destacando o pedido criado.

export const TABS = [
  {
    id: 'minha',
    label: 'Aguardando minha decisão',
    shortLabel: 'Minha decisão',
  },
  { id: 'pendentes', label: 'Pendentes', shortLabel: 'Pendentes' },
  { id: 'aprovados', label: 'Aprovados', shortLabel: 'Aprovados' },
  { id: 'rejeitados', label: 'Rejeitados', shortLabel: 'Rejeitados' },
  { id: 'todos', label: 'Todos', shortLabel: 'Todos' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

const TAB_STATUS: Partial<Record<TabId, OrderStatus>> = {
  pendentes: 'PENDING',
  aprovados: 'APPROVED',
  rejeitados: 'REJECTED',
};

export const PAGE_SIZE = 20;

function positiveInt(value: string | null): number | undefined {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

export function useOrderFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const tabParam = searchParams.get('aba');
  const tab: TabId = TABS.some((t) => t.id === tabParam)
    ? (tabParam as TabId)
    : 'todos';
  const projectId = positiveInt(searchParams.get('obra'));
  const search = searchParams.get('busca') ?? '';
  const page = positiveInt(searchParams.get('pagina')) ?? 1;
  const openOrderId = positiveInt(searchParams.get('pedido'));
  const highlightId = positiveInt(searchParams.get('destaque'));

  /**
   * Atualiza parâmetros da URL sem empilhar histórico (null remove o parâmetro).
   * Usa o History API nativo (integrado ao useSearchParams no Next): a URL muda na hora, sem ida ao
   * servidor. Com router.replace a troca é assíncrona, e a busca (que atualiza a URL com atraso)
   * podia ler a URL antiga e desfazer um filtro escolhido nesse meio-tempo.
   */
  const update = useCallback(
    (changes: Record<string, string | number | null>) => {
      const next = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, String(value));
      }
      const query = next.toString();
      window.history.replaceState(
        null,
        '',
        query ? `${pathname}?${query}` : pathname,
      );
    },
    [pathname],
  );

  return {
    tab,
    projectId,
    search,
    page,
    openOrderId,
    highlightId,
    // Trocar aba, obra ou busca volta para a página 1.
    setTab: (value: TabId) =>
      update({ aba: value === 'todos' ? null : value, pagina: null }),
    setProjectId: (value: number | undefined) =>
      update({ obra: value ?? null, pagina: null }),
    setSearch: (value: string) =>
      update({ busca: value.trim() || null, pagina: null }),
    setPage: (value: number) => update({ pagina: value === 1 ? null : value }),
    openOrder: (id: number) => update({ pedido: id }),
    closeOrder: () => update({ pedido: null }),
    clearHighlight: () => update({ destaque: null }),
  };
}

/** Converte o estado da tela nos filtros da API. */
export function useListFilters(
  filters: Pick<
    ReturnType<typeof useOrderFilters>,
    'tab' | 'projectId' | 'search' | 'page'
  >,
  viewerId: number | undefined,
): PurchaseOrderFilters {
  const { tab, projectId, search, page } = filters;
  return useMemo(
    () => ({
      status: TAB_STATUS[tab],
      awaitingUserId: tab === 'minha' ? viewerId : undefined,
      projectId,
      q: search || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [tab, projectId, search, page, viewerId],
  );
}
