/**
 * O que as rotas de faixa compartilham.
 *
 * Responsabilidade única: traduzir entre as linhas do Prisma e o vocabulário do domínio, e
 * cobrar as regras que dependem do banco — a obra existir, os aprovadores existirem, a alçada
 * comportar o desenho proposto. A regra que **não** depende do banco (segunda faixa aberta,
 * limite repetido, teto de faixas) fica em `src/domain/alcada.ts` e é só chamada daqui.
 *
 * Existe porque `POST /api/obras/[id]/faixas` e `PUT /api/faixas/[id]` escrevem exatamente a
 * mesma coisa a partir do mesmo corpo. Duas cópias divergiriam na primeira regra nova.
 */

import type { Prisma } from '@prisma/client'

import { prisma } from '@/src/db/prisma'
import { Alcada, Schemas, type Centavos, type Ordem } from '@/src/domain'
import { lerCorpoJson, recusar } from './http'

/** Uma faixa como a borda a devolve. `semTeto` é derivado, nunca gravado. */
export type FaixaPublica = {
  readonly id: string
  readonly limiteCentavos: number | null
  readonly semTeto: boolean
  readonly aprovadores: ReadonlyArray<{ usuarioId: string; nome: string; ordem: number }>
  /** Pedidos pendentes sob esta faixa. É a contagem que o diálogo de exclusão mostra. */
  readonly pedidosEmAndamento: number
}

const COM_APROVADORES = {
  aprovadores: {
    orderBy: { ordem: 'asc' },
    select: { usuarioId: true, ordem: true, usuario: { select: { nome: true } } },
  },
  _count: { select: { pedidos: { where: { situacao: 'pendente' } } } },
} satisfies Prisma.FaixaSelect

type LinhaDeFaixa = Prisma.FaixaGetPayload<{
  select: { id: true; limiteCentavos: true } & typeof COM_APROVADORES
}>

function publicar(linha: LinhaDeFaixa): FaixaPublica {
  return {
    id: linha.id,
    limiteCentavos: linha.limiteCentavos,
    semTeto: linha.limiteCentavos === null,
    aprovadores: linha.aprovadores.map((a) => ({
      usuarioId: a.usuarioId,
      nome: a.usuario.nome,
      ordem: a.ordem,
    })),
    pedidosEmAndamento: linha._count.pedidos,
  }
}

/**
 * As faixas de uma obra, já na ordem em que a alçada as lê.
 *
 * A ordenação sai de `Alcada.faixasOrdenadas`, e não de um `orderBy` do Prisma, porque a faixa
 * aberta tem limite nulo: o banco a colocaria onde o seu tratamento de nulo mandar, e a regra
 * "aberta por último" é do domínio.
 */
export async function faixasDaObra(obraId: string): Promise<FaixaPublica[]> {
  const linhas = await prisma.faixa.findMany({
    where: { obraId },
    select: { id: true, limiteCentavos: true, ...COM_APROVADORES },
  })

  const publicadas = linhas.map(publicar)
  const ordem = Alcada.faixasOrdenadas({
    obraId,
    faixas: publicadas.map((f) => ({
      id: f.id,
      limiteCentavos: f.limiteCentavos as Centavos | null,
      aprovadores: [],
    })),
  })

  const porId = new Map(publicadas.map((f) => [f.id, f]))
  return ordem.map((f) => porId.get(f.id) as FaixaPublica)
}

/** A alçada da obra no formato do domínio, para as regras que precisam ver as outras faixas. */
async function alcadaDaObra(obraId: string, excetoFaixaId?: string): Promise<Alcada.Alcada> {
  const linhas = await prisma.faixa.findMany({
    where: { obraId },
    select: { id: true, limiteCentavos: true },
  })
  return {
    obraId,
    faixas: linhas
      .filter((l) => l.id !== excetoFaixaId)
      .map((l) => ({
        id: l.id,
        limiteCentavos: l.limiteCentavos as Centavos | null,
        aprovadores: [],
      })),
  }
}

/** Obra inexistente é 404, não 422: o recurso do caminho é que não existe. */
export async function exigirObra(obraId: string): Promise<string> {
  const obra = await prisma.obra.findUnique({ where: { id: obraId }, select: { id: true } })
  if (!obra) recusar('NAO_ENCONTRADO', 'Obra não encontrada.')
  return obra.id
}

export async function exigirFaixa(faixaId: string): Promise<{ id: string; obraId: string }> {
  const faixa = await prisma.faixa.findUnique({
    where: { id: faixaId },
    select: { id: true, obraId: true },
  })
  if (!faixa) recusar('NAO_ENCONTRADO', 'Faixa não encontrada.')
  return faixa
}

/**
 * Lê o corpo, valida a forma com o schema do domínio e cobra as regras da obra.
 *
 * `faixaId` presente significa substituição: a própria faixa sai do cálculo de conflito, senão
 * salvar a faixa sem mudar o limite acusaria limite repetido consigo mesma.
 */
export async function corpoDeFaixa(
  req: Request,
  obraId: string,
  faixaId?: string,
): Promise<{ limiteCentavos: Centavos | null; aprovadores: readonly string[] }> {
  const bruto = await lerCorpoJson(req)

  const analise = Schemas.validarFaixa(bruto)
  if (!analise.ok) recusar(analise.erro.codigo, analise.erro.mensagem, analise.erro.campos)

  const { limiteCentavos, aprovadores } = analise.valor

  const alcada = await alcadaDaObra(obraId, faixaId)
  const conflito = Alcada.conflitoNaAlcada(alcada, { id: faixaId, limiteCentavos })
  if (conflito) recusar(conflito.codigo, conflito.mensagem, conflito.campos)

  await exigirAprovadoresExistentes(aprovadores)

  return { limiteCentavos, aprovadores }
}

/**
 * Aprovador que não existe é 422 com o erro ancorado em `aprovadores`, não 404.
 *
 * O recurso do caminho — a obra, a faixa — existe; o que está errado é um valor do corpo, e a
 * tela precisa saber qual campo destacar. Sem esta checagem o erro viria do banco, como violação
 * de chave estrangeira, e chegaria à tela como 500.
 */
async function exigirAprovadoresExistentes(ids: readonly string[]): Promise<void> {
  const encontrados = await prisma.usuario.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true },
  })
  if (encontrados.length === ids.length) return

  const conhecidos = new Set(encontrados.map((u) => u.id))
  const faltando = ids.filter((id) => !conhecidos.has(id))
  recusar('VALIDACAO', 'Há aprovador que não existe mais.', {
    aprovadores:
      faltando.length === 1
        ? 'Um dos aprovadores escolhidos não existe mais.'
        : `${faltando.length} dos aprovadores escolhidos não existem mais.`,
  })
}

/** A ordem gravada é a posição no array. O que o cliente mandar como ordem é ignorado. */
export function aprovadoresNaOrdem(
  faixaId: string,
  ids: readonly string[],
): Array<{ faixaId: string; usuarioId: string; ordem: Ordem }> {
  return ids.map((usuarioId, indice) => ({ faixaId, usuarioId, ordem: indice as Ordem }))
}

/** A faixa recém-escrita, no formato da resposta. */
export async function faixaPublica(faixaId: string): Promise<FaixaPublica> {
  const linha = await prisma.faixa.findUniqueOrThrow({
    where: { id: faixaId },
    select: { id: true, limiteCentavos: true, ...COM_APROVADORES },
  })
  return publicar(linha)
}
