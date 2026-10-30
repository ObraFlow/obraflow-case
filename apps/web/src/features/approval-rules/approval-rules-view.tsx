'use client';

import { HardHat, Layers, Plus, Rows3, TriangleAlert } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApprovalRules, useProjects, useUsers } from '@/lib/api/queries';
import type { ApprovalRule, Project } from '@/lib/api/types';
import { formatBRL } from '@/lib/format';
import { cn } from '@/lib/utils';
import { RemoveRuleDialog } from './remove-rule-dialog';
import { RuleDialog, type RuleDialogTarget } from './rule-dialog';
import { CoverageRuler } from './rules-display';
import { RulesSummaryCard, TestValueCard } from './rules-side-cards';
import { RulesTable } from './rules-table';

/** Tela "Alçadas": faixas de aprovação por obra. A obra selecionada fica na URL (?obra=2). */
export function ApprovalRulesView() {
  const projects = useProjects();
  const searchParams = useSearchParams();
  const pathname = usePathname();

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
  if (!projects.data) return <RulesSkeleton />;
  if (projects.data.data.length === 0) {
    return (
      <EmptyState
        className="rounded-xl border bg-card"
        icon={HardHat}
        title="Nenhuma obra cadastrada"
        description="As alçadas são configuradas por obra. Cadastre uma obra pela API (POST /api/projects) ou rode o seed de demonstração."
      />
    );
  }

  const list = projects.data.data;
  const requested = Number(searchParams.get('obra'));
  const project = list.find((p) => p.id === requested) ?? list[0];

  return (
    <div className="space-y-5">
      <ProjectPicker
        projects={list}
        selectedId={project.id}
        // History API nativo: troca a obra na URL na hora, sem ida ao servidor.
        onSelect={(id) =>
          window.history.replaceState(null, '', `${pathname}?obra=${id}`)
        }
      />
      {/* key: trocar de obra recomeça os estados da tela (modais, valor testado). */}
      <ProjectRules key={project.id} project={project} />
    </div>
  );
}

function ProjectPicker({
  projects,
  selectedId,
  onSelect,
}: {
  projects: Project[];
  selectedId: number;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto">
      <span className="shrink-0 text-sm text-muted-foreground">Obra</span>
      <div
        role="tablist"
        aria-label="Obra"
        className="inline-flex rounded-lg border bg-muted/60 p-1"
      >
        {projects.map((project) => {
          const active = project.id === selectedId;
          return (
            <button
              key={project.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(project.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {project.name}
              {project.coverage !== 'FULL' && (
                <TriangleAlert
                  className={cn(
                    'size-3.5',
                    project.coverage === 'NONE'
                      ? 'text-danger'
                      : 'text-warning',
                  )}
                  aria-label={
                    project.coverage === 'NONE'
                      ? 'sem faixas'
                      : 'cobertura parcial'
                  }
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProjectRules({ project }: { project: Project }) {
  const rules = useApprovalRules(project.id);
  const users = useUsers();
  const [dialog, setDialog] = useState<RuleDialogTarget>(null);
  const [removing, setRemoving] = useState<ApprovalRule | null>(null);

  if (rules.isError && !rules.data) {
    return (
      <ErrorState
        className="rounded-xl border bg-card"
        title="Não foi possível carregar as alçadas"
        error={rules.error}
        onRetry={() => rules.refetch()}
        isRetrying={rules.isFetching}
      />
    );
  }
  if (!rules.data) return <RulesSkeleton withPicker={false} />;

  const data = rules.data;
  const list = data.data;
  const dialogs = (
    <>
      <RuleDialog
        target={dialog}
        projectId={project.id}
        projectName={project.name}
        rules={list}
        users={users.data?.data ?? []}
        usersStatus={users.isError ? 'error' : users.data ? 'ready' : 'loading'}
        onClose={() => setDialog(null)}
      />
      <RemoveRuleDialog
        rule={removing}
        rules={list}
        projectId={project.id}
        onClose={() => setRemoving(null)}
      />
    </>
  );

  if (list.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={Layers}
          title="Nenhuma faixa configurada"
          description={
            <>
              A obra <strong>{project.name}</strong> ainda não tem regras de
              aprovação. Enquanto não houver faixas,{' '}
              <strong>nenhum pedido desta obra pode ser cadastrado</strong>.
            </>
          }
          action={
            <Button onClick={() => setDialog({})}>
              <Plus aria-hidden="true" />
              Criar primeira faixa
            </Button>
          }
        />
        {dialogs}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Rows3
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            Régua de valores
          </h2>
          <span className="text-xs text-muted-foreground">
            {list.length} {list.length === 1 ? 'faixa' : 'faixas'} ·{' '}
            {data.coverage.status === 'FULL'
              ? 'cobertura total ✓'
              : 'cobertura parcial'}
          </span>
        </header>
        <div className="space-y-4 p-5">
          {data.coverage.uncoveredFrom !== null && (
            <div
              role="alert"
              className="flex gap-2 rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger-strong"
            >
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <p>
                <strong>Sem regra de alçada:</strong> pedidos a partir de{' '}
                <strong>{formatBRL(data.coverage.uncoveredFrom)}</strong> não
                têm fluxo de aprovação e serão bloqueados. Crie uma faixa “sem
                limite” para cobrir esse intervalo.
              </p>
            </div>
          )}
          <CoverageRuler data={data} />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <header className="flex items-center justify-between gap-2 border-b px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Layers
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            Faixas de aprovação
          </h2>
          <span className="text-xs text-muted-foreground">{project.name}</span>
        </header>
        <RulesTable
          rules={list}
          onCreate={() => setDialog({})}
          onEdit={(rule) => setDialog({ rule })}
          onRemove={setRemoving}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <TestValueCard projectId={project.id} />
        <RulesSummaryCard data={data} projectName={project.name} />
      </div>

      {dialogs}
    </div>
  );
}

function RulesSkeleton({ withPicker = true }: { withPicker?: boolean }) {
  return (
    <div className="space-y-5" aria-label="Carregando alçadas" aria-busy="true">
      {withPicker && <Skeleton className="h-10 w-96 max-w-full rounded-lg" />}
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
