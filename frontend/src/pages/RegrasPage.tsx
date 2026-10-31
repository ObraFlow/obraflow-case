import { RangeEditorSheet } from '@/components/domain/RangeEditorSheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useProjects, useRuleMutations, useRules, useUsers } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import { rangeLabel } from '@/lib/chain';
import type { ApprovalRange } from '@/lib/types';
import { ArrowRight, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function RegrasPage() {
  const projects = useProjects();
  const { data: users } = useUsers();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ApprovalRange | null>(null);
  const [creating, setCreating] = useState(false);
  const [toRemove, setToRemove] = useState<ApprovalRange | null>(null);

  useEffect(() => {
    if (!projectId && projects.data?.length) setProjectId(projects.data[0].id);
  }, [projects.data, projectId]);

  const rules = useRules(projectId);
  const { remove } = useRuleMutations(projectId);

  const confirmRemove = () => {
    if (!toRemove) return;
    remove.mutate(toRemove.id, {
      onSuccess: () => { toast.success('Faixa removida'); setToRemove(null); },
      onError: (e) => toast.error('Não foi possível remover', { description: e instanceof ApiError ? e.message : undefined }),
    });
  };

  if (projects.isLoading) return <div className="py-16 text-center text-sm text-muted-foreground">Carregando…</div>;
  if (projects.isError) return <ErrorState message={(projects.error as Error)?.message} onRetry={() => projects.refetch()} />;
  if (!projects.data?.length) return <EmptyState icon={SlidersHorizontal} title="Nenhuma obra cadastrada" description="Cadastre uma obra para configurar as alçadas." />;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Regras de alçada</h1>
          <p className="text-sm text-muted-foreground">Faixas de valor e a cadeia de aprovadores de cada obra.</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label>Obra</Label>
            <Select value={projectId ?? ''} onValueChange={setProjectId}>
              <SelectTrigger className="mt-1 w-56"><SelectValue /></SelectTrigger>
              <SelectContent>{projects.data.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={() => setCreating(true)} disabled={!projectId}><Plus /> Nova faixa</Button>
        </div>
      </header>

      <Card className="overflow-hidden">
        {rules.isLoading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : rules.isError ? (
          <ErrorState message={(rules.error as Error)?.message} onRetry={() => rules.refetch()} />
        ) : !rules.data?.length ? (
          <EmptyState
            icon={SlidersHorizontal}
            title="Sem faixas configuradas"
            description="Esta obra ainda não tem regras. Pedidos nela serão bloqueados até você definir ao menos uma faixa."
            action={<Button size="sm" onClick={() => setCreating(true)}><Plus /> Criar primeira faixa</Button>}
          />
        ) : (
          <>
            <div className="grid grid-cols-[minmax(180px,1fr)_minmax(0,2fr)_88px] gap-3 border-b px-4 py-2.5 text-xs font-medium text-subtle-foreground">
              <span>Faixa de valor</span>
              <span>Aprovadores (na ordem)</span>
              <span className="text-right">Ações</span>
            </div>
            {rules.data.map((r) => (
              <div key={r.id} className="grid grid-cols-[minmax(180px,1fr)_minmax(0,2fr)_88px] items-center gap-3 border-t px-4 py-3">
                <span className="num text-sm font-medium">{rangeLabel(r.minValue, r.maxValue)}</span>
                <span className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
                  {[...r.approvalRangeSteps].sort((a, b) => a.position - b.position).map((s, i) => (
                    <span key={s.id} className="flex items-center gap-1">
                      {i > 0 && <ArrowRight className="size-3 text-subtle-foreground" />}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{s.user.name}</span>
                    </span>
                  ))}
                </span>
                <span className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEditing(r)}><Pencil /></Button>
                  <Button variant="ghost" size="icon" aria-label="Remover" className="hover:bg-danger-muted hover:text-danger" onClick={() => setToRemove(r)}><Trash2 /></Button>
                </span>
              </div>
            ))}
          </>
        )}
      </Card>

      <p className="text-xs text-subtle-foreground">
        Faixas contíguas podem compartilhar um limite (ex.: "até R$ 10.000" e "acima de R$ 10.000"); o valor no limite pertence à faixa inferior. Faixas sobrepostas são recusadas.
      </p>

      {(creating || editing) && projectId && users && (
        <RangeEditorSheet
          projectId={projectId}
          range={editing}
          users={users}
          open={creating || !!editing}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}

      <Dialog open={!!toRemove} onOpenChange={(v) => !v && setToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-md">Remover faixa?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {toRemove && `"${rangeLabel(toRemove.minValue, toRemove.maxValue)}" será removida. Pedidos já criados não são afetados (a cadeia deles é um snapshot).`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setToRemove(null)}>Cancelar</Button>
            <Button variant="destructive" loading={remove.isPending} onClick={confirmRemove}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
