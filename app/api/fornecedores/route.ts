/**
 * Os fornecedores: a lista de quem escolhe um e o cadastro da tela Empresa.
 *
 * `GET` lista para qualquer papel; `POST` cadastra, só para o admin. Sem sessão, as duas respondem
 * 403 SEM_PERMISSAO, como toda rota do projeto.
 *
 * A forma é a mesma que `app/pedidos/novo/page.tsx` entrega ao formulário: `id`, `nome` e
 * `documento` (nulo quando não informado), por nome.
 */

import { prisma } from '@/src/db/prisma'
import { Schemas } from '@/src/domain'
import { exigirPermissao, exigirSessao, lerCorpoJson, ok, recusar, rota } from '@/src/server/http'

export const GET = rota(async (req) => {
  await exigirSessao(req)

  const fornecedores = await prisma.fornecedor.findMany({
    select: { id: true, nome: true, documento: true },
    orderBy: { nome: 'asc' },
  })

  return ok(fornecedores)
})

/**
 * Cadastra um fornecedor — a tela Empresa. Só o admin, pela mesma matriz que esconde o item do menu;
 * quem chama sem o papel recebe 403 antes de qualquer leitura do corpo.
 */
export const POST = rota(async (req) => {
  await exigirPermissao(req, 'gerir_cadastros')

  const analise = Schemas.validarFornecedor((await lerCorpoJson(req)) ?? {})
  if (!analise.ok) recusar(analise.erro.codigo, analise.erro.mensagem, analise.erro.campos)

  const criado = await prisma.fornecedor.create({
    data: analise.valor,
    select: { id: true, nome: true, documento: true },
  })

  return ok(criado, 201)
})
