/**
 * Os usuários oferecidos na tela de entrada.
 *
 * Só existe no modo demonstração: fora dele não há entrada sem senha, e listar quem pode entrar
 * seria entregar o quadro de pessoal a qualquer um. Devolve nome e papel — nada mais do usuário
 * atravessa a borda.
 */

import { connection } from 'next/server'

import { prisma } from '@/src/db/prisma'
import { exigirModoDemo, ok, rota } from '@/src/server/http'

export const GET = rota(async () => {
  // Esta rota não lê nada do Request, e o better-sqlite3 é síncrono: sem este marco, o Next
  // resolveria a lista — e a própria checagem da flag — durante o build, e serviria um resultado
  // congelado. `connection()` diz que daqui para baixo só roda com requisição de verdade.
  await connection()

  exigirModoDemo()

  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nome: true, papel: true },
    orderBy: { nome: 'asc' },
  })

  return ok(usuarios)
})
