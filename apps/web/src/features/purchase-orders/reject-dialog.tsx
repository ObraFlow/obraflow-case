'use client';

import { CircleAlert, Loader2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PurchaseOrderSummary } from '@/lib/api/types';

const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;

type Order = Pick<PurchaseOrderSummary, 'code' | 'project' | 'supplier'>;

interface RejectDialogProps {
  /** Pedido sendo rejeitado; null fecha o modal. */
  order: Order | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function RejectDialog({
  order,
  isSubmitting,
  onClose,
  onConfirm,
}: RejectDialogProps) {
  return (
    <Dialog open={order !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {/* key: cada abertura começa com o formulário limpo (a rota não desmonta ao navegar). */}
        {order && (
          <RejectForm
            key={order.code}
            order={order}
            isSubmitting={isSubmitting}
            onClose={onClose}
            onConfirm={onConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RejectForm({
  order,
  isSubmitting,
  onClose,
  onConfirm,
}: RejectDialogProps & { order: Order }) {
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const length = reason.trim().length;
  const error =
    length === 0
      ? 'O motivo é obrigatório para rejeitar o pedido.'
      : length < MIN_LENGTH
        ? `Descreva melhor o motivo (mínimo de ${MIN_LENGTH} caracteres).`
        : undefined;
  const showError = submitted && error;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!error) onConfirm(reason.trim());
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <DialogHeader>
        <DialogTitle>Motivo da rejeição</DialogTitle>
        <DialogDescription>
          {order.code} · {order.project.name} · {order.supplier.name}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="reject-reason">
            Descreva o motivo <span className="text-danger">*</span>
          </Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {length}/{MAX_LENGTH}
          </span>
        </div>
        <Textarea
          id="reject-reason"
          autoFocus
          rows={4}
          maxLength={MAX_LENGTH}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Ex.: preço acima da tabela de referência, fornecedor não homologado…"
          aria-invalid={showError ? true : undefined}
          aria-describedby="reject-reason-hint"
        />
        <p
          id="reject-reason-hint"
          className={
            showError
              ? 'flex items-center gap-1.5 text-sm text-danger'
              : 'text-xs text-muted-foreground'
          }
          role={showError ? 'alert' : undefined}
        >
          {showError ? (
            <>
              <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
              {error}
            </>
          ) : (
            'A rejeição encerra o fluxo de aprovação e o motivo fica registrado no histórico.'
          )}
        </p>
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" variant="danger" disabled={isSubmitting}>
          {isSubmitting && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          Rejeitar pedido
        </Button>
      </DialogFooter>
    </form>
  );
}
