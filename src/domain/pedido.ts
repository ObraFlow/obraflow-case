/**
 * O pedido de compra: os seus itens, o seu total e o que a submissão precisa decidir.
 *
 * Responsabilidade única: dizer quanto vale um pedido e o que acontece quando ele é submetido —
 * sem tocar em banco, em `Request` e em Prisma. A rota lê a sessão, lê as linhas e traduz o
 * resultado; a aritmética e a regra ficam aqui.
 *
 * Três coisas moram neste arquivo, e nenhuma delas cabia em `dinheiro.ts` ou `cadeia.ts`:
 *
 * 1. a **reindexação** dos itens pela posição no array, que é o que torna `PUT` uma substituição
 *    e dispensa o cliente de administrar a coluna `ordem`;
 * 2. a **imutabilidade** do pedido submetido, que é uma recusa de domínio (`PEDIDO_IMUTAVEL`) e
 *    não um detalhe de rota;
 * 3. o **plano de submissão** — resolver a faixa pelo total e montar a cadeia —, que junta
 *    `Alcada.resolverFaixa` e `Cadeia.montarCadeia` numa decisão só, para que a transação da
 *    rota não precise conhecer a ordem em que as duas acontecem.
 */

import * as Alcada from './alcada'
import * as Cadeia from './cadeia'
import * as Dinheiro from './dinheiro'
import * as Quantidade from './quantidade'
import { dataParaEntrada, type Unidade } from './schemas'
import { erro, type ErroDominio } from './erros'
import type { Centavos, Milesimos, Ordem, Resultado, SituacaoDoPedido } from './tipos'
import { falha, sucesso } from './tipos'

/** A unidade de quem não escolheu nenhuma: o rascunho é incompleto por natureza. */
export const UNIDADE_PADRAO: Unidade = 'un'

/**
 * Um item como o rascunho o aceita: tudo pode faltar.
 *
 * É o que `rascunhoSchema` deixa passar, e a permissividade é deliberada — uma linha meio
 * digitada tem que sobreviver ao "salvar e voltar depois", senão a interrupção na obra continua
 * custando o trabalho feito.
 */
export type ItemParcial = {
  readonly descricao?: string
  readonly quantidade?: Milesimos
  readonly unidade?: Unidade
  readonly precoUnitario?: Centavos
}

/** Um item como a tabela o guarda: quatro campos, a ordem e o total já calculado. */
export type LinhaDeItem = {
  readonly descricao: string
  readonly quantidadeMilesimos: Milesimos
  readonly unidade: Unidade
  /** `null` enquanto o rascunho não informou o preço. Zero é preço válido, não ausência. */
  readonly precoUnitarioCentavos: Centavos | null
  readonly totalCentavos: Centavos
  readonly ordem: Ordem
}

/**
 * O total de uma linha. Delegado a `Dinheiro.porMilesimos`, que arredonda uma única vez sobre o
 * produto inteiro — arredondar antes faria a soma dos itens divergir do total do pedido, e é
 * essa divergência que o aprovador enxerga.
 */
export function totalDoItem(preco: Centavos, quantidade: Milesimos): Centavos {
  return Dinheiro.porMilesimos(preco, quantidade)
}

/**
 * Converte os itens do corpo em linhas da tabela.
 *
 * A `ordem` é **a posição no array**, sempre. Ordem enviada pelo cliente é ignorada, e ordem
 * repetida deixa de ser representável: é o mesmo princípio dos aprovadores de uma faixa, e é o
 * que faz a substituição inteira bastar.
 *
 * Quantidade que falta vira zero, que a submissão recusa (ela exige quantidade maior que zero).
 * Preço que falta vira `null`, e **não** zero: o enunciado aceita preço zero, e gravar a
 * ausência como zero faria um item sem preço passar pela submissão como se custasse R$ 0,00. O
 * rascunho guarda a linha incompleta; a submissão a recusa.
 */
export function linhasDeItens(itens: readonly ItemParcial[]): readonly LinhaDeItem[] {
  return itens.map((item, indice) => {
    const quantidadeMilesimos = item.quantidade ?? Quantidade.deMilesimos(0)
    const precoUnitarioCentavos = item.precoUnitario ?? null
    const completo = item.quantidade !== undefined && precoUnitarioCentavos !== null

    return {
      descricao: item.descricao ?? '',
      quantidadeMilesimos,
      unidade: item.unidade ?? UNIDADE_PADRAO,
      precoUnitarioCentavos,
      totalCentavos: completo
        ? totalDoItem(precoUnitarioCentavos as Centavos, quantidadeMilesimos)
        : Dinheiro.ZERO,
      ordem: indice as Ordem,
    }
  })
}

/**
 * O total do pedido: a soma dos totais dos itens, e nada mais.
 *
 * É o **único** valor que determina a alçada (GLOSSARY, verbete "Total do pedido"). Um
 * `totalCentavos` vindo do cliente nunca chega aqui — a rota não o lê.
 */
export function totalDosItens(linhas: readonly { readonly totalCentavos: Centavos }[]): Centavos {
  return Dinheiro.somar(...linhas.map((linha) => linha.totalCentavos))
}

