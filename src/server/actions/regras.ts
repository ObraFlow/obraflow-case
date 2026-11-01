"use server";

import { revalidatePath } from "next/cache";
import { removerFaixaSchema, salvarFaixaSchema } from "@/lib/schemas/regra";
import { actionComUsuario } from "@/server/actions/client";
import { removerFaixa, salvarFaixa } from "@/server/services/regras";

/** Cria ou edita uma faixa. FaixaSobreposta/FaixaInvalida chegam ao form como `serverError`. */
export const salvarFaixaAction = actionComUsuario
  .inputSchema(salvarFaixaSchema)
  .action(async ({ parsedInput }) => {
    const regra = await salvarFaixa(parsedInput);
    revalidatePath("/regras");
    return regra;
  });

export const removerFaixaAction = actionComUsuario
  .inputSchema(removerFaixaSchema)
  .action(async ({ parsedInput }) => {
    await removerFaixa(parsedInput.id);
    revalidatePath("/regras");
    return { removida: true };
  });
