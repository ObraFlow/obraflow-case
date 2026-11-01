import { z } from "zod";

const MAX_CENTS = 2_000_000_000;

export const orderInput = z.object({
  siteId: z.number().int().positive("Selecione a obra."),
  supplierId: z.number().int().positive("Selecione o fornecedor."),
  orderDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data do pedido inválida.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, "Data do pedido inválida."),
  notes: z.string().trim().max(2000).nullish(),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Descreva o material ou serviço.").max(300),
        quantity: z.number().finite().positive("A quantidade deve ser maior que zero.").max(1_000_000),
        unit: z.string().trim().min(1, "Informe a unidade.").max(10),
        unitPriceCents: z.number().int().min(0, "O preço unitário não pode ser negativo.").max(MAX_CENTS),
      }),
    )
    .min(1, "O pedido precisa ter ao menos um item."),
});

export const rulesInput = z
  .array(
    z.object({
      upTo: z.number().int().positive("O limite da faixa deve ser maior que zero.").max(MAX_CENTS).nullable(),
      approvers: z.array(z.number().int().positive()).min(1, "Toda faixa precisa de ao menos um aprovador."),
    }),
  )
  .superRefine((rules, ctx) => {
    const limits = rules.map((r) => r.upTo);
    if (limits.filter((l) => l === null).length > 1)
      ctx.addIssue({ code: "custom", message: "Só uma faixa pode ficar sem limite." });
    const finite = limits.filter((l): l is number => l !== null);
    if (new Set(finite).size !== finite.length)
      ctx.addIssue({ code: "custom", message: "Duas faixas não podem ter o mesmo limite." });
    rules.forEach((r) => {
      if (new Set(r.approvers).size !== r.approvers.length)
        ctx.addIssue({ code: "custom", message: "Um aprovador não pode repetir na mesma faixa." });
    });
  });

export const rejectInput = z.object({
  reason: z.string().trim().min(1, "Informe o motivo da rejeição."),
});

export const siteInput = z.object({
  name: z.string().trim().min(1, "Informe o nome da obra.").max(200),
});

export const supplierInput = z.object({
  name: z.string().trim().min(1, "Informe o nome do fornecedor.").max(200),
  taxId: z.string().trim().min(1, "Informe o identificador fiscal.").max(50),
});

export const userInput = z.object({
  name: z.string().trim().min(1, "Informe o nome do usuário.").max(200),
  email: z.string().trim().email("Informe um e-mail válido."),
});

export type OrderInput = z.infer<typeof orderInput>;
export type RulesInput = z.infer<typeof rulesInput>;
