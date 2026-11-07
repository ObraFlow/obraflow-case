/**
 * Entrar e sair — a sessão de demonstração (ADR 0005).
 *
 * As três rotas vivem atrás de `DEMO_MODE`. Desligada — ou ausente, que é o mesmo — elas não
 * respondem: 404, como qualquer caminho que não existe. É o que impede que o atalho de
 * demonstração vire um buraco permanente.
 *
 * A rota não contém regra: lê o corpo, valida, consulta, traduz (ADR 0003).
 */

import { z } from 'zod'

import { Schemas } from '@/src/domain'
import { prisma } from '@/src/db/prisma'
import {
  exigirModoDemo,
  lerCorpoJson,
  ok,
  recusar,
  respostaDeErro,
  rota,
} from '@/src/server/http'
import { permissoesDe } from '@/src/server/permissao'
import { cookieDeEntrada, cookieDeSaida, lerSessao } from '@/src/server/sessao'

/**
 * O id é tratado como texto opaco, não como cuid.
 *
 * Validar o formato da chave do Prisma aqui transformaria "id que não existe" em 422 para uns
 * ids e 404 para outros — a mesma pergunta, duas respostas, dependendo de o palpite do cliente
 * parecer um cuid. `src/domain/schemas.ts` já trata identificador assim, pelo mesmo motivo.
 */
const entrada = z.object({
  // A mensagem vai no construtor **e** no `min`: sem a primeira, corpo sem a chave cai na
  // mensagem padrão da biblioteca, em inglês, e ela aparece ancorada no campo da tela.
  usuarioId: z.string({ error: 'Informe o usuário.' }).trim().min(1, 'Informe o usuário.'),
})

/** Quem está dentro agora. Existe para a troca de usuário ser conferível por `curl`. */
export const GET = rota(async (req: Request) => {
  exigirModoDemo()
  const sessao = await lerSessao(req)
  if (!sessao) return ok({ usuario: null, permissoes: permissoesDe(null) })
  return ok({
    usuario: { id: sessao.usuarioId, nome: sessao.nome, papel: sessao.papel },
    permissoes: permissoesDe(sessao.papel),
  })
})

export const POST = rota(async (req: Request) => {
  exigirModoDemo()

  const corpo = await lerCorpoJson(req)
  const validado = Schemas.validarCom(entrada, corpo)
  if (!validado.ok) return respostaDeErro(validado.erro)

  const usuario = await prisma.usuario.findUnique({
    where: { id: validado.valor.usuarioId },
    select: { id: true, nome: true, papel: true },
  })
  if (!usuario) recusar('NAO_ENCONTRADO', 'Usuário não encontrado.')

  // Trocar de usuário é abrir sessão nova, não renomear a atual: o cookie passa a apontar para
  // outro id, e o papel efetivo da próxima requisição será lido do banco por esse id.
  return ok({ usuario }, 200, { 'Set-Cookie': cookieDeEntrada(usuario.id) })
})

/** Idempotente: sair sem estar dentro é 200 e um cookie expirado, não erro. */
export const DELETE = rota(async () => {
  exigirModoDemo()
  return ok({ encerrada: true }, 200, { 'Set-Cookie': cookieDeSaida() })
})
