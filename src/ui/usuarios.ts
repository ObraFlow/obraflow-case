/**
 * As três chamadas que a sessão de demonstração precisa, num lugar só.
 *
 * Nenhuma delas toca estado de React: quem chama decide o que fazer com o sucesso e com a
 * falha. É o que permite ao efeito usá-las sem chamar `setState` no próprio corpo.
 */

import { ehPapel } from '@/src/domain'
import type { UsuarioPublico } from './tipos'

function ehUsuario(valor: unknown): valor is UsuarioPublico {
  if (typeof valor !== 'object' || valor === null) return false
  const u = valor as Record<string, unknown>
  return typeof u.id === 'string' && typeof u.nome === 'string' && typeof u.papel === 'string' && ehPapel(u.papel)
}

export async function pegarUsuarios(): Promise<UsuarioPublico[]> {
  const resposta = await fetch('/api/usuarios')
  if (!resposta.ok) throw new Error(String(resposta.status))
  const dados: unknown = await resposta.json()
  if (!Array.isArray(dados)) throw new Error('formato inesperado')
  return dados.filter(ehUsuario)
}

export async function entrarComo(usuarioId: string): Promise<UsuarioPublico> {
  const resposta = await fetch('/api/sessao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuarioId }),
  })
  if (!resposta.ok) throw new Error(String(resposta.status))
  const dados: unknown = await resposta.json()
  const usuario = (dados as { usuario?: unknown })?.usuario
  if (!ehUsuario(usuario)) throw new Error('resposta sem usuário')
  return usuario
}

export async function sair(): Promise<void> {
  const resposta = await fetch('/api/sessao', { method: 'DELETE' })
  if (!resposta.ok) throw new Error(String(resposta.status))
}

/** Filtro do campo de busca do modal: nome ou papel, sem acento e sem caixa. */
export function filtrarPessoas(usuarios: UsuarioPublico[], texto: string): UsuarioPublico[] {
  const alvo = normalizar(texto)
  if (!alvo) return usuarios
  return usuarios.filter((u) => normalizar(`${u.nome} ${u.papel}`).includes(alvo))
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
}
