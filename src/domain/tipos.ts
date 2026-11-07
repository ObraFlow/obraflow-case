/**
 * Tipos fundamentais do domínio de aprovações.
 *
 * Responsabilidade única: dar nome aos valores que o resto do domínio manipula, de modo que o
 * compilador recuse trocas silenciosas entre eles.
 *
 * Os tipos "marcados" abaixo são números em tempo de execução, mas incompatíveis entre si em
 * tempo de compilação: passar milésimos onde se espera centavos deixa de ser um erro que aparece
 * num total errado e passa a ser um erro que aparece ao escrever.
 */

declare const marca: unique symbol

type Marcado<T, M extends string> = T & { readonly [marca]: M }

/** Valor monetário em centavos. Nunca ponto flutuante. */
export type Centavos = Marcado<number, 'Centavos'>

/** Quantidade em milésimos: 2,5 kg = 2500. */
export type Milesimos = Marcado<number, 'Milesimos'>

/** Posição dentro de uma sequência ordenada (itens de um pedido, etapas de uma cadeia). */
export type Ordem = Marcado<number, 'Ordem'>

/**
 * O que um usuário pode fazer no sistema, independente de pedido.
 * Responde a pergunta anterior à alçada: a alçada diz quem assina este pedido, o papel diz quem
 * pode o quê.
 */
export const PAPEIS = ['admin', 'aprovador', 'comprador', 'visualizador'] as const
export type Papel = (typeof PAPEIS)[number]

/** Situação de um pedido ao longo do seu ciclo. */
export const SITUACOES_DO_PEDIDO = ['rascunho', 'pendente', 'aprovado', 'rejeitado'] as const
export type SituacaoDoPedido = (typeof SITUACOES_DO_PEDIDO)[number]

/** Situação de uma etapa da cadeia. */
export const SITUACOES_DA_ETAPA = ['pendente', 'aprovada', 'rejeitada'] as const
export type SituacaoDaEtapa = (typeof SITUACOES_DA_ETAPA)[number]

/**
 * SQLite não tem enum, e o schema grava estes campos como String. Estas funções são a fronteira
 * em que um texto vindo do banco vira um valor do domínio.
 */
export function ehPapel(valor: string): valor is Papel {
  return (PAPEIS as readonly string[]).includes(valor)
}

export function ehSituacaoDoPedido(valor: string): valor is SituacaoDoPedido {
  return (SITUACOES_DO_PEDIDO as readonly string[]).includes(valor)
}

export function ehSituacaoDaEtapa(valor: string): valor is SituacaoDaEtapa {
  return (SITUACOES_DA_ETAPA as readonly string[]).includes(valor)
}

/**
 * Resultado de uma operação que pode falhar por motivo previsto do domínio.
 *
 * Usado onde a falha é um caso e não um acidente — "sem regra aplicável" é estado legítimo do
 * sistema, não exceção. Exceção obrigaria o chamador a tratá-la como erro; esta união obriga-o a
 * tratá-la como possibilidade.
 */
export type Resultado<T, E> = { ok: true; valor: T } | { ok: false; erro: E }

export function sucesso<T>(valor: T): Resultado<T, never> {
  return { ok: true, valor }
}

export function falha<E>(erro: E): Resultado<never, E> {
  return { ok: false, erro }
}
