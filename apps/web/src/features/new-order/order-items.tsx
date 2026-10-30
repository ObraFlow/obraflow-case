'use client';

import { CircleAlert, Plus, X } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatBRL, UNIT_LABELS } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  emptyItem,
  itemTotalOf,
  type OrderFormValues,
  orderTotalOf,
  UNITS,
} from './order-form-schema';

// Uma marcação só para os dois layouts: linha de tabela no desktop (md+) e card no celular.
const ROW_GRID =
  'grid grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem_8rem_8.5rem_2rem] md:items-start md:gap-x-2';

export function OrderItems() {
  const { control } = useFormContext<OrderFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' });
  const total = orderTotalOf(items);

  const addItem = () => append(emptyItem(), { shouldFocus: true });

  return (
    <section
      aria-labelledby="items-title"
      className="rounded-xl border bg-card"
    >
      <header className="flex items-center justify-between border-b px-5 py-3.5">
        <h2 id="items-title" className="text-sm font-semibold">
          Itens do pedido
        </h2>
        <Badge variant="secondary" className="rounded-md tabular-nums">
          {fields.length} {fields.length === 1 ? 'item' : 'itens'}
        </Badge>
      </header>

      <div className="space-y-3 p-4 md:space-y-2 md:px-5">
        <div
          aria-hidden="true"
          className={cn(
            ROW_GRID,
            'hidden px-0.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase',
            fields.length > 0 && 'md:grid',
          )}
        >
          <span>Descrição</span>
          <span className="text-right">Qtd.</span>
          <span>Un.</span>
          <span className="text-right">Preço unit.</span>
          <span className="text-right">Total</span>
          <span />
        </div>

        {fields.length === 0 && (
          <div
            role="alert"
            className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-danger-border bg-danger-soft/50 px-4 py-6 text-center"
          >
            <CircleAlert className="size-5 text-danger" aria-hidden="true" />
            <p className="text-sm font-medium text-danger-strong">
              O pedido precisa ter pelo menos 1 item.
            </p>
            <p className="text-xs text-muted-foreground">
              Adicione um item para poder cadastrar o pedido.
            </p>
          </div>
        )}

        <ol className="space-y-3 md:space-y-2">
          {fields.map((field, index) => (
            <ItemRow
              key={field.id}
              index={index}
              isLast={index === fields.length - 1}
              onRemove={() => remove(index)}
              onAddAfter={addItem}
            />
          ))}
        </ol>

        <div className="flex flex-wrap items-end justify-between gap-3 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 text-primary hover:text-primary"
            onClick={addItem}
          >
            <Plus aria-hidden="true" />
            Adicionar item
          </Button>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total geral</p>
            <p className="text-xl font-bold tabular-nums" aria-live="polite">
              {total === null ? '—' : formatBRL(total)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ItemRow({
  index,
  isLast,
  onRemove,
  onAddAfter,
}: {
  index: number;
  isLast: boolean;
  onRemove: () => void;
  onAddAfter: () => void;
}) {
  const { control, register, getFieldState, formState } =
    useFormContext<OrderFormValues>();
  const item = useWatch({ control, name: `items.${index}` });
  const total = itemTotalOf(item);
  const number = index + 1;

  const errorOf = (field: 'description' | 'quantity' | 'unit' | 'unitPrice') =>
    getFieldState(`items.${index}.${field}`, formState).error?.message;
  const errors = {
    description: errorOf('description'),
    quantity: errorOf('quantity'),
    unit: errorOf('unit'),
    unitPrice: errorOf('unitPrice'),
  };
  const errorId = (field: string) => `item-${index}-${field}-error`;

  // Enter no preço da última linha adiciona um item novo (lançamento rápido pelo teclado).
  function onPriceKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && isLast) {
      event.preventDefault();
      onAddAfter();
    }
  }

  return (
    <li
      aria-label={`Item ${number}`}
      className={cn(
        ROW_GRID,
        'rounded-lg border bg-muted/30 p-3 md:rounded-none md:border-0 md:bg-transparent md:p-0',
      )}
    >
      <div className="col-span-2 flex items-center justify-between md:hidden">
        <span className="text-xs font-semibold text-muted-foreground">
          Item {number}
        </span>
      </div>

      <Field
        label="Descrição"
        htmlFor={`item-${index}-description`}
        error={errors.description}
        errorId={errorId('description')}
        className="col-span-2 md:col-span-1"
      >
        <Input
          id={`item-${index}-description`}
          placeholder="Material ou serviço"
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={
            errors.description ? errorId('description') : undefined
          }
          {...register(`items.${index}.description`)}
        />
      </Field>

      <Field
        label="Quantidade"
        htmlFor={`item-${index}-quantity`}
        error={errors.quantity}
        errorId={errorId('quantity')}
      >
        <Input
          id={`item-${index}-quantity`}
          inputMode="decimal"
          placeholder="0"
          className="text-right tabular-nums"
          aria-invalid={errors.quantity ? true : undefined}
          aria-describedby={errors.quantity ? errorId('quantity') : undefined}
          {...register(`items.${index}.quantity`)}
        />
      </Field>

      <Field
        label="Unidade"
        htmlFor={`item-${index}-unit`}
        error={errors.unit}
        errorId={errorId('unit')}
      >
        <Controller
          control={control}
          name={`items.${index}.unit`}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                ref={field.ref}
                id={`item-${index}-unit`}
                className="w-full"
                aria-invalid={errors.unit ? true : undefined}
                onBlur={field.onBlur}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {UNIT_LABELS[unit]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field
        label="Preço unitário"
        htmlFor={`item-${index}-price`}
        error={errors.unitPrice}
        errorId={errorId('unitPrice')}
        className="col-span-2 md:col-span-1"
      >
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted-foreground">
            R$
          </span>
          <Input
            id={`item-${index}-price`}
            inputMode="decimal"
            placeholder="0,00"
            className="pl-8 text-right tabular-nums"
            aria-invalid={errors.unitPrice ? true : undefined}
            aria-describedby={
              errors.unitPrice ? errorId('unitPrice') : undefined
            }
            onKeyDown={onPriceKeyDown}
            {...register(`items.${index}.unitPrice`)}
          />
        </div>
      </Field>

      <div className="col-span-2 flex items-center justify-between border-t pt-2 md:col-span-1 md:block md:border-0 md:pt-0">
        <span className="text-xs text-muted-foreground md:sr-only">
          Total do item
        </span>
        {/* Calculado (quantidade × preço): não é um campo editável. */}
        <output
          aria-label={`Total do item ${number}`}
          className="flex h-8 items-center justify-end rounded-md text-sm font-semibold tabular-nums md:bg-muted md:px-3"
        >
          {total === null ? (
            <span className="font-normal text-muted-foreground">—</span>
          ) : (
            formatBRL(total)
          )}
        </output>
      </div>

      <div className="col-span-2 flex justify-end md:col-span-1">
        <RemoveButton number={number} onClick={onRemove} />
      </div>
    </li>
  );
}

function RemoveButton({
  number,
  onClick,
}: {
  number: number;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-label={`Remover item ${number}`}
      className="h-8 text-muted-foreground hover:bg-danger-soft hover:text-danger md:w-8 md:px-0"
    >
      <X aria-hidden="true" />
      <span className="md:hidden">Remover</span>
    </Button>
  );
}

function Field({
  label,
  htmlFor,
  error,
  errorId,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error: string | undefined;
  errorId: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground md:sr-only"
      >
        {label}
      </label>
      {children}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1 text-xs text-danger"
        >
          <CircleAlert className="mt-px size-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
