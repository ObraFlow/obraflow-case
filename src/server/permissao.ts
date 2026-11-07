/**
 * Matriz de permissão dos quatro papéis.
 *
 * Responsabilidade única: responder se um papel pode executar uma ação, e ser o **único** lugar
 * onde essa resposta existe. Esconder item de menu não é controle de acesso: a tela consulta esta
 * mesma matriz para decidir o que desenhar, mas é a rota que a consulta para decidir o que
 * permitir.
 *
 * A matriz é declarada como `Record<Papel, Record<Acao, boolean>>` de propósito. Acrescentar um
 * papel em `PAPEIS` sem mapeá-lo aqui, ou uma ação sem decidi-la para cada papel, deixa de
 * compilar — o compilador cobra a decisão em vez de assumir `false` em silêncio.
 */

import type { Papel } from '@/src/domain'

export const ACOES = [
  /** Ver a lista e o detalhe de pedidos. */
  'ver_pedidos',
  /** Criar e editar rascunho. */
  'criar_pedido',
  /** Submeter um rascunho, resolvendo a faixa e gravando a cadeia. */
  'submeter_pedido',
  /** Aprovar ou rejeitar uma etapa. Ser aprovador da vez é exigência *além* desta. */
  'decidir',
  /** Criar, editar, reordenar e remover faixas da alçada de uma obra. */
  'gerir_alcada',
  /** Ler a contagem agregada de pedidos por situação — o painel da administração. */
  'ver_resumo',
  /** Cadastrar obra e fornecedor — a tela Empresa. */
  'gerir_cadastros',
] as const

export type Acao = (typeof ACOES)[number]

export const MATRIZ: Readonly<Record<Papel, Readonly<Record<Acao, boolean>>>> = {
  admin: {
    ver_pedidos: true,
    criar_pedido: false,
    submeter_pedido: false,
    decidir: false,
    gerir_alcada: true,
    ver_resumo: true,
    gerir_cadastros: true,
  },
  aprovador: {
    ver_pedidos: true,
    criar_pedido: false,
    submeter_pedido: false,
    decidir: true,
    gerir_alcada: false,
    ver_resumo: false,
    gerir_cadastros: false,
  },
  comprador: {
    ver_pedidos: true,
    criar_pedido: true,
    submeter_pedido: true,
    decidir: false,
    gerir_alcada: false,
    ver_resumo: false,
    gerir_cadastros: false,
  },
  visualizador: {
    ver_pedidos: true,
    criar_pedido: false,
    submeter_pedido: false,
    decidir: false,
    gerir_alcada: false,
    ver_resumo: false,
    gerir_cadastros: false,
  },
}

/**
 * Aceita a ausência de papel porque é o caso mais comum na borda: rota protegida sem sessão.
 * Ausência é recusa — e a recusa é 403 SEM_PERMISSAO, nunca 401, porque não há autenticação a
 * exigir neste case.
 */
export function pode(papel: Papel | null | undefined, acao: Acao): boolean {
  if (!papel) return false
  return MATRIZ[papel][acao] === true
}

/** O que um papel pode, em forma serializável — é o que a tela recebe para montar o menu. */
export function permissoesDe(papel: Papel | null | undefined): Record<Acao, boolean> {
  return Object.fromEntries(ACOES.map((acao) => [acao, pode(papel, acao)])) as Record<Acao, boolean>
}
