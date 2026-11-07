import { describe, expect, it } from 'vitest'

import * as Decisao from './decisao'
import type { Ordem, SituacaoDaEtapa } from './tipos'

function etapa(ordem: number, usuarioId: string, situacao: SituacaoDaEtapa) {
  return {
    ordem: ordem as Ordem,
    usuarioId,
    situacao,
    decididoEm: situacao === 'pendente' ? null : new Date('2026-01-01T12:00:00Z'),
    motivo: null,
  }
}

describe('validar', () => {
  it('devolve a etapa atingida, não um booleano', () => {
    // É a `ordem` desta etapa que condiciona o UPDATE da Sprint 6: um booleano obrigaria a
    // reler o pedido para saber onde escrever.
    const cadeia = [etapa(0, 'engenheiro', 'pendente'), etapa(1, 'diretora', 'pendente')]

    const resultado = Decisao.validar(cadeia, 'engenheiro')

    expect(resultado.ok).toBe(true)
    expect(resultado.ok && resultado.valor.ordem).toBe(0)
    expect(resultado.ok && resultado.valor.usuarioId).toBe('engenheiro')
    expect(Decisao.podeDecidir(cadeia, 'engenheiro')).toBe(true)
  })

  it('recusa decisão fora de ordem e de quem está fora da cadeia, por motivos distintos', () => {
    const cadeia = [etapa(0, 'engenheiro', 'pendente'), etapa(1, 'diretora', 'pendente')]

    const foraDeOrdem = Decisao.validar(cadeia, 'diretora')
    const foraDaCadeia = Decisao.validar(cadeia, 'estranho')

    expect(!foraDeOrdem.ok && foraDeOrdem.erro.codigo).toBe('NAO_E_SUA_VEZ')
    expect(!foraDaCadeia.ok && foraDaCadeia.erro.codigo).toBe('NAO_E_SUA_VEZ')
    // Mesmo código, explicações diferentes — afirma-se que diferem, não o texto de cada uma.
    expect(!foraDeOrdem.ok && !foraDaCadeia.ok && foraDeOrdem.erro.mensagem).not.toBe(
      !foraDaCadeia.ok ? foraDaCadeia.erro.mensagem : '',
    )
  })

  it('recusa decisão em cadeia já encerrada, por aprovação ou por rejeição', () => {
    const aprovada = [etapa(0, 'engenheiro', 'aprovada'), etapa(1, 'diretora', 'aprovada')]
    const rejeitada = [etapa(0, 'engenheiro', 'rejeitada'), etapa(1, 'diretora', 'pendente')]

    const emAprovada = Decisao.validar(aprovada, 'diretora')
    const emRejeitada = Decisao.validar(rejeitada, 'diretora')

    expect(!emAprovada.ok && emAprovada.erro.codigo).toBe('CADEIA_CONCLUIDA')
    expect(!emRejeitada.ok && emRejeitada.erro.codigo).toBe('CADEIA_CONCLUIDA')
  })

  it('recusa decisão em pedido sem cadeia', () => {
    // Rascunho não tem etapa nenhuma: não há o que decidir.
    const resultado = Decisao.validar([], 'engenheiro')

    expect(!resultado.ok && resultado.erro.codigo).toBe('NAO_ENCONTRADO')
  })
})

describe('rejeitar', () => {
  it('exige motivo e ancora o erro no campo motivo', () => {
    // Rejeição encerra o pedido: quem o recebe de volta precisa saber o que corrigir.
    const emBranco = Decisao.rejeitar('  ')
    const curto = Decisao.rejeitar('ok')
    const valido = Decisao.rejeitar('  Preço acima do orçado.  ')

    expect(!emBranco.ok && emBranco.erro.codigo).toBe('VALIDACAO')
    expect(!emBranco.ok && emBranco.erro.campos?.motivo).toBeTruthy()
    expect(!curto.ok && curto.erro.codigo).toBe('VALIDACAO')
    expect(valido.ok).toBe(true)
    expect(valido.ok && valido.valor.tipo === 'rejeitar' && valido.valor.motivo).toBe(
      'Preço acima do orçado.',
    )
  })
})

describe('situacaoApos', () => {
  it('rejeita o pedido inteiro em qualquer posicao, e so aprova quando nao resta pendente', () => {
    const cadeia = [
      etapa(0, 'engenheiro', 'aprovada'),
      etapa(1, 'diretora', 'pendente'),
      etapa(2, 'conselho', 'pendente'),
    ]
    const rejeicao = Decisao.rejeitar('Fora do escopo da obra.')
    expect(rejeicao.ok).toBe(true)
    if (!rejeicao.ok) return

    // Rejeicao no meio da cadeia encerra tudo, ainda havendo etapa pendente depois.
    expect(Decisao.situacaoApos(cadeia, cadeia[1], rejeicao.valor)).toBe('rejeitado')
    expect(Decisao.situacaoApos(cadeia, cadeia[0], rejeicao.valor)).toBe('rejeitado')

    // Aprovar com etapa pendente restante mantem o pedido pendente.
    expect(Decisao.situacaoApos(cadeia, cadeia[1], Decisao.aprovar())).toBe('pendente')

    // So a aprovacao da ultima etapa pendente aprova o pedido.
    const naUltima = [etapa(0, 'engenheiro', 'aprovada'), etapa(1, 'diretora', 'pendente')]
    expect(Decisao.situacaoApos(naUltima, naUltima[1], Decisao.aprovar())).toBe('aprovado')
  })
})
