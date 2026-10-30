'use client';

import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useApprovalRuleMutations } from '@/lib/api/queries';
import type { ApprovalRule } from '@/lib/api/types';
import { formatRange } from '@/lib/format';

interface RemoveRuleDialogProps {
  rule: ApprovalRule | null;
  rules: ApprovalRule[];
  projectId: number;
  onClose: () => void;
}

/** Confirmação antes de remover: explica o efeito sobre os pedidos novos e os existentes. */
export function RemoveRuleDialog({
  rule,
  rules,
  projectId,
  onClose,
}: RemoveRuleDialogProps) {
  const { remove } = useApprovalRuleMutations(projectId);
  const next = rule
    ? rules.find((other) => other.position === rule.position + 1)
    : undefined;

  function confirm() {
    if (!rule) return;
    remove.mutate(rule.id, {
      onSuccess: () => {
        toast.success(`Faixa ${rule.position} removida`);
        onClose();
      },
      onError: (error) =>
        toast.error('Não foi possível remover a faixa', {
          description: error.message,
        }),
    });
  }

  return (
    <AlertDialog
      open={rule !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        {rule && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Remover a faixa {rule.position}?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>
                    <strong>
                      {formatRange(rule.fromAmount, rule.maxAmount)}
                    </strong>
                  </p>
                  <p>
                    {next
                      ? `Novos pedidos nesse intervalo passarão a seguir a faixa ${next.position} (a próxima faixa cobre esses valores).`
                      : 'Não há faixa acima desta: novos pedidos nesse intervalo ficarão bloqueados até uma nova faixa ser criada.'}
                  </p>
                  <p>
                    Pedidos já cadastrados não mudam: eles guardam a própria
                    cadeia de aprovação.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-danger text-white hover:bg-danger/90"
                disabled={remove.isPending}
                onClick={(event) => {
                  event.preventDefault(); // fecha só depois que a API confirmar
                  confirm();
                }}
              >
                Remover faixa
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
