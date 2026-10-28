// Pedaços de schema reaproveitados pelos casos de uso. Zod v4.
// Mensagens em pt-BR porque são exibidas direto no campo do formulário.

import { z } from "zod";
import { MAX_CENTS } from "@/domain/pedido/calcularTotais";

/** Id de banco (Int autoincrement). Aceita número ou texto numérico (vem de <select> e de query string). */
export const idSchema = z.coerce
  .number({ error: "Selecione uma opção." })
  .int("Id inválido.")
  .positive("Selecione uma opção.");

/** Dinheiro em centavos inteiros, zero ou positivo, dentro do `Int` do banco. */
export const centavosSchema = z
  .number({ error: "Informe um valor." })
  .int("Valor deve estar em centavos inteiros.")
  .nonnegative("Valor não pode ser negativo.")
  .max(MAX_CENTS, "Valor acima do limite suportado (R$ 21.474.836,47).");

/** Data "AAAA-MM-DD" existente no calendário (z.iso.date já rejeita 2026-02-30). */
export const dataSchema = z.iso.date({
  error: (issue) =>
    issue.input === undefined || issue.input === "" ? "Informe a data." : "Data inválida.",
});

/**
 * Quantidade como texto decimal ("150", "2,5", "0.750"): até 9 dígitos inteiros e 3 casas.
 * O domínio (`quantidadeParaMilesimos`) faz a conversão; aqui só barramos o formato cedo.
 */
export const quantidadeSchema = z
  .string({ error: "Informe a quantidade." })
  .trim()
  .regex(
    /^\d{1,9}([.,]\d{1,3})?$/,
    "Quantidade deve ser um número positivo com até 3 casas decimais.",
  )
  .refine((texto) => Number(texto.replace(",", ".")) > 0, "Quantidade deve ser maior que zero.");
