// Usuário "Agindo como": sem autenticação por escopo do desafio, quem está usando o sistema
// é escolhido no header e guardado em cookie. Em produção isto viria da sessão autenticada.
//
// `cookies()` é assíncrono no Next 16 e é uma API de request: com `cacheComponents`, quem
// chama precisa estar dentro de um <Suspense>, e nunca dentro de "use cache".

import { cookies } from "next/headers";
import type { UsuarioDto } from "@/lib/dto";
import { listarUsuarios } from "@/server/services/cadastros";

export const COOKIE_AGINDO_COMO = "agindo-como";

/**
 * Id do usuário escolhido, ou null se o cookie não existe, está inválido ou aponta para um
 * usuário que não existe mais (banco recriado, cookie editado). A lista de usuários vem do
 * cache de cadastros, então a conferência não custa uma consulta por request.
 */
export async function usuarioAtualId(): Promise<number | null> {
  return (await usuarioAtual())?.id ?? null;
}

/** Usuário escolhido com nome e cargo (para o header), ou null. */
export async function usuarioAtual(): Promise<UsuarioDto | null> {
  const store = await cookies();
  const valor = store.get(COOKIE_AGINDO_COMO)?.value;
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) return null;
  const usuarios = await listarUsuarios();
  return usuarios.find((usuario) => usuario.id === id) ?? null;
}

/** Grava o cookie. Só pode ser chamado em server action ou route handler. */
export async function definirUsuarioAtual(usuarioId: number): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_AGINDO_COMO, String(usuarioId), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}
