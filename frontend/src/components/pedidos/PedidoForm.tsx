'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition, useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatCurrency, UNIDADES } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/forms/FormField';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ObraResultado, FornecedorResultado } from '@/lib/api';
import { api } from '@/lib/api';
import { format } from 'date-fns';

const itemSchema = z.object({
  descricao: z.string().min(1, 'Descrição obrigatória').max(255),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  unidade: z.string().min(1, 'Unidade obrigatória').max(10),
  precoUnitario: z.number().min(0, 'Preço não pode ser negativo'),
});

const pedidoSchema = z.object({
  obraId: z.string().uuid('Selecione uma obra'),
  fornecedorId: z.string().uuid('Selecione um fornecedor'),
  dataPedido: z.date(),
  observacoes: z.string().max(1000).optional(),
  itens: z.array(itemSchema).min(1, 'Adicione pelo menos um item'),
});

type PedidoFormData = z.infer<typeof pedidoSchema>;
type ItemFormData = z.infer<typeof itemSchema>;

const defaultItem: ItemFormData = {
  descricao: '',
  quantidade: 1,
  unidade: 'un',
  precoUnitario: 0,
};

export function PedidoForm({
  obras,
  fornecedores,
}: {
  obras: ObraResultado[];
  fornecedores: FornecedorResultado[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;
  const [, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<PedidoFormData>({
    resolver: zodResolver(pedidoSchema),
    mode: 'onChange',
    defaultValues: {
      obraId: '',
      fornecedorId: '',
      dataPedido: new Date(),
      observacoes: '',
      itens: [defaultItem],
    },
  });

  const { control, watch, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'itens' });

  const itens = watch('itens');
  const total = itens.reduce((sum, item) => sum + (item.quantidade * item.precoUnitario), 0);

  const onSubmit = async (data: PedidoFormData) => {
    setSubmitError(null);
    startTransition(async () => {
      try {
        await api.createPedido({
          obraId: data.obraId,
          fornecedorId: data.fornecedorId,
          dataPedido: data.dataPedido.toISOString(),
          observacoes: data.observacoes || null,
          itens: data.itens.map(i => ({
            descricao: i.descricao,
            quantidade: i.quantidade,
            unidade: i.unidade,
            precoUnitario: i.precoUnitario,
          })),
        }, accessToken);
        router.push('/pedidos');
        router.refresh();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Erro ao criar pedido');
      }
    });
  };

  const addItem = () => {
    append(defaultItem);
  };

  const removeItem = (index: number) => {
    if (fields.length <= 1) return;
    remove(index);
  };

  const calculateItemTotal = (item: ItemFormData) => {
    return item.quantidade * item.precoUnitario;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Novo Pedido de Compra</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Preencha os dados do pedido e adicione os itens</p>
        </div>
      </div>

      {submitError && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700 dark:bg-danger-900/30 dark:text-danger-400"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Dados Gerais + Resumo (Two column on lg) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left Column - Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados Gerais</CardTitle>
                <CardDescription>Informações principais do pedido</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  label="Obra"
                  required
                  error={errors.obraId?.message}
                >
                  <Controller
                    control={control}
                    name="obraId"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a obra" />
                        </SelectTrigger>
                        <SelectContent>
                          {obras.map((obra) => (
                            <SelectItem key={obra.id} value={obra.id}>
                              {obra.codigo} - {obra.nome}
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
                  error={errors.fornecedorId?.message}
                >
                  <Controller
                    control={control}
                    name="fornecedorId"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o fornecedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {fornecedores.map((forn) => (
                            <SelectItem key={forn.id} value={forn.id}>
                              {forn.nome} {forn.documento && `(${forn.documento})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                <FormField
                  label="Data do Pedido"
                  required
                  error={errors.dataPedido?.message}
                >
                  <Controller
                    control={control}
                    name="dataPedido"
                    render={({ field }) => (
                      <Input
                        type="date"
                        value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        onBlur={field.onBlur}
                        disabled={form.formState.isSubmitting}
                      />
                    )}
                  />
                </FormField>

                <FormField
                  label="Observações Internas"
                  hint="Máximo 1000 caracteres"
                  error={errors.observacoes?.message}
                >
                  <Controller
                    control={control}
                    name="observacoes"
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="Justificativa ou complemento da solicitação..."
                        maxLength={1000}
                        disabled={form.formState.isSubmitting}
                      />
                    )}
                  />
                </FormField>
              </CardContent>
            </Card>

            {/* Itens do Pedido */}
            <Card>
              <CardHeader className="flex flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Itens do Pedido</CardTitle>
                  <CardDescription>Adicione um ou mais itens ao pedido</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  disabled={form.formState.isSubmitting}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Item
                </Button>
              </CardHeader>
              <CardContent>
                {fields.length === 0 && (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                    Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                  </div>
                )}

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8 text-center">#</TableHead>
                        <TableHead className="min-w-[250px]">Descrição *</TableHead>
                        <TableHead className="w-28 text-center">Qtd *</TableHead>
                        <TableHead className="w-24 text-center">Un *</TableHead>
                        <TableHead className="w-36 text-right">Preço Unit. *</TableHead>
                        <TableHead className="w-36 text-right">Total</TableHead>
                        <TableHead className="w-12 text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell className="text-center font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <Controller
                              control={control}
                              name={`itens.${index}.descricao`}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  aria-label="Descrição *"
                                  placeholder="Descrição do material ou serviço"
                                  disabled={form.formState.isSubmitting}
                                  aria-invalid={!!errors.itens?.[index]?.descricao}
                                />
                              )}
                            />
                            {errors.itens?.[index]?.descricao && (
                              <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                                {errors.itens[index].descricao.message}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Controller
                              control={control}
                              name={`itens.${index}.quantidade`}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  aria-label="Qtd *"
                                  type="number"
                                  step="0.0001"
                                  min="0.0001"
                                  className="w-full text-center"
                                  disabled={form.formState.isSubmitting}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  aria-invalid={!!errors.itens?.[index]?.quantidade}
                                />
                              )}
                            />
                            {errors.itens?.[index]?.quantidade && (
                              <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                                {errors.itens[index].quantidade.message}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Controller
                              control={control}
                              name={`itens.${index}.unidade`}
                              render={({ field }) => (
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger className="w-full" aria-label="Unidade *">
                                    <SelectValue placeholder="Un" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {UNIDADES.map((u) => (
                                      <SelectItem key={u} value={u}>{u}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            {errors.itens?.[index]?.unidade && (
                              <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                                {errors.itens[index].unidade.message}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Controller
                              control={control}
                              name={`itens.${index}.precoUnitario`}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  aria-label="Preço Unit. *"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="w-full text-right"
                                  disabled={form.formState.isSubmitting}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  aria-invalid={!!errors.itens?.[index]?.precoUnitario}
                                />
                              )}
                            />
                            {errors.itens?.[index]?.precoUnitario && (
                              <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                                {errors.itens[index].precoUnitario.message}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatCurrency(calculateItemTotal({
                              descricao: '',
                              quantidade: watch(`itens.${index}.quantidade`) || 0,
                              unidade: '',
                              precoUnitario: watch(`itens.${index}.precoUnitario`) || 0,
                            }))}
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              disabled={fields.length <= 1 || form.formState.isSubmitting}
                              className="text-neutral-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/30 p-1.5 rounded transition-colors"
                              aria-label={`Remover item ${index + 1}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Total do Pedido */}
                <div className="mt-4 flex justify-end">
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 min-w-[280px]">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-neutral-600 dark:text-neutral-400">Subtotal</span>
                      <span className="font-medium">{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-neutral-200 dark:border-neutral-700 pt-2">
                      <span>Total do Pedido</span>
                      <span className="text-primary-600 dark:text-primary-400">{formatCurrency(total)}</span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 text-center">
                      Valor usado para selecionar a regra de alçada
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Resumo (Sticky on lg) */}
          <div className="lg:sticky lg:top-24 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
                <CardDescription>Revise antes de enviar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Itens
                  </label>
                  <p className="font-medium">{fields.length} item{fields.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Total do Pedido
                  </label>
                  <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {formatCurrency(total)}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Valor usado para selecionar a regra de alçada
                  </p>
                </div>
                {fields.length === 0 && (
                  <div className="rounded-lg bg-warning-50 p-3 dark:bg-warning-900/30">
                    <p className="text-sm text-warning-700 dark:text-warning-400">
                      Adicione pelo menos um item para continuar
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.back()}
                  disabled={form.formState.isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!form.formState.isValid || form.formState.isSubmitting}
                >
                  Cadastrar Pedido
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

export type { ObraResultado, FornecedorResultado } from '@/lib/api';