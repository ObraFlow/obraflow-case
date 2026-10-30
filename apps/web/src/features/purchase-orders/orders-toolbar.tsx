'use client';

import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Project, PurchaseOrderList } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { TABS, type TabId } from './use-order-filters';

const ALL_PROJECTS = 'todas';

interface TabsBarProps {
  tab: TabId;
  counts: PurchaseOrderList['counts'] | undefined;
  onChange: (tab: TabId) => void;
}

/** Abas por situação, com contadores. "Aguardando minha decisão" depende do "Visualizando como". */
export function OrderTabs({ tab, counts, onChange }: TabsBarProps) {
  const countOf: Record<TabId, number | null | undefined> = {
    minha: counts?.awaiting,
    pendentes: counts?.pending,
    aprovados: counts?.approved,
    rejeitados: counts?.rejected,
    todos: undefined,
  };

  return (
    <div
      role="tablist"
      aria-label="Situação dos pedidos"
      className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:-mx-7 sm:px-7"
    >
      {TABS.map(({ id, label, shortLabel }) => {
        const active = id === tab;
        const count = countOf[id];
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={cn(
              'relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:text-foreground',
              active
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
              'after:absolute after:inset-x-1 after:-bottom-px after:h-0.5 after:rounded-full',
              active && 'after:bg-primary',
            )}
          >
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
            {count !== undefined && count !== null && (
              <span
                className={cn(
                  'min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums',
                  id === 'minha' && count > 0
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface FiltersProps {
  search: string;
  projectId: number | undefined;
  projects: Project[];
  onSearch: (value: string) => void;
  onProject: (value: number | undefined) => void;
}

/** Busca (fornecedor ou código) e filtro por obra. A busca espera o usuário parar de digitar. */
export function OrderFilters({
  search,
  projectId,
  projects,
  onSearch,
  onProject,
}: FiltersProps) {
  const [text, setText] = useState(search);
  const [lastSearch, setLastSearch] = useState(search);

  // Se a URL mudar por fora (ex.: voltar no navegador), o campo acompanha.
  // Ajuste durante a renderização, como recomenda o React (em vez de um efeito).
  if (search !== lastSearch) {
    setLastSearch(search);
    if (search !== text.trim()) setText(search);
  }

  useEffect(() => {
    if (text.trim() === search) return;
    const timer = setTimeout(() => onSearch(text), 300);
    return () => clearTimeout(timer);
  }, [text, search, onSearch]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative sm:w-80">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Buscar fornecedor ou número…"
          aria-label="Buscar por fornecedor ou número do pedido"
          className="h-9 bg-card pl-9"
        />
      </div>
      <Select
        value={projectId ? String(projectId) : ALL_PROJECTS}
        onValueChange={(value) =>
          onProject(value === ALL_PROJECTS ? undefined : Number(value))
        }
      >
        <SelectTrigger
          className="h-9 bg-card sm:w-60"
          aria-label="Filtrar por obra"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_PROJECTS}>Todas as obras</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={String(project.id)}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
