// Seletor "Agindo como" (sem autenticação por escopo do desafio).

import { z } from "zod";
import { idSchema } from "./comum";

export const agirComoSchema = z.object({ usuarioId: idSchema });

export type AgirComoInput = z.infer<typeof agirComoSchema>;
