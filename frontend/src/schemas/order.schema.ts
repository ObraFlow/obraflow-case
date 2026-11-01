import { z } from 'zod';

export const orderItemSchema = z.object({
  description: z.string().trim().min(1, 'Informe a descrição do item.'),
  quantity: z.coerce.number().positive('A quantidade deve ser maior que zero.'),
  unit: z.string().trim().min(1, 'Informe a unidade.'),
  unitPrice: z.preprocess(
    (value) => (typeof value === 'string' ? value.replace(',', '.') : value),
    z.coerce.number().min(0, 'O preço não pode ser negativo.'),
  ),
});

export const createOrderSchema = z.object({
  workId: z.coerce.number().positive('Selecione uma obra.'),
  supplierId: z.coerce.number().positive('Selecione um fornecedor.'),
  orderDate: z.string().min(1, 'Informe a data do pedido.'),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'Adicione ao menos um item.'),
});

export const decideOrderSchema = z
  .object({
    userId: z.coerce.number().positive('Informe um aprovador válido.'),
    reason: z.string().optional(),
  })
  .refine(
    (data) => data.reason === undefined || data.reason.trim().length > 0,
    {
      message: 'Informe o motivo da rejeição.',
      path: ['reason'],
    },
  );
