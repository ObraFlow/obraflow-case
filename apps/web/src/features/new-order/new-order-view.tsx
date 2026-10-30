'use client';

import { HardHat } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/states';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects } from '@/lib/api/queries';
import { NewOrderForm } from './new-order-form';

/** Tela "Novo pedido": carrega as obras e mostra o formulário (ou o estado adequado). */
export function NewOrderView() {
  const projects = useProjects();

  if (projects.isError && !projects.data) {
    return (
      <ErrorState
        className="rounded-xl border bg-card"
        title="Não foi possível carregar as obras"
        error={projects.error}
        onRetry={() => projects.refetch()}
        isRetrying={projects.isFetching}
      />
    );
  }

  if (!projects.data) return <NewOrderSkeleton />;

  if (projects.data.data.length === 0) {
    return (
      <EmptyState
        className="rounded-xl border bg-card"
        icon={HardHat}
        title="Nenhuma obra cadastrada"
        description={
          <>
            Para criar um pedido é preciso ter ao menos uma obra. Cadastre obras
            pela API (<code className="text-xs">POST /api/projects</code>) ou
            rode o seed de demonstração (
            <code className="text-xs">pnpm db:seed</code>).
          </>
        }
      />
    );
  }

  return <NewOrderForm projects={projects.data.data} />;
}

function NewOrderSkeleton() {
  return (
    <div
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]"
      aria-label="Carregando formulário"
      aria-busy="true"
    >
      <div className="space-y-5">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
      <Skeleton className="hidden h-96 rounded-xl lg:block" />
    </div>
  );
}
