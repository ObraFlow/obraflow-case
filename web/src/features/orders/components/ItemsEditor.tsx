import { PackageOpen, Plus, Trash2 } from 'lucide-react'
import {
  useFieldArray,
  useFormState,
  useWatch,
  type Control,
  type FieldError as RhfFieldError,
  type UseFormRegister,
} from 'react-hook-form'
import { FieldError } from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatBRL, itemTotal } from '@/lib/money'
import { cn } from '@/lib/utils'
import { emptyItem, type OrderFormInput, type OrderFormOutput } from '../schemas'

const UNITS = ['un', 'kg', 'g', 't', 'm', 'm²', 'm³', 'L', 'h', 'dia', 'sc', 'cx', 'pç', 'vb']

/** Field labels are lighter than the item header, so each item reads as one block. */
const fieldLabel = 'text-xs font-medium text-muted-foreground'

interface ItemsEditorProps {
  control: Control<OrderFormInput, unknown, OrderFormOutput>
  register: UseFormRegister<OrderFormInput>
}

export function ItemsEditor({ control, register }: ItemsEditorProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = useWatch({ control, name: 'items' })
  const { errors, touchedFields, isSubmitted } = useFormState({ control })

  /** Errors only show after the user left the field (or tried to submit). */
  function errorFor(index: number, field: keyof OrderFormInput['items'][number]) {
    const touched = touchedFields.items?.[index]?.[field]
    const error = errors.items?.[index]?.[field] as RhfFieldError | undefined
    return touched || isSubmitted ? error?.message : undefined
  }

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-8 text-center">
        <PackageOpen className="size-6 text-destructive" aria-hidden />
        <p className="text-sm font-medium text-destructive" role="alert">
          O pedido precisa de pelo menos um item.
        </p>
        <Button type="button" variant="outline" onClick={() => append(emptyItem)}>
          <Plus />
          Adicionar item
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <datalist id="units">
        {UNITS.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>

      <ol className="space-y-3">
        {fields.map((field, index) => {
          const id = `item-${field.id}`
          const total = items[index]
            ? itemTotal(items[index].quantity, items[index].unitPrice)
            : null
          const descriptionError = errorFor(index, 'description')
          const quantityError = errorFor(index, 'quantity')
          const unitError = errorFor(index, 'unit')
          const priceError = errorFor(index, 'unitPrice')
          const hasError = descriptionError || quantityError || unitError || priceError
          const title = items[index]?.description.trim()

          return (
            <li
              key={field.id}
              aria-label={`Item ${index + 1}`}
              className={cn(
                'space-y-3 rounded-lg border p-3 sm:p-4',
                hasError ? 'border-destructive/40 bg-destructive/[0.02]' : 'bg-muted/20',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      'truncate text-sm font-semibold',
                      !title && 'font-normal text-muted-foreground italic',
                    )}
                  >
                    {title || 'Novo item'}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="-my-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 />
                  Remover
                  <span className="sr-only"> item {index + 1}</span>
                </Button>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`${id}-description`} className={fieldLabel}>
                  Descrição
                </Label>
                <Input
                  id={`${id}-description`}
                  placeholder="Ex.: Cimento CP-II 50 kg"
                  aria-invalid={!!descriptionError}
                  aria-describedby={`${id}-description-error`}
                  {...register(`items.${index}.description`)}
                />
                <FieldError id={`${id}-description-error`} message={descriptionError} />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_0.8fr_1.2fr_1.2fr]">
                <div className="space-y-1">
                  <Label htmlFor={`${id}-quantity`} className={fieldLabel}>
                    Quantidade
                  </Label>
                  <Input
                    id={`${id}-quantity`}
                    inputMode="decimal"
                    placeholder="0"
                    className="text-right tabular-nums"
                    aria-invalid={!!quantityError}
                    aria-describedby={`${id}-quantity-error`}
                    {...register(`items.${index}.quantity`)}
                  />
                  <FieldError id={`${id}-quantity-error`} message={quantityError} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`${id}-unit`} className={fieldLabel}>
                    Unidade
                  </Label>
                  <Input
                    id={`${id}-unit`}
                    list="units"
                    placeholder="un"
                    autoComplete="off"
                    aria-invalid={!!unitError}
                    aria-describedby={`${id}-unit-error`}
                    {...register(`items.${index}.unit`)}
                  />
                  <FieldError id={`${id}-unit-error`} message={unitError} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`${id}-price`} className={fieldLabel}>
                    Preço unitário
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id={`${id}-price`}
                      inputMode="decimal"
                      placeholder="0,00"
                      className="pl-8 text-right tabular-nums"
                      aria-invalid={!!priceError}
                      aria-describedby={`${id}-price-error`}
                      {...register(`items.${index}.unitPrice`)}
                    />
                  </div>
                  <FieldError id={`${id}-price-error`} message={priceError} />
                </div>

                {/* Calculated, never editable. */}
                <div className="space-y-1">
                  <span className={cn('block leading-none', fieldLabel)}>Total do item</span>
                  <output
                    htmlFor={`${id}-quantity ${id}-price`}
                    aria-live="polite"
                    className="mt-1 flex h-8 items-center justify-end rounded-lg bg-muted px-2.5 text-sm font-medium tabular-nums"
                  >
                    {total ? formatBRL(total) : '—'}
                  </output>
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <Button type="button" variant="outline" onClick={() => append(emptyItem)}>
        <Plus />
        Adicionar item
      </Button>
    </div>
  )
}
