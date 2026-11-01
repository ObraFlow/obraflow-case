import { z } from "zod";

export const createSupplierSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome do fornecedor.").max(150, "Use no máximo 150 caracteres."),
  })
  .strict();

export interface SupplierSummary {
  id: string;
  name: string;
  isActive: boolean;
}

// Renaming accepts the same body as creation.
export const renameSupplierSchema = createSupplierSchema;
