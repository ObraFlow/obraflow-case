import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FieldError, Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Textarea } from '@/components/ui/textarea';
import { useCreateOrder, useProjects, useRules, useSuppliers } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import { previewChain } from '@/lib/chain';
import { cn, formatCurrency } from '@/lib/utils';
import { ArrowRight, HardHat, Lock, Plus, Trash2 } from 'lucide-react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const UNITS = ['un', 'kg', 'm', 'm²', 'm³', 'L', 'sc', 'h', 'cx', 'lata'];
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

interface ItemForm {
  description: string;
  quantity: number | '';
  unit: string;
  unitPrice: number | '';
}
interface OrderForm {
  projectId: string;
  supplierId: string;
  orderDate: string;
  notes: string;
  items: ItemForm[];
}
const emptyItem: ItemForm = { description: '', quantity: '', unit: 'un', unitPrice: '' };

export function NovoPedidoPage() {
  const navigate = useNavigate();
  const projects = useProjects();
  const suppliers = useSuppliers();
  const createOrder = useCreateOrder();

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<OrderForm>({
    mode: 'onChange',
    defaultValues: { projectId: '', supplierId: '', orderDate: new Date().toISOString().slice(0, 10), notes: '', items: [emptyItem] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');
  const projectId = watch('projectId');
  const rules = useRules(projectId || null);

  const lineTotal = (it: ItemForm) => {
    const q = Number(it.quantity), p = Number(it.unitPrice);
    return isFinite(q) && isFinite(p) ? round2(q * p) : 0;
  };
  const total = round2(items.reduce((acc, it) => acc + lineTotal(it), 0));
  const preview = rules.data ? previewChain(rules.data, total) : null;

  const missing: string[] = [];
  if (!projectId) missing.push('selecione a obra');
  if (!watch('supplierId')) missing.push('selecione o fornecedor');
  const invalidItems = items.some((it) => !it.description || !(Number(it.quantity) > 0) || !(Number(it.unitPrice) >= 0));
  if (invalidItems) missing.push('preencha descrição, quantidade (> 0) e preço de cada item');

  const onSubmit = (data: OrderForm) => {
    createOrder.mutate(
      {
        projectId: data.projectId,
        supplierId: data.supplierId,
        orderDate: data.orderDate,
        notes: data.notes || undefined,
        items: data.items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit: it.unit,
          unitPrice: Number(it.unitPrice),
        })),
      },
      {
        onSuccess: (order) => {
          toast.success('Pedido cadastrado', {
            description: `Total ${formatCurrency(order.totalValue)} · ${order.steps.length} aprovador(es) na cadeia.`,
          });
          reset();
          navigate('/aprovacoes');
        },
        onError: (e) =>
          toast.error('Não foi possível cadastrar', {
            description: e instanceof ApiError ? e.message : 'Tente novamente.',
          }),
      },
    );
  };

  if (projects.isLoading || suppliers.isLoading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Carregando…</div>;
  }
  if (projects.isError) return <ErrorState message={(projects.error as Error)?.message} onRetry={() => projects.refetch()} />;
  if (!projects.data?.length) {
    return (
      <EmptyState
        icon={HardHat}
        title="Nenhuma obra cadastrada"
        description="É preciso ter ao menos uma obra para criar um pedido. Cadastre uma obra (ou carregue os dados de demonstração)."
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold">Novo pedido de compra</h1>
        <p className="text-sm text-muted-foreground">A alçada é definida pelo valor total do pedido na obra.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-5">
          {/* Dados gerais */}
          <Card>
            <CardHeader>Dados gerais</CardHeader>
            <CardBody className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
              <div>
                <Label htmlFor="projectId" required>Obra</Label>
                <Controller
                  control={control}
                  name="projectId"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger invalid={!!errors.projectId} className="mt-1"><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                      <SelectContent>
                        {projects.data!.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="supplierId" required>Fornecedor</Label>
                <Controller
                  control={control}
                  name="supplierId"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger invalid={!!errors.supplierId} className="mt-1"><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
                      <SelectContent>
                        {suppliers.data!.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="orderDate" required>Data do pedido</Label>
                <Input id="orderDate" type="date" className="mt-1" aria-invalid={!!errors.orderDate} {...register('orderDate', { required: true })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes" optional>Observações internas</Label>
                <Textarea id="notes" className="mt-1 min-h-[64px]" placeholder="Justificativa ou complemento" {...register('notes')} />
              </div>
            </CardBody>
          </Card>

          {/* Itens */}
          <Card>
            <CardHeader className="justify-between">
              <span>Itens do pedido</span>
              <Button type="button" variant="secondary" size="sm" onClick={() => append(emptyItem)}>
                <Plus /> Adicionar item
              </Button>
            </CardHeader>
            <CardBody className="space-y-2.5">
              {fields.map((f, i) => {
                const e = errors.items?.[i];
                return (
                  <div key={f.id} className="rounded-lg border bg-card p-2.5">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_84px_80px_104px_auto] sm:items-start">
                      <div>
                        <Input placeholder="Descrição do item" aria-invalid={!!e?.description} {...register(`items.${i}.description`, { required: true })} />
                      </div>
                      <Input type="number" step="any" inputMode="decimal" placeholder="Qtd" className="num text-right" aria-invalid={!!e?.quantity}
                        {...register(`items.${i}.quantity`, { required: true, valueAsNumber: true, validate: (v) => Number(v) > 0 })} />
                      <Controller control={control} name={`items.${i}.unit`} render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                      <Input type="number" step="any" inputMode="decimal" placeholder="Preço" className="num text-right" aria-invalid={!!e?.unitPrice}
                        {...register(`items.${i}.unitPrice`, { required: true, valueAsNumber: true, validate: (v) => Number(v) >= 0 })} />
                      <Button type="button" variant="ghost" size="icon" aria-label="Remover item" disabled={fields.length === 1} onClick={() => remove(i)}
                        className="hover:bg-danger-muted hover:text-danger">
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <FieldError message={e ? 'Descrição, quantidade (> 0) e preço (≥ 0) são obrigatórios.' : undefined} />
                      <span className="num ml-auto text-xs text-muted-foreground">Total: {formatCurrency(lineTotal(items[i] ?? emptyItem))}</span>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </div>

        {/* Resumo */}
        <Card className="lg:sticky lg:top-6">
          <CardHeader>Resumo</CardHeader>
          <CardBody className="space-y-4">
            <div>
              <div className="text-2xs uppercase tracking-wide text-subtle-foreground">Total do pedido</div>
              <div className="num text-2xl font-semibold">{formatCurrency(total)}</div>
            </div>
            <div>
              <div className="mb-1.5 text-2xs uppercase tracking-wide text-subtle-foreground">Alçada prevista</div>
              {!projectId ? (
                <p className="text-xs text-subtle-foreground">Selecione a obra para ver a cadeia.</p>
              ) : preview ? (
                <div className="flex flex-wrap items-center gap-1 rounded-md bg-muted/60 p-2.5 text-xs">
                  {preview.approvers.map((a, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <ArrowRight className="size-3 text-subtle-foreground" />}
                      <span className="font-medium">{a}</span>
                    </span>
                  ))}
                  <span className="w-full pt-1 text-2xs text-subtle-foreground">{preview.label}</span>
                </div>
              ) : (
                <p className="rounded-md bg-warning-muted px-2.5 py-2 text-xs text-warning">
                  Nenhuma faixa de alçada cobre esse valor nesta obra. O cadastro será bloqueado.
                </p>
              )}
            </div>

            {missing.length > 0 && (
              <div className="flex gap-2.5 rounded-md bg-muted px-3 py-2.5">
                <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <p className="text-[12.5px] text-muted-foreground text-pretty">
                  Para cadastrar: {missing.join('; ')}.
                </p>
              </div>
            )}

            <Button type="submit" size="lg" className={cn('w-full')} loading={createOrder.isPending} aria-disabled={!isValid} disabled={!isValid}>
              Cadastrar pedido
            </Button>
          </CardBody>
        </Card>
      </div>
    </form>
  );
}
