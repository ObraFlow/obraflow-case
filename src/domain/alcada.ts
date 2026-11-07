/**
 * Resolução da faixa aplicável a um pedido.
 *
 * Responsabilidade única: dado o total de um pedido e as faixas de uma obra, dizer qual faixa o
 * comporta — ou que nenhuma comporta.
 *
 * Este módulo não monta cadeia e não sabe decidir. Separá-los não é cerimônia: a regra de qual
 * faixa se aplica (ADR 0002) muda por um motivo, a derivação da cadeia por outro. Juntos, mexer
 * num obrigaria a reler o outro.
 */

import * as Dinheiro from './dinheiro'
import type { Centavos, Ordem, Resultado } from './tipos'
import { falha, sucesso } from './tipos'
import { erro, type ErroDominio } from './erros'

/** Um aprovador dentro de uma faixa, com a posição que ocupará na cadeia. */
export type Aprovador = {
  readonly usuarioId: string
  readonly ordem: Ordem
}

/**
 * Uma faixa da alçada de uma obra.
 *
 * `limiteCentavos` nulo é a faixa aberta: cobre todo valor acima da faixa anterior. Não existe
 * limite inferior, e a ausência é a invariante do ADR 0002 — sem mínimo explícito, buraco e
 * sobreposição entre faixas deixam de ser representáveis.
 */
export type Faixa = {
  readonly id: string
  readonly limiteCentavos: Centavos | null
  readonly aprovadores: readonly Aprovador[]
}

export type Alcada = {
  readonly obraId: string
  readonly faixas: readonly Faixa[]
}

/**
 * Ordena as faixas pelo limite superior, com a faixa aberta sempre por último.
 *
 * A ordenação é derivada e não armazenada: uma coluna de ordem poderia divergir do limite, e
 * então duas fontes diriam coisas diferentes sobre a mesma regra.
 */
export function faixasOrdenadas(alcada: Alcada): readonly Faixa[] {
  return [...alcada.faixas].sort((a, b) => {
    if (a.limiteCentavos === null) return 1
    if (b.limiteCentavos === null) return -1
    return a.limiteCentavos - b.limiteCentavos
  })
}

/**
 * O limite superior é **inclusivo**: um pedido de exatamente R$ 10.000,00 pertence à faixa
 * "até R$ 10.000,00".
 *
 * Esta única linha é a parte da regra que mais erra na prática, e é por isso que ela tem nome.
 */
export function comporta(faixa: Faixa, total: Centavos): boolean {
  return faixa.limiteCentavos === null || total <= faixa.limiteCentavos
}

/**
 * Resolve a faixa aplicável a um total.
 *
 * Devolve falha com `SEM_REGRA_APLICAVEL` quando a obra não tem faixas, quando o total excede o
 * limite da faixa mais alta, ou quando a faixa que o comporta não tem aprovador nenhum — uma
 * faixa sem aprovador não produz cadeia, e uma cadeia vazia aprovaria o pedido sem ninguém
 * assinar.
 *
 * O estado "sem regra aplicável" é legítimo, não acidente: impede a submissão e não impede que o
 * rascunho continue existindo.
 */
export function resolverFaixa(alcada: Alcada, total: Centavos): Resultado<Faixa, ErroDominio> {
  const ordenadas = faixasOrdenadas(alcada)

  if (ordenadas.length === 0) {
    return falha(
      erro('SEM_REGRA_APLICAVEL', 'Esta obra ainda não tem faixas de alçada cadastradas.'),
    )
  }

  const encontrada = ordenadas.find((faixa) => comporta(faixa, total))

  if (!encontrada) {
    const maisAlta = ordenadas[ordenadas.length - 1]
    return falha(
      erro(
        'SEM_REGRA_APLICAVEL',
        `O total de ${Dinheiro.formatar(total)} excede o limite da faixa mais alta desta obra, ` +
          `de ${Dinheiro.formatar(maisAlta.limiteCentavos as Centavos)}.`,
      ),
    )
  }

  if (encontrada.aprovadores.length === 0) {
    return falha(
      erro('SEM_REGRA_APLICAVEL', 'A faixa aplicável a este total não tem nenhum aprovador.'),
    )
  }

  return sucesso(encontrada)
}

/**
 * Uma obra admite no máximo uma faixa aberta. Duas deixariam ambíguo quem assina acima do último
 * limite finito — e a ambiguidade só apareceria na submissão, longe de onde foi criada.
 */
export function temFaixaAbertaDuplicada(alcada: Alcada): boolean {
  return alcada.faixas.filter((f) => f.limiteCentavos === null).length > 1
}

// --- regras de edição da alçada ----------------------------------------------------------------
//
// O que vem abaixo responde à pergunta oposta à de `resolverFaixa`: não "qual faixa se aplica a
// este total", e sim "este desenho de faixa pode ser gravado nesta obra". São regras de domínio e
// não de banco porque nenhuma delas é expressável como constraint: a segunda faixa aberta e o
// limite repetido dependem das *outras* faixas da obra, e a unicidade parcial que o SQLite
// ofereceria ainda devolveria erro de driver em vez de erro de campo.

/** Teto declarado na SPEC: no máximo 20 faixas por obra. */
export const MAX_FAIXAS_POR_OBRA = 20

