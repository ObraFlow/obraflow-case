import { z } from "zod";
import type { Role } from "./roles.js";

// Request body enforced identically by the API and the admin form.
export const createUserSchema = z
  .object({
    displayName: z.string().trim().min(1, "Informe o nome de exibição.").max(120, "Use no máximo 120 caracteres."),
    username: z
      .string()
      .trim()
      .min(2, "Use ao menos 2 caracteres.")
      .max(64, "Use no máximo 64 caracteres.")
      .regex(/^[\p{L}\p{N}._-]+$/u, "Use letras, números, ponto, hífen ou sublinhado."),
    password: z.string().min(8, "Use ao menos 8 caracteres.").max(256, "Use no máximo 256 caracteres."),
  })
  .strict();

export interface Identity {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}
export interface UserSummary extends Identity {
  isActive: boolean;
}
