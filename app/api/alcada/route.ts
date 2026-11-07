/**
 * Panorama da alçada: as obras e quantas faixas cada uma tem.
 *
 * Esta rota é a **prova** da matriz de permissão nesta sprint: `gerir_alcada` é exclusiva do
 * admin, e qualquer outro papel — ou a ausência de sessão — recebe 403 SEM_PERMISSAO antes de
 * qualquer consulta de negócio. É também o destino do item de menu que só o admin enxerga.
 *
 * A edição de faixas (POST, PUT, DELETE em `api/obras/[id]/faixas` e `api/faixas/[id]`) é da
 * Sprint 4 e não existe aqui.
 */

import { prisma } from '@/src/db/prisma'
import { exigirPermissao, ok, rota } from '@/src/server/http'

export const GET = rota(async (req: Request) => {
  // A recusa vem antes da consulta: quem não pode gerir alçada não chega a ler obra nenhuma.
  await exigirPermissao(req, 'gerir_alcada')

  const obras = await prisma.obra.findMany({
    select: { id: true, nome: true, cidade: true, _count: { select: { faixas: true } } },
    orderBy: { nome: 'asc' },
  })

  return ok(
    obras.map((obra) => ({
      id: obra.id,
      nome: obra.nome,
      cidade: obra.cidade,
      faixas: obra._count.faixas,
    })),
  )
})
