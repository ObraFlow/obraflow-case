/**
 * As obras: a lista de quem escolhe uma e o cadastro da tela Empresa.
 *
 * `GET` lista para qualquer papel — obra não é dado sensível, e é o que a Tela 1 e a Tela 3
 * oferecem no seletor. `POST` cadastra, só para o admin. Sem sessão, as duas respondem 403
 * SEM_PERMISSAO, como toda rota do projeto.
 *
 * A forma é a mesma que `app/pedidos/novo/page.tsx` entrega ao formulário: `id`, `nome`,
 * `cidade`, por nome.
 */

import { prisma } from '@/src/db/prisma'
import { Schemas } from '@/src/domain'
import { exigirPermissao, exigirSessao, lerCorpoJson, ok, recusar, rota } from '@/src/server/http'

export const GET = rota(async (req) => {
  await exigirSessao(req)

  const obras = await prisma.obra.findMany({
    select: { id: true, nome: true, cidade: true },
    orderBy: { nome: 'asc' },
  })

  return ok(obras)
})

/**
 * Cadastra uma obra — a tela Empresa. Só o admin, pela mesma matriz que esconde o item do menu;
 * quem chama sem o papel recebe 403 antes de qualquer leitura do corpo.
 */
export const POST = rota(async (req) => {
  await exigirPermissao(req, 'gerir_cadastros')

  const analise = Schemas.validarObra((await lerCorpoJson(req)) ?? {})
  if (!analise.ok) recusar(analise.erro.codigo, analise.erro.mensagem, analise.erro.campos)

  const criada = await prisma.obra.create({
    data: analise.valor,
    select: { id: true, nome: true, cidade: true },
  })

  return ok(criada, 201)
})
