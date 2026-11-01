// Clientes do next-safe-action. Toda server action do projeto nasce de um destes dois.
//
// - `actionClient`: valida a entrada com Zod e traduz erros para o client.
// - `actionComUsuario`: além disso, lê o cookie "Agindo como" e injeta `ctx.usuarioId`.
//
// `handleServerError` é o único lugar que decide o que vaza para o browser: mensagem
// de ErroDominio (já em pt-BR) ou um texto genérico. Stack e detalhes ficam no log do server.

import { createSafeActionClient } from "next-safe-action";
import { ErroDominio } from "@/domain/erros";
import { usuarioAtualId } from "@/server/usuario-atual";

export const MENSAGEM_ERRO_INESPERADO = "Erro inesperado. Tente novamente.";
export const MENSAGEM_SEM_USUARIO = 'Selecione quem está agindo no seletor "Agindo como".';

/** Cookie ausente ou inválido. Não é erro de domínio: é do transporte (sem auth, sem sessão). */
class UsuarioNaoSelecionado extends Error {
  constructor() {
    super(MENSAGEM_SEM_USUARIO);
    this.name = "UsuarioNaoSelecionado";
  }
}

export const actionClient = createSafeActionClient({
  handleServerError(erro) {
    if (erro instanceof ErroDominio || erro instanceof UsuarioNaoSelecionado) {
      return erro.message;
    }
    console.error("[action] erro inesperado:", erro);
    return MENSAGEM_ERRO_INESPERADO;
  },
});

export const actionComUsuario = actionClient.use(async ({ next }) => {
  const usuarioId = await usuarioAtualId();
  if (usuarioId === null) throw new UsuarioNaoSelecionado();
  return next({ ctx: { usuarioId } });
});