/** Teto declarado na SPEC: no máximo 10 aprovadores por faixa. */
export const MAX_APROVADORES_POR_FAIXA = 10

/**
 * Uma faixa como ela chega da tela: limite e nada mais. `id` presente significa substituição —
 * a faixa já existe e sai do cálculo de conflito consigo mesma.
 */
export type FaixaProposta = {
  readonly id?: string
  readonly limiteCentavos: Centavos | null
}

/** A alçada como ficaria se a proposta fosse gravada. Nada é persistido aqui. */
export function comFaixaProposta(alcada: Alcada, proposta: FaixaProposta): Alcada {
  const outras = alcada.faixas.filter((f) => f.id !== proposta.id)
  const projetada: Faixa = {
    id: proposta.id ?? '(nova)',
    limiteCentavos: proposta.limiteCentavos,
    aprovadores: [],
  }
  return { obraId: alcada.obraId, faixas: [...outras, projetada] }
}

/**
 * Recusa o desenho que a alçada não comporta, ou `null` quando ele cabe.
 *
 * Três recusas, todas ancoradas em `limiteCentavos` porque é o campo que a pessoa muda para
 * resolver qualquer uma delas:
 *
 * 1. **segunda faixa aberta** — duas faixas sem teto deixariam ambíguo quem assina acima do
 *    último limite finito, e a ambiguidade só apareceria na submissão, longe de onde nasceu;
 * 2. **limite repetido** — duas faixas com o mesmo limite superior descrevem o mesmo intervalo
 *    com cadeias diferentes, e a ordenação não teria como desempatá-las;
 * 3. **teto de faixas** — o limite da SPEC, cobrado só na criação.
 */
export function conflitoNaAlcada(alcada: Alcada, proposta: FaixaProposta): ErroDominio | null {
  const ehNova = proposta.id === undefined

  if (ehNova && alcada.faixas.length >= MAX_FAIXAS_POR_OBRA) {
    return erro(
      'VALIDACAO',
      `Esta obra já tem o máximo de ${MAX_FAIXAS_POR_OBRA} faixas.`,
      { limiteCentavos: `Máximo de ${MAX_FAIXAS_POR_OBRA} faixas por obra.` },
    )
  }

  const projetada = comFaixaProposta(alcada, proposta)

  if (temFaixaAbertaDuplicada(projetada)) {
    return erro('VALIDACAO', 'Esta obra já tem uma faixa sem teto.', {
      limiteCentavos: 'Já existe uma faixa sem teto nesta obra. Informe um valor máximo.',
    })
  }

  const limites = projetada.faixas
    .map((f) => f.limiteCentavos)
    .filter((limite): limite is Centavos => limite !== null)

  if (new Set(limites).size !== limites.length) {
    return erro('VALIDACAO', 'Já existe uma faixa com este limite nesta obra.', {
      limiteCentavos: 'Já existe uma faixa com este valor máximo nesta obra.',
    })
  }

  return null
}

/**
 * O piso implícito de uma faixa: o limite da faixa imediatamente abaixo, mais um centavo.
 *
 * Não existe coluna de valor mínimo (ADR 0002) — o início de uma faixa é sempre derivado das
 * outras faixas da obra. É aqui, e não no componente, porque a mesma derivação serve à tabela, ao
 * campo "valor mínimo" do formulário e à pré-visualização da cadeia: três cópias divergiriam.
 *
 * `excetoId` tira do cálculo a faixa que está sendo editada, que senão seria o próprio piso de
 * si mesma quando o limite não muda.
 */
export function pisoImplicito(
  alcada: Alcada,
  limiteCentavos: Centavos | null,
  excetoId?: string,
): Centavos {
  const abaixo = alcada.faixas
    .filter((f) => f.id !== excetoId)
    .map((f) => f.limiteCentavos)
    .filter((limite): limite is Centavos => limite !== null)
    .filter((limite) => limiteCentavos === null || limite < limiteCentavos)

  const anterior = abaixo.length > 0 ? Math.max(...abaixo) : 0
  return Dinheiro.deCentavos(anterior + 1)
}

/**
 * Como a faixa é lida na tela: o título que a nomeia e o intervalo que ela cobre.
 *
 * A faixa aberta é descrita pelo limite da anterior — "Acima de R$ 10.000,00" —, e não por um
 * valor próprio, porque ela não tem nenhum: o que a define é onde a anterior termina.
 */
export function faixaDescrita(
  alcada: Alcada,
  faixa: Faixa,
): { readonly titulo: string; readonly intervalo: string } {
  const piso = pisoImplicito(alcada, faixa.limiteCentavos, faixa.id)

  if (faixa.limiteCentavos === null) {
    const anterior = Dinheiro.deCentavos(piso - 1)
    return {
      titulo: anterior === 0 ? 'Qualquer valor' : `Acima de ${Dinheiro.formatar(anterior)}`,
      intervalo: `${Dinheiro.formatar(piso)} — sem teto`,
    }
  }

  return {
    titulo: `Até ${Dinheiro.formatar(faixa.limiteCentavos)}`,
    intervalo: `${Dinheiro.formatar(piso)} — ${Dinheiro.formatar(faixa.limiteCentavos)}`,
  }
}
