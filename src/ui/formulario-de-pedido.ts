/**
 * O estado do formulário de pedido, fora de qualquer componente.
 *
 * Responsabilidade única: converter entre o que a pessoa digitou, o corpo que a rota recebe e o
 * pedido que a rota devolve — e dizer o que ainda falta. Nada aqui decide alçada: a faixa é
 * resolvida no servidor, na submissão (ADR 0001), e o componente não tem opinião sobre ela.
 *
 * Os valores vivem como **texto** porque é o que foi digitado: "2,5" não é 2.5 enquanto a pessoa
 * ainda está escrevendo, e converter cedo transforma uma vírgula em `NaN` no meio da digitação. A
 * leitura é sempre a do domínio (`Dinheiro.deEntrada`, `Quantidade.deEntrada`), nunca um segundo
 * parser — a tela precisa recusar exatamente o que a rota recusaria.
 */

import {
  Dinheiro,
  Pedido,
  Quantidade,
  Schemas,
  type CamposComErro,
  type Centavos,
} from '@/src/domain'
import type { ItemDoCorpo, CorpoDePedido } from './pedidos'
import type { PedidoPublico } from './tipos'

/** Uma linha do editor de itens. `chave` é identidade de React, não dado do pedido. */
export type ItemLocal = {
  chave: string
  descricao: string
  quantidade: string
  unidade: string
  precoUnitario: string
}

export type EstadoDoFormulario = {
  obraId: string
  fornecedorId: string
  /** "AAAA-MM-DD", o valor do `<input type="date">`; vazio enquanto não foi preenchida. */
  dataPedido: string
  observacoes: string
  itens: ItemLocal[]
}

let proximaChave = 0

export function itemEmBranco(): ItemLocal {
  proximaChave += 1
  return {
    chave: `item-${proximaChave}`,
    descricao: '',
    quantidade: '',
    unidade: Pedido.UNIDADE_PADRAO,
    precoUnitario: '',
  }
}

/** O formulário de um pedido novo: um item em branco, como o artboard desenha. */
export function formularioEmBranco(): EstadoDoFormulario {
  return { obraId: '', fornecedorId: '', dataPedido: '', observacoes: '', itens: [itemEmBranco()] }
}

/**
 * O rascunho gravado, de volta ao formulário.
 *
 * É o que faz "salvar, sair e voltar" devolver o que foi preenchido. Os números voltam ao
 * formato de entrada pelos mesmos conversores que o servidor usa para revalidar o rascunho na
 * submissão — `formatar` agruparia o milhar e 1.200 unidades voltariam como 1,2.
 */
export function formularioDoPedido(pedido: PedidoPublico): EstadoDoFormulario {
  return {
    obraId: pedido.obraId ?? '',
    fornecedorId: pedido.fornecedorId ?? '',
    dataPedido: pedido.dataPedido ? Schemas.dataParaEntrada(new Date(pedido.dataPedido)) : '',
    observacoes: pedido.observacoes ?? '',
    itens:
      pedido.itens.length > 0
        ? pedido.itens.map((item) => ({
            ...itemEmBranco(),
            descricao: item.descricao,
            quantidade:
              item.quantidadeMilesimos > 0
                ? textoDeQuantidade(item.quantidadeMilesimos)
                : '',
            unidade: item.unidade,
            precoUnitario:
              item.precoUnitarioCentavos !== null
                ? textoDeDinheiro(item.precoUnitarioCentavos)
                : '',
          }))
        : [itemEmBranco()],
  }
}

/** "2,5" e não "2.500": é o que o campo mostra e o que `Quantidade.deEntrada` lê de volta. */
export function textoDeQuantidade(milesimos: number): string {
  return Quantidade.formatar(Quantidade.deMilesimos(milesimos))
}

/** "1.234,56" sem o símbolo: o campo tem o "R$" ao lado, como no artboard. */
export function textoDeDinheiro(centavos: number): string {
  return Dinheiro.formatar(centavos as Centavos).replace(/^R\$\s*/, '')
}

/**
 * O corpo da escrita. Campo em branco é **omitido**, não enviado vazio: o rascunho é incompleto
 * por natureza, e um `""` seria uma afirmação de valor onde não há nenhum.
 */
export function corpoDoFormulario(estado: EstadoDoFormulario): CorpoDePedido {
  return {
    ...(estado.obraId ? { obraId: estado.obraId } : {}),
    ...(estado.fornecedorId ? { fornecedorId: estado.fornecedorId } : {}),
    ...(estado.dataPedido ? { dataPedido: estado.dataPedido } : {}),
    ...(estado.observacoes.trim() ? { observacoes: estado.observacoes } : {}),
    itens: estado.itens.map(itemDoCorpo),
  }
}

function itemDoCorpo(item: ItemLocal): ItemDoCorpo {
  return {
    ...(item.descricao.trim() ? { descricao: item.descricao } : {}),
    ...(item.quantidade.trim() ? { quantidade: item.quantidade } : {}),
    ...(item.unidade ? { unidade: item.unidade } : {}),
    ...(item.precoUnitario.trim() ? { precoUnitario: item.precoUnitario } : {}),
  }
}

/**
 * O total de uma linha, ou `null` quando a linha ainda não é um item.
 *
 * `null` é o travessão do artboard, e é o que mantém o item inválido **fora** da soma: somar
 * meia linha mostraria um total que o servidor não confirmaria, e é pelo total que a alçada é
 * decidida.
 */
