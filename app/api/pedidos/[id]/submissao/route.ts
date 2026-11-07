/**
 * A submissão de um rascunho.
 *
 * É o instante em que o pedido passa a valer: validado por inteiro, com `submetidoEm` carimbado
 * pelo servidor, a faixa resolvida pelo total e a cadeia gravada como snapshot (ADR 0001).
 * Depois dela, cabeçalho e itens são imutáveis, e desfazer é rejeitar — não existe cancelamento.
 *
 * **Duas datas, dois significados.** `dataPedido` é a data de emissão que quem compra declara no
 * formulário — obrigatória, gravada pelo rascunho e **não** tocada aqui. `submetidoEm` é o
 * horário do servidor no instante da submissão: o registro auditável de quando o pedido entrou
 * no fluxo, que ninguém escolhe.
 *
 * **A rota não lê corpo.** O que ela valida é o rascunho que está no banco: não existe caminho
 * em que a submissão grave algo que o `PUT` não tenha gravado antes.
 *
 * Tudo o que escreve acontece dentro de uma transação — e tudo o que pode recusar acontece antes
 * da primeira escrita. É o que garante que uma submissão recusada não deixe etapa órfã: a
 * contagem de `Etapa` do pedido continua zero.
 */

import { prisma } from '@/src/db/prisma'
import { Pedido, Schemas } from '@/src/domain'
import { FalhaDominio, exigirPermissao, ok, recusar, rota } from '@/src/server/http'
import {
  alcadaComAprovadores,
  idDoCaminho,
  linhasDoBanco,
  pedidoDaSessao,
} from '@/src/server/pedido'

type Contexto = { params: Promise<{ id: string }> }

export const POST = rota<Contexto>(
  async (req, { params }: Contexto) => {
    const sessao = await exigirPermissao(req, 'submeter_pedido')
    const { id } = await params
    const pedido = await pedidoDaSessao(idDoCaminho(id), sessao, 'escrever')

    const linhas = linhasDoBanco(pedido.itens)

    // A exigência total é aqui, e não no rascunho: obra, fornecedor, data do pedido e ao menos
    // um item, com quantidade maior que zero e preço não negativo. O mesmo `submissaoSchema` que
    // a SPEC nomeia — o rascunho gravado volta ao formato de entrada para atravessá-lo.
    const analise = Schemas.validarSubmissao(
      Pedido.entradaDeSubmissao({
        obraId: pedido.obraId,
        fornecedorId: pedido.fornecedorId,
        dataPedido: pedido.dataPedido,
        observacoes: pedido.observacoes,
        itens: linhas,
      }),
    )
    if (!analise.ok) recusar(analise.erro.codigo, analise.erro.mensagem, analise.erro.campos)

    const obraId = pedido.obraId as string
    const agora = new Date()

    const gravado = await prisma.$transaction(async (tx) => {
      // A alçada é relida **dentro** da transação: a faixa pode ter sido apagada entre a leitura
      // e a escrita, e a submissão não pode gravar uma cadeia derivada de regra que já não
      // existe. Se sumiu, o plano falha e nada foi escrito.
      const alcada = await alcadaComAprovadores(tx, obraId)
      const plano = Pedido.planejarSubmissao(alcada, linhas)
      if (!plano.ok) throw new FalhaDominio(plano.erro)

      // UPDATE condicional na situação, e não `update` por id: dois POST concorrentes no mesmo
      // pedido chegariam os dois até aqui, e é esta condição que faz o segundo não escrever. Ele
      // recebe o mesmo 409 que receberia se tivesse chegado depois.
      const alterados = await tx.pedido.updateMany({
        where: { id: pedido.id, situacao: 'rascunho' },
        data: {
          situacao: 'pendente',
          submetidoEm: agora,
          totalCentavos: plano.valor.totalCentavos,
          faixaId: plano.valor.faixa.id,
          faixaLimiteCentavos: plano.valor.faixa.limiteCentavos,
          faixaSemTeto: plano.valor.faixa.limiteCentavos === null,
        },
      })
      if (alterados.count === 0) {
        const conflito = Pedido.conflitoDeImutabilidade('pendente')
        throw new FalhaDominio(conflito ?? { codigo: 'PEDIDO_IMUTAVEL', mensagem: 'Já submetido.' })
      }

      await tx.etapa.createMany({
        data: plano.valor.cadeia.map((etapa) => ({
          pedidoId: pedido.id,
          ordem: etapa.ordem,
          usuarioId: etapa.usuarioId,
          situacao: etapa.situacao,
        })),
      })

      const etapas = await tx.etapa.findMany({
        where: { pedidoId: pedido.id },
        orderBy: { ordem: 'asc' },
        select: {
          ordem: true,
          usuarioId: true,
          situacao: true,
          usuario: { select: { nome: true } },
        },
      })

      return { plano: plano.valor, etapas }
    })

    return ok({
      id: pedido.id,
      situacao: 'pendente',
      cadeia: gravado.etapas.map((etapa) => ({
        ordem: etapa.ordem,
        usuarioId: etapa.usuarioId,
        nome: etapa.usuario.nome,
        situacao: etapa.situacao,
      })),
      faixa: {
        limiteCentavos: gravado.plano.faixa.limiteCentavos,
        semTeto: gravado.plano.faixa.limiteCentavos === null,
      },
    })
  },
  // O contrato da submissão declara 8 s, e não os 5 s do teto geral: aqui há transação, leitura
  // da alçada e escrita das etapas no mesmo fôlego.
  { tempoLimiteEmMs: 8000 },
)
