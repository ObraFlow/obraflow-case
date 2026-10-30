'use client';

import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  GripVertical,
  Loader2,
  X,
} from 'lucide-react';
import { type DragEvent, type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api/client';
import { useApprovalRuleMutations } from '@/lib/api/queries';
import type { ApprovalRule, User } from '@/lib/api/types';
import { formatBRL } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  type DraftErrors,
  draftFromAmount,
  draftMaxAmount,
  moneyToInput,
  moveItem,
  type RuleDraft,
  validateDraft,
} from './rule-draft';

/** null = fechado; sem `rule` = criar; com `rule` = editar. */
export type RuleDialogTarget = { rule?: ApprovalRule } | null;

interface RuleDialogProps {
  target: RuleDialogTarget;
  projectId: number;
  projectName: string;
  rules: ApprovalRule[];
  users: User[];
  /** Estado da lista de usuários (para não dizer "todos já estão na faixa" enquanto carrega). */
  usersStatus: 'loading' | 'error' | 'ready';
  onClose: () => void;
}

export function RuleDialog({ target, ...props }: RuleDialogProps) {
  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => !open && props.onClose()}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {target && (
          // key: cada abertura começa com os dados da faixa certa (a rota não desmonta ao navegar).
          <RuleForm
            key={target.rule?.id ?? 'new'}
            rule={target.rule}
            {...props}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function initialDraft(rule: ApprovalRule | undefined): RuleDraft {
  if (!rule) return { limit: '', unlimited: false, approverIds: [] };
  return {
    limit: rule.maxAmount === null ? '' : moneyToInput(rule.maxAmount),
    unlimited: rule.maxAmount === null,
    approverIds: rule.approvers.map((approver) => approver.user.id),
  };
}

function RuleForm({
  rule,
  projectId,
  projectName,
  rules,
  users,
  usersStatus,
  onClose,
}: Omit<RuleDialogProps, 'target'> & { rule?: ApprovalRule }) {
  const [draft, setDraft] = useState(() => initialDraft(rule));
  const [submitted, setSubmitted] = useState(false);
  const [apiErrors, setApiErrors] = useState<DraftErrors>({});
  const { create, update } = useApprovalRuleMutations(projectId);
  const saving = create.isPending || update.isPending;

  const otherRules = rules.filter((other) => other.id !== rule?.id);
  const errors = { ...validateDraft(draft, otherRules), ...apiErrors };
  const show = (field: keyof DraftErrors) =>
    submitted || apiErrors[field] ? errors[field] : undefined;

  const maxAmount = draftMaxAmount(draft);
  const fromAmount =
    maxAmount === undefined
      ? undefined
      : draftFromAmount(otherRules, maxAmount);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const available = users.filter(
    (user) => !draft.approverIds.includes(user.id),
  );

  function change(next: Partial<RuleDraft>) {
    setDraft((current) => ({ ...current, ...next }));
    setApiErrors({});
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateDraft(draft, otherRules)).length > 0) return;

    const input = {
      maxAmount: draftMaxAmount(draft)!,
      approverIds: draft.approverIds,
    };
    const options = {
      onSuccess: () => {
        toast.success(
          rule ? `Faixa ${rule.position} atualizada` : 'Faixa criada',
          {
            description: `Novos pedidos de ${projectName} já usam esta regra. Pedidos existentes não mudam.`,
          },
        );
        onClose();
      },
      onError: (error: Error) => {
        if (error instanceof ApiError) {
          setApiErrors({
            limit: error.fieldError('maxAmount'),
            approverIds: error.fieldError('approverIds'),
          });
        }
        toast.error('Não foi possível salvar a faixa', {
          description: error.message,
        });
      },
    };
    if (rule) update.mutate({ id: rule.id, input }, options);
    else create.mutate(input, options);
  }

  // Arrastar para reordenar (as setas fazem o mesmo, e funcionam pelo teclado).
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  function onDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    change({ approverIds: moveItem(draft.approverIds, dragIndex, index) });
    setDragIndex(index);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <DialogHeader>
        <DialogTitle>
          {rule ? `Editar faixa ${rule.position}` : 'Nova faixa'}
        </DialogTitle>
        <DialogDescription>{projectName}</DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="rule-limit">Limite superior da faixa</Label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
            R$
          </span>
          <Input
            id="rule-limit"
            inputMode="decimal"
            placeholder={draft.unlimited ? 'Sem limite' : '0,00'}
            className="pl-9 tabular-nums"
            value={draft.unlimited ? '' : draft.limit}
            disabled={draft.unlimited}
            onChange={(event) => change({ limit: event.target.value })}
            aria-invalid={show('limit') ? true : undefined}
            aria-describedby="rule-limit-hint"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={draft.unlimited}
            onCheckedChange={(checked) =>
              change({ unlimited: checked === true })
            }
          />
          Sem limite superior (a faixa cobre qualquer valor acima)
        </label>
        <FieldHint id="rule-limit-hint" error={show('limit')}>
          {fromAmount !== undefined && (
            <>
              Esta faixa cobre pedidos de{' '}
              <strong>{formatBRL(fromAmount)}</strong>
              {maxAmount ? (
                <>
                  {' '}
                  até <strong>{formatBRL(maxAmount)}</strong>
                </>
              ) : (
                ' em diante'
              )}{' '}
              (o início é calculado a partir da faixa anterior).
            </>
          )}
        </FieldHint>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Aprovadores{' '}
          <span className="font-normal text-muted-foreground">
            (na ordem do fluxo)
          </span>
        </p>
        {draft.approverIds.length > 0 && (
          <ol className="space-y-1.5">
            {draft.approverIds.map((userId, index) => {
              const user = usersById.get(userId);
              const isFirst = index === 0;
              const isLast = index === draft.approverIds.length - 1;
              return (
                <li
                  key={userId}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => onDragOver(event, index)}
                  onDragEnd={() => setDragIndex(null)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border bg-muted/40 py-2 pr-2 pl-1.5',
                    dragIndex === index && 'border-primary bg-warning-soft',
                  )}
                >
                  <GripVertical
                    className="size-4 shrink-0 cursor-grab text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-bold text-background">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {user?.name ?? `Usuário ${userId}`}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user?.jobTitle}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isFirst}
                    onClick={() =>
                      change({
                        approverIds: moveItem(
                          draft.approverIds,
                          index,
                          index - 1,
                        ),
                      })
                    }
                    aria-label={`Mover ${user?.name} para cima`}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isLast}
                    onClick={() =>
                      change({
                        approverIds: moveItem(
                          draft.approverIds,
                          index,
                          index + 1,
                        ),
                      })
                    }
                    aria-label={`Mover ${user?.name} para baixo`}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-danger-soft hover:text-danger"
                    onClick={() =>
                      change({
                        approverIds: draft.approverIds.filter(
                          (id) => id !== userId,
                        ),
                      })
                    }
                    aria-label={`Remover ${user?.name} da faixa`}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ol>
        )}

        <Select
          value=""
          onValueChange={(value) =>
            change({ approverIds: [...draft.approverIds, Number(value)] })
          }
          disabled={available.length === 0}
        >
          <SelectTrigger
            className="w-full"
            aria-label="Adicionar aprovador"
            aria-invalid={show('approverIds') ? true : undefined}
          >
            <SelectValue
              placeholder={
                usersStatus === 'loading'
                  ? 'Carregando usuários…'
                  : usersStatus === 'error'
                    ? 'Não foi possível carregar os usuários'
                    : available.length === 0
                      ? 'Todos os usuários já estão na faixa'
                      : 'Adicionar aprovador…'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {available.map((user) => (
              <SelectItem key={user.id} value={String(user.id)}>
                {user.name}
                <span className="text-xs text-muted-foreground">
                  {user.jobTitle}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldHint error={show('approverIds')}>
          O 1º da lista decide primeiro; o pedido só segue para o próximo depois
          da aprovação.
        </FieldHint>
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          Salvar faixa
        </Button>
      </DialogFooter>
    </form>
  );
}

function FieldHint({
  id,
  error,
  children,
}: {
  id?: string;
  error?: string;
  children: React.ReactNode;
}) {
  if (error) {
    return (
      <p
        id={id}
        role="alert"
        className="flex items-start gap-1.5 text-sm text-danger"
      >
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {error}
      </p>
    );
  }
  return (
    <p id={id} className="text-xs text-muted-foreground">
      {children}
    </p>
  );
}
