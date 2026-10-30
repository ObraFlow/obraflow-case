import { z } from 'zod';
import type { CreatePurchaseOrderInput, Unit } from '@/lib/api/types';
import { itemTotal, orderTotal, parseDecimalInput } from '@/lib/money';

// Validação do formulário de pedido — as mesmas regras da API (purchase-order.dto.ts), com as mesmas
// mensagens. A API valida de novo: o front valida para dar feedback imediato e habilitar o botão.

export const UNITS: Unit[] = ['un', 'kg', 'm', 'm2', 'm3', 'h', 'sc', 'l'];

const QUANTITY_DECIMALS = 3;
const MONEY_DECIMALS = 2;

const itemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, { error: 'Informe a descrição do item.', abort: true })
    .min(2, 'A descrição deve ter entre 2 e 200 caracteres.')
    .max(200, 'A descrição deve ter entre 2 e 200 caracteres.'),
  quantity: z
    .string()
    .trim()
    .min(1, { error: 'Informe a quantidade.', abort: true })
    .refine((value) => {
      const parsed = parseDecimalInput(value, QUANTITY_DECIMALS);
      return parsed !== null && Number(parsed) > 0;
    }, 'A quantidade deve ser maior que zero (até 3 casas decimais).'),
  unit: z.enum(UNITS as [Unit, ...Unit[]], { error: 'Selecione a unidade.' }),
  unitPrice: z
    .string()
    .trim()
    .min(1, { error: 'Informe o preço unitário.', abort: true })
    .refine(
      (value) => parseDecimalInput(value, MONEY_DECIMALS) !== null,
      'Preço inválido: use um valor maior ou igual a zero, com até 2 casas decimais.',
    ),
});

export const orderFormSchema = z.object({
  projectId: z.string().min(1, 'Selecione a obra.'),
  supplierId: z.string().min(1, 'Selecione o fornecedor.'),
  orderDate: z
    .string()
    .min(1, 'Informe a data do pedido.')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.'),
  notes: z
    .string()
    .max(1000, 'As observações devem ter no máximo 1000 caracteres.'),
  items: z.array(itemSchema).min(1, 'O pedido precisa ter pelo menos 1 item.'),
});

export type OrderFormValues = z.input<typeof orderFormSchema>;
export type OrderItemValues = OrderFormValues['items'][number];

export function emptyItem(): OrderItemValues {
  return { description: '', quantity: '', unit: 'un', unitPrice: '' };
}

/** Total do item, ou null enquanto quantidade/preço não forem válidos. */
export function itemTotalOf(item: OrderItemValues): string | null {
  const quantity = parseDecimalInput(item.quantity, QUANTITY_DECIMALS);
  const unitPrice = parseDecimalInput(item.unitPrice, MONEY_DECIMALS);
  if (quantity === null || unitPrice === null || Number(quantity) <= 0) {
    return null;
  }
  return itemTotal(quantity, unitPrice);
}

/** Total do pedido, ou null se algum item ainda não tem total válido. */
export function orderTotalOf(items: OrderItemValues[]): string | null {
  const totals = items.map(itemTotalOf);
  if (totals.length === 0 || totals.some((total) => total === null))
    return null;
  return orderTotal(totals as string[]);
}

export interface PendingIssue {
  /** Caminho do campo no formulário ("items.1.quantity"); ausente para pendências gerais. */
  field?: string;
  message: string;
}

/** Lista de pendências (mostrada embaixo do botão enquanto ele está desabilitado). */
export function pendingIssues(values: OrderFormValues): PendingIssue[] {
  const result = orderFormSchema.safeParse(values);
  if (result.success) return [];
  // Uma pendência por campo (a primeira mensagem, que é a mais relevante).
  const seenFields = new Set<string>();
  const issues: PendingIssue[] = [];
  for (const issue of result.error.issues) {
    const field = issue.path.join('.');
    if (seenFields.has(field)) continue;
    seenFields.add(field);
    const [name, index] = issue.path;
    issues.push({
      field,
      message:
        name === 'items' && typeof index === 'number'
          ? `Item ${index + 1}: ${lowerFirst(issue.message)}`
          : issue.message,
    });
  }
  return issues;
}

function lowerFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Valores do formulário → payload da API (decimais no formato "1234.56"). */
export function toCreateInput(
  values: OrderFormValues,
  requesterId: number,
): CreatePurchaseOrderInput {
  return {
    projectId: Number(values.projectId),
    supplierId: Number(values.supplierId),
    requesterId,
    orderDate: values.orderDate,
    notes: values.notes.trim() || undefined,
    items: values.items.map((item) => ({
      description: item.description.trim(),
      quantity: parseDecimalInput(item.quantity, QUANTITY_DECIMALS)!,
      unit: item.unit,
      unitPrice: parseDecimalInput(item.unitPrice, MONEY_DECIMALS)!,
    })),
  };
}
