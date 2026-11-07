import { describe, expect, it } from 'vitest'

import * as Cadeia from './cadeia'
import type { Faixa } from './alcada'
import * as Dinheiro from './dinheiro'
import type { Ordem, SituacaoDaEtapa } from './tipos'

describe('montarCadeia', () => {
  it('preserva a ordem dos aprovadores da faixa e reindexa a partir de zero', () => {
    const faixa: Faixa = {
      id: 'faixa-1',
      limiteCentavos: Dinheiro.deCentavos(1000000),
      // Fora de ordem e com buracos de proposito: a faixa pode ter ordens nao contiguas depois
      // de remocoes, mas a cadeia gravada sai na ordem da faixa e contigua a partir de zero.
      aprovadores: [
        { usuarioId: 'diretora', ordem: 5 as Ordem },
        { usuarioId: 'engenheiro', ordem: 0 as Ordem },
        { usuarioId: 'conselho', ordem: 9 as Ordem },
      ],
    }

    const cadeia = Cadeia.montarCadeia(faixa)

    expect(cadeia.map((etapa) => etapa.usuarioId)).toEqual(['engenheiro', 'diretora', 'conselho'])
    expect(cadeia.map((etapa) => etapa.ordem)).toEqual([0, 1, 2])
    expect(cadeia.every((etapa) => etapa.situacao === 'pendente')).toBe(true)
  })
})

/** Monta uma etapa no corpo do caso: a cadeia em jogo fica visível no próprio assert. */
function etapa(ordem: number, usuarioId: string, situacao: SituacaoDaEtapa) {
  return {
    ordem: ordem as Ordem,
    usuarioId,
    situacao,
    decididoEm: situacao === 'pendente' ? null : new Date('2026-01-01T12:00:00Z'),
    motivo: null,
  }
}

describe('leitura do snapshot', () => {
  it('aponta a primeira etapa pendente em ordem crescente como aprovador da vez', () => {
    const cadeia = [
      etapa(2, 'conselho', 'pendente'),
      etapa(0, 'engenheiro', 'aprovada'),
      etapa(1, 'diretora', 'pendente'),
    ]

    expect(Cadeia.aprovadorDaVez(cadeia)?.usuarioId).toBe('diretora')
    expect(Cadeia.estaConcluida(cadeia)).toBe(false)
  })

  it('não tem aprovador da vez quando uma etapa foi rejeitada', () => {
    // Rejeição encerra o pedido inteiro: a etapa seguinte não se torna decidível.
    const cadeia = [
      etapa(0, 'engenheiro', 'rejeitada'),
      etapa(1, 'diretora', 'pendente'),
    ]

    expect(Cadeia.aprovadorDaVez(cadeia)).toBeNull()
    expect(Cadeia.estaConcluida(cadeia)).toBe(true)
    // Cadeia vazia não está concluída: aprovação exige ao menos uma etapa.
    expect(Cadeia.estaConcluida([])).toBe(false)
  })

  it('traz no histórico só as etapas já decididas', () => {
    const cadeia = [
      etapa(0, 'engenheiro', 'aprovada'),
      etapa(1, 'diretora', 'pendente'),
      etapa(2, 'conselho', 'pendente'),
    ]

    expect(Cadeia.historico(cadeia).map((e) => e.usuarioId)).toEqual(['engenheiro'])
  })
})
