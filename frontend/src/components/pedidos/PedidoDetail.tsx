'use client';

import { useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getSituacaoLabel,
  getSituacaoVariant,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { approvePedido, rejectPedido } from '@/app/(dashboard)/pedidos/[id]/actions';
import { type PedidoResultado } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Clock as ClockIcon, FileText, Package, UserCheck, Loader2, AlertCircle } from 'lucide-react';

interface PedidoDetailProps {
  pedido: PedidoResultado;
}

export function PedidoDetail({ pedido }: PedidoDetailProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);

  const currentUserId = (session as any)?.user?.id as string | undefined;
  const etapaAtual = pedido.alcada?.etapaAtual ?? 1;
  const currentStep = pedido.alcada?.etapas?.[etapaAtual - 1];
  const isCurrentApprover =
    currentStep?.situacao === 'PENDENTE' &&
    (!!currentUserId && currentStep?.aprovador?.usuarioId === currentUserId);
  const canDecide = pedido.situacao === 'PENDENTE' && isCurrentApprover;

  const handleApprove = () => {
    startTransition(async () => {
      setDecisionError(null);
      const result = await approvePedido(pedido.id);
      if (!result.ok) {
        setDecisionError(
          typeof result.error === 'string' && result.error.trim()
            ? result.error
            : 'Erro ao aprovar o pedido. Verifique sua conexão e tente novamente.'
        );
        return;
      }
      router.refresh();
    });
  };

  const handleReject = () => {
    if (!rejectMotivo.trim()) return;
    startTransition(async () => {
      const result = await rejectPedido(pedido.id, rejectMotivo);
      if (!result.ok) {
        setRejectError(result.error);
        return;
      }
      setRejectMotivo('');
      setRejectOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              {pedido.numero}
            </h1>
            <Badge variant={getSituacaoVariant(pedido.situacao)}>
              {getSituacaoLabel(pedido.situacao)}
            </Badge>
          </div>
          <p className="text-neutral-500 dark:text-neutral-400">
            Obra: <span className="font-medium">{pedido.obra.nome}</span>{' '}
            ({pedido.obra.codigo}) · Fornecedor:{' '}
            <span className="font-medium">{pedido.fornecedor.nome}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">
              {formatCurrency(pedido.valorTotal)}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {pedido.quantidadeItens} item{pedido.quantidadeItens !== 1 ? 's' : ''} ·{' '}
              {formatDate(pedido.dataPedido)}
            </p>
          </div>
        </div>
      </div>

      {/* Alçada Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Alçada de Aprovação
          </CardTitle>
          <CardDescription>
            Etapa atual: {pedido.alcada.etapaAtual} de {pedido.alcada.totalEtapas}
            {pedido.alcada.aprovadorAtual && (
              <>
                · Aprovador atual:{' '}
                <strong>{pedido.alcada.aprovadorAtual.usuarioNome || pedido.alcada.aprovadorAtual.usuarioId}</strong>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-neutral-200 dark:bg-neutral-700" />

            <div className="space-y-6 pl-6">
              {pedido.alcada.etapas.map((etapa, index) => {
                const isCurrent = index === etapaAtual - 1 && pedido.situacao === 'PENDENTE';
                const isCompleted = etapa.situacao === 'APROVADO';
                const isRejected = etapa.situacao === 'REJEITADO';

                return (
                  <div key={etapa.ordem} className="relative">
                    {/* Step indicator */}
                    <div className="absolute -left-6 w-12 h-12 flex items-center justify-center">
                      <div
                        className={`w-3 h-3 rounded-full border-2 border-neutral-300 bg-white transition-all ${
                          isCompleted
                            ? 'bg-success-600 border-success-600'
                            : isRejected
                            ? 'bg-danger-600 border-danger-600'
                            : isCurrent
                            ? 'bg-primary-600 border-primary-600 animate-pulse'
                            : 'border-neutral-300 dark:border-neutral-600'
                        }`}
                      />
                      {isCompleted && (
                        <span className="absolute text-white text-xs font-bold">
                          ✓
                        </span>
                      )}
                      {isRejected && (
                        <span className="absolute text-white text-xs font-bold">
                          ✕
                        </span>
                      )}
                    </div>

                    {/* Step content */}
                    <div className="ml-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-neutral-900 dark:text-white">
                              Etapa {etapa.ordem}
                            </span>
                            <Badge
                              variant={
                                etapa.situacao === 'APROVADO' ? 'approved'
                                : etapa.situacao === 'REJEITADO' ? 'rejected'
                                : 'pending'
                              }
                            >
                              {etapa.situacao === 'APROVADO' && 'Aprovado'}
                              {etapa.situacao === 'REJEITADO' && 'Rejeitado'}
                              {etapa.situacao === 'PENDENTE' && 'Pendente'}
                            </Badge>
                          </div>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Aprovador: <strong>{etapa.aprovador?.usuarioNome || etapa.aprovador?.usuarioId}</strong>
                          </p>
                          {etapa.decididoEm && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              Decidido em: {formatDateTime(etapa.decididoEm)}
                            </p>
                          )}
                          {etapa.motivo && (
                            <div className="mt-2 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-800">
                              <p className="text-sm text-danger-700 dark:text-danger-400">
                                <strong>Motivo da rejeição:</strong> {etapa.motivo}
                              </p>
                            </div>
                          )}
                        </div>
                        {isCurrent && isCurrentApprover && (
                          <div className="ml-4 mt-2 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                            <p className="text-sm text-primary-700 dark:text-primary-400">
                              ✓ É a sua vez de decidir
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Itens do Pedido */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Itens do Pedido ({pedido.itens.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 text-center">#</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-24 text-center">Qtd</TableHead>
                  <TableHead className="w-20 text-center">Un</TableHead>
                  <TableHead className="w-36 text-right">Preço Unit.</TableHead>
                  <TableHead className="w-36 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedido.itens.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-center font-medium">{index + 1}</TableCell>
                    <TableCell>{item.descricao}</TableCell>
                    <TableCell className="text-center">{item.quantidade.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-center">{item.unidade}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.precoUnitario)}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-medium">Total</TableCell>
                  <TableCell className="text-right font-bold text-lg">{formatCurrency(pedido.valorTotal)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Decisões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Decisões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pedido.alcada.etapas.map((etapa, index) => (
              <div
                key={index}
                className={`flex items-start gap-4 p-4 rounded-lg ${
                  etapa.situacao === 'APROVADO' ? 'bg-success-50 dark:bg-success-900/20' :
                  etapa.situacao === 'REJEITADO' ? 'bg-danger-50 dark:bg-danger-900/20' :
                  'bg-neutral-50 dark:bg-neutral-800'
                }`}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center">
                  {etapa.situacao === 'APROVADO' && (
                    <div className="w-6 h-6 rounded-full bg-success-600 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  )}
                  {etapa.situacao === 'REJEITADO' && (
                    <div className="w-6 h-6 rounded-full bg-danger-600 flex items-center justify-center">
                      <XCircle className="h-4 w-4 text-white" />
                    </div>
                  )}
                  {etapa.situacao === 'PENDENTE' && (
                    <div className="w-6 h-6 rounded-full bg-warning-200 dark:bg-warning-800 flex items-center justify-center">
                      <ClockIcon className="h-4 w-4 text-warning-600 dark:text-warning-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      Etapa {etapa.ordem} - {etapa.aprovador?.usuarioNome || etapa.aprovador?.usuarioId}
                    </span>
                    <Badge variant={
                      etapa.situacao === 'APROVADO' ? 'approved' :
                      etapa.situacao === 'REJEITADO' ? 'rejected' : 'pending'
                    }>
                      {etapa.situacao}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {etapa.decididoEm ? formatDateTime(etapa.decididoEm) : 'Aguardando decisão'}
                  </p>
                  {etapa.motivo && (
                    <div className="mt-2 p-3 rounded-lg bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-800">
                      <p className="text-sm text-danger-700 dark:text-danger-400">
                        <strong>Motivo:</strong> {etapa.motivo}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          {canDecide ? (
            <div className="space-y-3">
              {decisionError && (
                <div
                  className="flex items-center gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700 dark:bg-danger-900/30 dark:text-danger-400"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{decisionError}</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="default"
                  size="lg"
                  onClick={handleApprove}
                  disabled={isPending}
                  className="flex-1"
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Aprovar
                </Button>
              <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="lg"
                    disabled={isPending}
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeitar
                  </Button>
                </DialogTrigger>

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rejeitar Pedido</DialogTitle>
                    <DialogDescription>
                      Informe o motivo da rejeição. Este campo é obrigatório.
                    </DialogDescription>
                  </DialogHeader>

                  {rejectError && (
                    <div
                      className="mb-4 flex items-center gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700 dark:bg-danger-900/30 dark:text-danger-400"
                      role="alert"
                    >
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{rejectError}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="motivo">Motivo *</Label>
                      <Textarea
                        id="motivo"
                        value={rejectMotivo}
                        onChange={(e) => setRejectMotivo(e.target.value)}
                        placeholder="Digite o motivo da rejeição..."
                        rows={4}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRejectOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={isPending || !rejectMotivo.trim()}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Rejeitando...
                        </>
                      ) : (
                        'Confirmar Rejeição'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="default" size="lg" disabled className="flex-1" aria-disabled="true">
                  <UserCheck className="mr-2 h-4 w-4" />
                  Aprovar
                </Button>
                <Button variant="destructive" size="lg" disabled className="flex-1" aria-disabled="true">
                  <XCircle className="mr-2 h-4 w-4" />
                  Rejeitar
                </Button>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400" role="status">
                {pedido.situacao === 'APROVADO' &&
                  'Pedido aprovado — cadeia de alçada concluída. Nenhuma decisão pendente.'}
                {pedido.situacao === 'REJEITADO' &&
                  'Pedido rejeitado — fluxo interrompido. Nenhuma decisão pendente.'}
                {pedido.situacao === 'PENDENTE' &&
                  `Aguardando decisão de ${
                    pedido.alcada.aprovadorAtual?.usuarioNome || pedido.alcada.aprovadorAtual?.usuarioId || 'aprovador da etapa atual'
                  }. As ações ficam disponíveis apenas para o aprovador da etapa corrente.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
