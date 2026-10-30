'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import {
  Controller,
  FormProvider,
  type Path,
  useForm,
  useWatch,
} from 'react-hook-form';
import { toast } from 'sonner';
import { useViewer } from '@/components/providers/viewer-provider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api/client';
import {
  useCreatePurchaseOrder,
  useResolveRule,
  useSuppliers,
} from '@/lib/api/queries';
import type { Project } from '@/lib/api/types';
import { todayISO } from '@/lib/format';
import { currentStepOf } from '@/lib/orders';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { cn } from '@/lib/utils';
import {
  emptyItem,
  orderFormSchema,
  type OrderFormValues,
  orderTotalOf,
  pendingIssues,
  toCreateInput,
} from './order-form-schema';
import { OrderItems } from './order-items';
import {
  type ChainPreview,
  OrderSummary,
  OrderSummaryBar,
} from './order-summary';
import { SupplierCombobox } from './supplier-combobox';

function defaultValues(): OrderFormValues {
  // Calculado no navegador, na montagem do formulário (nunca no build/prerender).
  return {
    projectId: '',
    supplierId: '',
    orderDate: todayISO(),
    notes: '',
    items: [emptyItem()],
  };
}

export function NewOrderForm({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const { viewer } = useViewer();
  const suppliers = useSuppliers();
  const createOrder = useCreatePurchaseOrder();

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: defaultValues(),
    mode: 'onTouched', // erro aparece ao sair do campo, não enquanto a pessoa ainda digita
  });
  const {
    control,
    register,
    handleSubmit,
    setError,
    reset,
    formState,
    setFocus,
  } = form;

  /**
   * Clique numa pendência: mostra o erro em todos os campos com problema (mesmo os que a pessoa
   * ainda não visitou) e leva o foco até o campo. Simula uma tentativa de envio com uma ação vazia:
   * depois dela o formulário revalida cada campo a cada mudança, então o erro some assim que o
   * campo é corrigido (com trigger() o erro ficava preso nos campos ainda não tocados).
   */
  async function revealIssue(field?: string) {
    await handleSubmit(() => {})();
    if (field) setFocus(field as Path<OrderFormValues>);
  }
  const values = useWatch({ control }) as OrderFormValues;

  const projectId = values.projectId ? Number(values.projectId) : undefined;
  const project = projects.find((p) => p.id === projectId);
  const total = orderTotalOf(values.items);

  // Prévia da cadeia: mesma função da API (resolve), consultada só quando o total para de mudar.
  const debouncedTotal = useDebouncedValue(total, 350);
  const resolve = useResolveRule(projectId, debouncedTotal ?? undefined);
  const chain: ChainPreview = {
    hint: !projectId
      ? 'Selecione a obra para ver quem vai aprovar.'
      : total === null
        ? 'Disponível quando todos os itens tiverem quantidade e preço válidos.'
        : undefined,
    isLoading: resolve.isLoading || debouncedTotal !== total,
    isError: resolve.isError,
    data: resolve.data,
    projectId,
  };

  const issues = useMemo(() => {
    const list = pendingIssues(values);
    if (!viewer) {
      list.push({
        message: 'Selecione quem está fazendo o pedido em “Visualizando como”.',
      });
    }
    if (resolve.data && !resolve.data.matched && debouncedTotal === total) {
      list.push({
        message: 'Nenhuma faixa de alçada cobre o total do pedido nesta obra.',
      });
    }
    return list;
  }, [values, viewer, resolve.data, debouncedTotal, total]);

  function onSubmit(formValues: OrderFormValues) {
    if (!viewer) return;
    createOrder.mutate(toCreateInput(formValues, viewer.id), {
      onSuccess: (order) => {
        const first = currentStepOf(order);
        toast.success(`${order.code} cadastrado`, {
          description: first
            ? `Encaminhado para aprovação de ${first.approver.name}.`
            : undefined,
        });
        // A rota não desmonta ao navegar (Activity): limpa o formulário para o próximo pedido.
        reset(defaultValues());
        router.push(`/pedidos?destaque=${order.id}`);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.details.length > 0) {
          // Os caminhos de erro da API ("items.1.quantity") são os mesmos dos campos do formulário.
          for (const detail of error.details) {
            setError(detail.field as Path<OrderFormValues>, {
              message: detail.message,
            });
          }
        }
        toast.error('Não foi possível cadastrar o pedido', {
          description: error.message,
        });
        if (error instanceof ApiError && error.code === 'NO_APPROVAL_RULE') {
          void resolve.refetch(); // as faixas mudaram desde a prévia
        }
      },
    });
  }

  const fieldError = (
    name: 'projectId' | 'supplierId' | 'orderDate' | 'notes',
  ) => formState.errors[name]?.message;

  return (
    <FormProvider {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid gap-5 pb-40 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:pb-0"
      >
        <div className="min-w-0 space-y-5">
          <section
            aria-labelledby="general-title"
            className="rounded-xl border bg-card"
          >
            <header className="border-b px-5 py-3.5">
              <h2 id="general-title" className="text-sm font-semibold">
                Dados gerais
              </h2>
            </header>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <FormField
                label="Obra"
                required
                htmlFor="projectId"
                error={fieldError('projectId')}
              >
                <Controller
                  control={control}
                  name="projectId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        ref={field.ref}
                        id="projectId"
                        className="w-full"
                        aria-invalid={
                          fieldError('projectId') ? true : undefined
                        }
                        onBlur={field.onBlur}
                      >
                        <SelectValue placeholder="Selecione a obra…" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                            {p.coverage === 'NONE' && (
                              <span className="text-xs text-muted-foreground">
                                (sem alçadas)
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField
                label="Fornecedor"
                required
                htmlFor="supplierId"
                error={fieldError('supplierId')}
              >
                <Controller
                  control={control}
                  name="supplierId"
                  render={({ field }) => (
                    <SupplierCombobox
                      buttonRef={field.ref}
                      id="supplierId"
                      value={field.value}
                      suppliers={suppliers.data?.data ?? []}
                      isLoading={suppliers.isLoading}
                      isError={suppliers.isError}
                      onRetry={() => void suppliers.refetch()}
                      invalid={Boolean(fieldError('supplierId'))}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </FormField>

              <FormField
                label="Data do pedido"
                required
                htmlFor="orderDate"
                error={fieldError('orderDate')}
              >
                <Input
                  id="orderDate"
                  type="date"
                  aria-invalid={fieldError('orderDate') ? true : undefined}
                  {...register('orderDate')}
                />
              </FormField>

              <FormField
                label="Observações internas"
                htmlFor="notes"
                error={fieldError('notes')}
              >
                <Textarea
                  id="notes"
                  rows={2}
                  placeholder="Justifique a compra ou adicione informações para os aprovadores…"
                  aria-invalid={fieldError('notes') ? true : undefined}
                  {...register('notes')}
                />
              </FormField>
            </div>
          </section>

          <OrderItems />
        </div>

        <div className="hidden lg:block">
          <OrderSummary
            total={total}
            itemCount={values.items.length}
            projectName={project?.name}
            chain={chain}
            issues={issues}
            onIssueClick={revealIssue}
            isSubmitting={createOrder.isPending}
          />
        </div>
        <OrderSummaryBar
          total={total}
          itemCount={values.items.length}
          projectName={project?.name}
          chain={chain}
          issues={issues}
          onIssueClick={revealIssue}
          isSubmitting={createOrder.isPending}
        />
      </form>
    </FormProvider>
  );
}

function FormField({
  label,
  required,
  htmlFor,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor: string;
  error: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-[13px]">
        {label}
        {required && (
          <span className="text-primary" aria-label="obrigatório">
            *
          </span>
        )}
      </Label>
      {children}
      {error && (
        <p
          role="alert"
          className={cn('flex items-center gap-1 text-xs text-danger')}
        >
          <CircleAlert className="size-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
