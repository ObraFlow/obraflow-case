/**
 * O painel da administração, numa chamada só.
 *
 * Cinco KPIs, quatro cartões e a fila de atenção saem do **mesmo** conjunto de pedidos. Servi-los
 * em rotas separadas daria cinco estados de carregamento, cinco chances de erro parcial e
 * números que se contradizem quando alguém decide um pedido no meio das chamadas — o painel
 * mostraria 21 pedidos no topo e 22 no gráfico. Uma leitura, um instante, um `agora`.
 *
 * A rota lê e agrega; **nenhuma derivação mora aqui**. Tempo médio, "parado há", corte por faixa
 * e por aprovador são regra de negócio e vivem em `src/domain/painel.ts`, com caso de teste. O
 * que esta função faz é buscar as linhas, traduzi-las para a forma do domínio e serializar.
 *
 * O escopo de leitura é o mesmo de `GET /api/pedidos` e de `/api/pedidos/resumo`: submetidos para
 * todos, rascunho só de quem o criou. Agregar não é uma visão privilegiada dos mesmos dados.
 */

import { prisma } from '@/src/db/prisma'
import type { Prisma } from '@prisma/client'

import { exigirPermissao, ok, recusar, rota } from '@/src/server/http'
import {
  Dinheiro,
  Painel,
  Schemas,
  SITUACOES_DO_PEDIDO,
  ehSituacaoDaEtapa,
  ehSituacaoDoPedido,
} from '@/src/domain'

/** Os três períodos do artboard. Qualquer outro valor é recusado — não é filtro livre. */
const DIAS_PERMITIDOS = [7, 30, 90] as const
const DIAS_PADRAO = 30

/** Seis semanas, como o artboard desenha. */
const SEMANAS = 6

const apenasObra = Schemas.filtroDePedidosSchema.pick({ obraId: true })

const PARA_O_PAINEL = {
  obra: { select: { id: true, nome: true } },
  fornecedor: { select: { nome: true } },
  etapas: {
    orderBy: { ordem: 'asc' },
    include: { usuario: { select: { id: true, nome: true } } },
  },
  _count: { select: { itens: true } },
} satisfies Prisma.PedidoInclude

type LinhaDoPainel = Prisma.PedidoGetPayload<{ include: typeof PARA_O_PAINEL }>

/** O mesmo `OR` da lista e do resumo: submetidos para todos, rascunho só do criador. */
function oQueEstaSessaoVe(obraId: string | undefined, usuarioId: string): Prisma.PedidoWhereInput {
  return {
    OR: [
      { situacao: { in: SITUACOES_DO_PEDIDO.filter((s) => s !== 'rascunho') } },
      { situacao: 'rascunho', criadoPorId: usuarioId },
    ],
    ...(obraId ? { obraId } : {}),
  }
}

function paraODominio(linha: LinhaDoPainel): Painel.PedidoDoPainel {
  return {
    id: linha.id,
    obraId: linha.obraId,
    obraNome: linha.obra?.nome ?? null,
    fornecedorNome: linha.fornecedor?.nome ?? null,
    // A coluna é `String` porque SQLite não tem enum (schema.prisma). O domínio é quem sabe quais
    // valores existem, e um valor fora do conjunto é dado corrompido — não um quinto estado.
    situacao: ehSituacaoDoPedido(linha.situacao) ? linha.situacao : 'rascunho',
    totalCentavos: Dinheiro.deCentavos(linha.totalCentavos),
    qtdItens: linha._count.itens,
    submetidoEm: linha.submetidoEm,
    faixaLimiteCentavos: linha.faixaLimiteCentavos,
    faixaSemTeto: linha.faixaSemTeto,
    etapas: linha.etapas.map((etapa) => ({
      ordem: etapa.ordem,
      usuarioId: etapa.usuarioId,
      nome: etapa.usuario.nome,
      situacao: ehSituacaoDaEtapa(etapa.situacao) ? etapa.situacao : 'pendente',
      decididoEm: etapa.decididoEm,
      motivo: etapa.motivo,
    })),
  }
}

export const GET = rota(async (req) => {
  const sessao = await exigirPermissao(req, 'ver_resumo')

  const parametros = new URL(req.url).searchParams

  const analise = Schemas.validarCom(apenasObra, { obraId: parametros.get('obraId') ?? undefined })
  if (!analise.ok) recusar(analise.erro.codigo, analise.erro.mensagem, analise.erro.campos)

  const diasBruto = parametros.get('dias')
  const dias = diasBruto === null ? DIAS_PADRAO : Number(diasBruto)
  if (!(DIAS_PERMITIDOS as readonly number[]).includes(dias)) {
    recusar('VALIDACAO', 'Revise os campos destacados.', {
      dias: `O período é um de ${DIAS_PERMITIDOS.join(', ')} dias.`,
    })
  }

  // Um `agora` só, lido uma vez: se cada derivação lesse o relógio, o KPI "parado há mais de 24 h"
  // e a fila logo abaixo poderiam discordar sobre o mesmo pedido na virada do segundo.
  const agora = new Date()

  const linhas = await prisma.pedido.findMany({
    where: oQueEstaSessaoVe(analise.valor.obraId, sessao.usuarioId),
    include: PARA_O_PAINEL,
    orderBy: [{ id: 'asc' }],
  })

  const pedidos = linhas.map(paraODominio)
  const janela = Painel.janela(agora, dias)

  const kpis = Painel.kpis(pedidos, janela, agora)
  const serie = Painel.serieSemanal(pedidos, agora, SEMANAS)

  // As obras do seletor saem de **todos** os pedidos visíveis, não do recorte filtrado: senão,
  // escolher uma obra apagaria as outras do seletor e não haveria como voltar.
  const obras = await prisma.obra.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  })

  return ok({
    agora: agora.toISOString(),
    dias,
    obraId: analise.valor.obraId ?? null,
    obras,
    kpis: {
      pedidos: kpis.pedidos,
      valorAprovadoCentavos: kpis.valorAprovadoCentavos,
      tempoMedioEmMs: kpis.tempoMedioEmMs,
      rejeicao: kpis.rejeicao,
      parados: kpis.parados,
    },
    serie,
    porFaixa: Painel.porFaixa(pedidos),
    porAprovador: Painel.porAprovador(pedidos),
    fila: Painel.filaDeAtencao(pedidos, agora),
    comUmaAssinatura: Painel.comUmaAssinatura(pedidos),
    submetidos: pedidos.filter((p) => p.situacao !== 'rascunho').length,
  })
})

// A contagem por situação **não** sai daqui: ela tem rota própria, `GET /api/pedidos/resumo`, e o
// cartão a lê de lá. Devolvê-la também neste payload criaria duas fontes para o mesmo número —
// que é exatamente o defeito que a leitura única desta rota existe para evitar.
