"use server";

import { revalidatePath } from "next/cache";
import { NaoEncontrado } from "@/domain/erros";
import { agirComoSchema } from "@/lib/schemas/usuario";
import { actionClient } from "@/server/actions/client";
import { listarUsuarios } from "@/server/services/cadastros";
import { definirUsuarioAtual } from "@/server/usuario-atual";

/**
 * Troca o "Agindo como". Usa `actionClient` (sem exigir usuário) porque é justamente
 * a action que define quem é o usuário. Revalida o layout inteiro: header e telas
 * mudam de acordo com quem está agindo.
 */
export const agirComoAction = actionClient
  .inputSchema(agirComoSchema)
  .action(async ({ parsedInput }) => {
    const usuarios = await listarUsuarios();
    const usuario = usuarios.find((candidato) => candidato.id === parsedInput.usuarioId);
    if (!usuario) throw new NaoEncontrado("Usuário");

    await definirUsuarioAtual(usuario.id);
    revalidatePath("/", "layout");
    return usuario;
  });