export function ehRascunho(situacao: SituacaoDoPedido): boolean {
  return situacao === 'rascunho'
}

/**
 * A recusa de escrever num pedido já submetido, ou `null` quando a escrita cabe.
 *
 * Depois da submissão, cabeçalho e itens são imutáveis — é invariante do modelo, e não existe
 * cancelamento: desfazer é rejeitar. A recusa é de domínio e tem código próprio
 * (`PEDIDO_IMUTAVEL`, 409), para a tela saber distinguir "não pode mais" de "não é seu".
 */
export function conflitoDeImutabilidade(situacao: SituacaoDoPedido): ErroDominio | null {
  if (ehRascunho(situacao)) return null
  return erro(
    'PEDIDO_IMUTAVEL',
    'Este pedido já foi submetido: cabeçalho e itens não mudam mais. Para desfazê-lo, ' +
      'é preciso rejeitá-lo.',
  )
}

/** O que a submissão decide, antes de qualquer escrita. */
export type PlanoDeSubmissao = {
  readonly totalCentavos: Centavos
  readonly faixa: Alcada.Faixa
  readonly cadeia: Cadeia.Cadeia
}

/**
 * Resolve a faixa pelo total e monta a cadeia — nesta ordem, e uma vez só.
 *
 * É aqui que o ADR 0001 vira código: a cadeia nasce da faixa **resolvida na submissão**, e o
 * plano devolvido carrega a faixa inteira para que a rota grave o snapshot a partir dela em vez
 * de reler a regra depois. Nenhuma leitura posterior recalcula coisa alguma.
 *
 * A falha é `SEM_REGRA_APLICAVEL` e é estado legítimo: impede a submissão e não toca no
 * rascunho, que continua existindo para ser corrigido.
 */
export function planejarSubmissao(
  alcada: Alcada.Alcada,
  linhas: readonly LinhaDeItem[],
): Resultado<PlanoDeSubmissao, ErroDominio> {
  const totalCentavos = totalDosItens(linhas)

  const resolvida = Alcada.resolverFaixa(alcada, totalCentavos)
  if (!resolvida.ok) return falha(resolvida.erro)

  return sucesso({
    totalCentavos,
    faixa: resolvida.valor,
    cadeia: Cadeia.montarCadeia(resolvida.valor),
  })
}

/**
 * O rascunho gravado, no formato que `submissaoSchema` sabe ler.
 *
 * A submissão não recebe corpo: o que ela valida é o rascunho que está no banco. Para isso as
 * linhas voltam ao formato de entrada por `Dinheiro.paraEntrada` e `Quantidade.paraEntrada` — e
 * não por `formatar`, que agruparia o milhar e faria 1.200 unidades voltarem como 1,2.
 *
 * Revalidar o que já está gravado parece redundante e não é: o rascunho foi aceito por um schema
 * permissivo, e é aqui que a exigência passa a ser total. Um único schema, um único lugar.
 */
export function entradaDeSubmissao(cabecalho: {
  readonly obraId: string | null
  readonly fornecedorId: string | null
  readonly dataPedido: Date | null
  readonly observacoes: string | null
  readonly itens: readonly LinhaDeItem[]
}): Record<string, unknown> {
  return {
    obraId: cabecalho.obraId ?? undefined,
    fornecedorId: cabecalho.fornecedorId ?? undefined,
    // A data volta a "AAAA-MM-DD" pelo mesmo caminho que a tela usa, para atravessar o schema.
    dataPedido: cabecalho.dataPedido ? dataParaEntrada(cabecalho.dataPedido) : undefined,
    observacoes: cabecalho.observacoes ?? undefined,
    itens: cabecalho.itens.map((linha) => ({
      descricao: linha.descricao,
      quantidade: Quantidade.paraEntrada(linha.quantidadeMilesimos),
      unidade: linha.unidade,
      // Preço ausente fica ausente, e a submissão o recusa com "Informe o preço unitário."
      precoUnitario:
        linha.precoUnitarioCentavos === null
          ? undefined
          : Dinheiro.paraEntrada(linha.precoUnitarioCentavos),
    })),
  }
}

/**
 * A recusa de decidir um pedido que não tem cadeia, ou `null` quando há o que decidir.
 *
 * Só o rascunho cai aqui: ele não tem etapa nenhuma, porque a cadeia é gravada na submissão
 * (ADR 0001). A recusa é `CADEIA_CONCLUIDA` e não `NAO_ENCONTRADO` porque o pedido **existe** —
 * o que não existe é cadeia, e a tela precisa distinguir "não há o que decidir aqui" de "este
 * pedido não é visível para você". É a mesma forma de `conflitoDeImutabilidade`: uma situação
 * entra, uma recusa sai, e a rota não escolhe código.
 */
export function conflitoParaDecidir(situacao: SituacaoDoPedido): ErroDominio | null {
  if (!ehRascunho(situacao)) return null
  return erro(
    'CADEIA_CONCLUIDA',
    'Este pedido ainda é rascunho: a cadeia de aprovação só existe depois da submissão.',
  )
}
