/**
 * A decisão sobre uma etapa: aprovar ou rejeitar.
 *
 * A rota não contém regra. Ela lê a sessão, cobra a permissão, valida o corpo com o schema do
 * domínio, chama `decidir` e traduz o resultado. Quem diz quem pode decidir é
 * `src/domain/decisao.ts`; quem impõe é o `UPDATE` condicional de `src/server/decisao.ts`
 * (ADR 0004), e nenhum dos dois mora aqui.
 *
 * Nenhum número de situação é escolhido neste arquivo: toda recusa sai como código do domínio e
 * o número vem de `SITUACAO_HTTP`.
 */

import { Schemas } from '@/src/domain'
import { exigirPermissao, lerCorpoJson, ok, recusar, rota } from '@/src/server/http'
import { decidir, decisaoDoCorpo } from '@/src/server/decisao'
import { idDoCaminho } from '@/src/server/pedido'

type Contexto = { params: Promise<{ id: string }> }

export const POST = rota<Contexto>(
  async (req, { params }: Contexto) => {
    // Comprador e visualizador param aqui, antes de qualquer consulta de negócio: `decidir` é da
    // matriz da Sprint 3, e é o único lugar onde essa resposta existe.
    const sessao = await exigirPermissao(req, 'decidir')
    const { id } = await params

    const analise = Schemas.validarDecisao((await lerCorpoJson(req)) ?? {})
    if (!analise.ok) recusar(analise.erro.codigo, analise.erro.mensagem, analise.erro.campos)

    return ok(await decidir(idDoCaminho(id), sessao, decisaoDoCorpo(analise.valor)))
  },
  // O contrato declara 8 s, como o da submissão: há transação, leitura da cadeia e duas escritas
  // no mesmo fôlego. O número sai do contrato, não da rota.
  { tempoLimiteEmMs: 8000 },
)
