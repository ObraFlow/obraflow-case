import { z } from "zod";

// Validate scale and range before PostgreSQL can coerce/round a NUMERIC value.
export function decimalString(integerDigits: number, scale: number, positive = false) {
  return z
    .string()
    .regex(
      new RegExp(`^\\d{1,${integerDigits}}(?:\\.\\d{1,${scale}})?$`),
      "Informe um decimal com ponto, dentro da precisão permitida.",
    )
    .refine((value) => !positive || /[1-9]/.test(value), "Informe um valor maior que zero.");
}

// NUMERIC(18,2): the largest amount any total or CoA limit can hold.
export const amountSchema = decimalString(16, 2);