export function totalDoItem(item: ItemLocal): Centavos | null {
  const quantidade = Quantidade.deEntrada(item.quantidade)
  const preco = Dinheiro.deEntrada(item.precoUnitario)
  if (quantidade === null || preco === null) return null
  // Quantidade estritamente positiva; preço não negativo — zero é preço válido.
  if (!Quantidade.ehPositiva(quantidade) || preco < 0) return null
  if (preco > Schemas.MAX_PRECO_CENTAVOS) return null
  return Pedido.totalDoItem(preco, quantidade)
}

/** A soma dos itens válidos — a mesma regra que o servidor aplica ao gravar. */
export function totalExibido(estado: EstadoDoFormulario): Centavos {
  return Dinheiro.somar(
    ...estado.itens.map(totalDoItem).filter((total): total is Centavos => total !== null),
  )
}

/**
 * O que o `submissaoSchema` recusaria neste formulário, já no formato que a tela ancora no
 * input: `{ 'itens.2.quantidade': '…' }`.
 *
 * É o **mesmo** schema que a rota roda. Validar aqui não dispensa o servidor de validar —
 * dispensa a pessoa de descobrir no envio o que já dava para saber antes dele, e garante que as
 * duas pontas nunca discordem sobre o que é um pedido válido.
 */
export function problemasDoFormulario(estado: EstadoDoFormulario): CamposComErro {
  const analise = Schemas.validarSubmissao(corpoDoFormulario(estado))
  return analise.ok ? {} : (analise.erro.campos ?? {})
}

/**
 * A frase que explica por que o envio está bloqueado.
 *
 * Um motivo por vez, e o primeiro na ordem em que a tela está desenhada: uma lista de tudo o que
 * falta é lida como reprovação, e quem preenche só precisa saber qual é o próximo passo.
 */
export function motivoDoBloqueio(estado: EstadoDoFormulario): string | null {
  const problemas = problemasDoFormulario(estado)

  // Linha em branco não é item, e a tela sempre mostra ao menos uma. Sem este caso, um
  // formulário sem nenhum item preenchido reclamaria da descrição do item 1 — que é verdade e
  // não é o ponto: o que falta é um item.
  if (estado.itens.every(estaEmBranco)) return 'O pedido precisa de ao menos um item preenchido.'

  if (problemas.obraId) return problemas.obraId
  if (problemas.fornecedorId) return problemas.fornecedorId
  if (problemas.dataPedido) return problemas.dataPedido
  if (problemas.itens) return problemas.itens
  if (problemas.observacoes) return problemas.observacoes

  const porItem = Object.keys(problemas)
    .filter((chave) => chave.startsWith('itens.'))
    .sort(porPosicao)

  if (porItem.length > 0) {
    const indice = Number(porItem[0].split('.')[1])
    return `Item ${indice + 1}: ${problemas[porItem[0]]}`
  }

  return Object.values(problemas)[0] ?? null
}

function estaEmBranco(item: ItemLocal): boolean {
  return (
    item.descricao.trim() === '' &&
    item.quantidade.trim() === '' &&
    item.precoUnitario.trim() === ''
  )
}

function porPosicao(a: string, b: string): number {
  return Number(a.split('.')[1]) - Number(b.split('.')[1])
}

/** A chave com que o servidor e a tela nomeiam o mesmo campo de um item. */
export function campoDoItem(indice: number, campo: keyof ItemLocal): string {
  return `itens.${indice}.${campo === 'precoUnitario' ? 'precoUnitario' : campo}`
}

/**
 * As chaves de erro que esta tela sabe ancorar num input.
 *
 * `obraId`, `fornecedorId`, `dataPedido`, `observacoes` e os quatro campos de cada item existente — e nada
 * mais. A lista é derivada do estado, e não escrita à mão, porque ela encolhe quando um item é
 * removido: `itens.3.quantidade` deixa de ter onde acender assim que o item 4 some.
 */
export function chavesAncoradas(estado: EstadoDoFormulario): ReadonlySet<string> {
  const chaves = new Set(['obraId', 'fornecedorId', 'dataPedido', 'observacoes'])
  for (let indice = 0; indice < estado.itens.length; indice += 1) {
    for (const campo of CAMPOS_DO_ITEM) chaves.add(campoDoItem(indice, campo))
  }
  return chaves
}

const CAMPOS_DO_ITEM = ['descricao', 'quantidade', 'unidade', 'precoUnitario'] as const

/**
 * As recusas do servidor que **não** têm input correspondente, já em forma de frase.
 *
 * Existem porque o servidor é livre para recusar um campo que esta tela não desenha — `_` para a
 * raiz do corpo, um campo novo de uma versão adiante, um item que já foi removido daqui. Sem
 * este caminho a mensagem simplesmente sumiria: a chave não casaria com input nenhum e o
 * formulário ficaria recusado sem dizer por quê. O critério é esse — nunca some.
 */
export function mensagensSemAncora(
  campos: CamposComErro,
  estado: EstadoDoFormulario,
): string[] {
  const ancoradas = chavesAncoradas(estado)
  return Object.entries(campos)
    .filter(([chave]) => !ancoradas.has(chave))
    .map(([, mensagem]) => mensagem)
}
