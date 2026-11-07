import { describe, expect, it } from 'vitest'

import * as Alcada from './alcada'
import * as Dinheiro from './dinheiro'
import type { Ordem } from './tipos'

/**
 * Todo caso afirma o **código** do erro, nunca o texto da mensagem: melhorar a redação não pode
 * quebrar teste. O único assert sobre mensagem está no caso do teto, porque "a mensagem cita o
 * valor do teto" é a regra, e ali o que se afirma é que o valor aparece — não qual é a frase.
 */
describe('resolverFaixa', () => {
  it('trata o limite superior como inclusivo, mesmo com as faixas fora de ordem', () => {
    // Fora de ordem de propósito: entrada pré-ordenada esconderia defeito de ordenação.
    const alcada: Alcada.Alcada = {
      obraId: 'obra-1',
      faixas: [
        {
          id: 'alta',
          limiteCentavos: Dinheiro.deCentavos(5000000),
          aprovadores: [{ usuarioId: 'diretora', ordem: 0 as Ordem }],
        },
        {
          id: 'baixa',
          limiteCentavos: Dinheiro.deCentavos(1000000),
          aprovadores: [{ usuarioId: 'engenheiro', ordem: 0 as Ordem }],
        },
      ],
    }

    // R$ 10.000,00 exato pertence à faixa "até R$ 10.000,00".
    const exato = Alcada.resolverFaixa(alcada, Dinheiro.deCentavos(1000000))
    expect(exato.ok).toBe(true)
    expect(exato.ok && exato.valor.id).toBe('baixa')

    // Um centavo acima sobe para a seguinte.
    const acima = Alcada.resolverFaixa(alcada, Dinheiro.deCentavos(1000001))
    expect(acima.ok).toBe(true)
    expect(acima.ok && acima.valor.id).toBe('alta')
  })

  it('recusa quando a obra não tem nenhuma faixa', () => {
    const alcada: Alcada.Alcada = { obraId: 'obra-sem-regra', faixas: [] }

    const resultado = Alcada.resolverFaixa(alcada, Dinheiro.deCentavos(50000))

    expect(resultado.ok).toBe(false)
    expect(!resultado.ok && resultado.erro.codigo).toBe('SEM_REGRA_APLICAVEL')
  })

  it('recusa total acima do teto quando não existe faixa aberta, citando o teto', () => {
    const alcada: Alcada.Alcada = {
      obraId: 'obra-1',
      faixas: [
        {
          id: 'unica',
          limiteCentavos: Dinheiro.deCentavos(1000000),
          aprovadores: [{ usuarioId: 'engenheiro', ordem: 0 as Ordem }],
        },
      ],
    }

    const resultado = Alcada.resolverFaixa(alcada, Dinheiro.deCentavos(1000001))

    expect(resultado.ok).toBe(false)
    expect(!resultado.ok && resultado.erro.codigo).toBe('SEM_REGRA_APLICAVEL')
    // Afirma que o valor do teto aparece, não qual é a frase ao redor dele.
    expect(!resultado.ok && resultado.erro.mensagem).toContain(
      Dinheiro.formatar(Dinheiro.deCentavos(1000000)),
    )
  })

  it('recusa faixa que comporta o total mas não tem aprovador nenhum', () => {
    // Cadeia vazia aprovaria o pedido sem ninguém assinar — por isso é recusa, não cadeia vazia.
    const alcada: Alcada.Alcada = {
      obraId: 'obra-1',
      faixas: [{ id: 'orfa', limiteCentavos: Dinheiro.deCentavos(1000000), aprovadores: [] }],
    }

    const resultado = Alcada.resolverFaixa(alcada, Dinheiro.deCentavos(900000))

    expect(resultado.ok).toBe(false)
    expect(!resultado.ok && resultado.erro.codigo).toBe('SEM_REGRA_APLICAVEL')
  })

  it('usa a faixa aberta acima do último limite finito, e acusa duas faixas abertas', () => {
    const alcada: Alcada.Alcada = {
      obraId: 'obra-1',
      faixas: [
        {
          id: 'aberta',
          limiteCentavos: null,
          aprovadores: [{ usuarioId: 'conselho', ordem: 0 as Ordem }],
        },
        {
          id: 'baixa',
          limiteCentavos: Dinheiro.deCentavos(1000000),
          aprovadores: [{ usuarioId: 'engenheiro', ordem: 0 as Ordem }],
        },
      ],
    }

    const resultado = Alcada.resolverFaixa(alcada, Dinheiro.deCentavos(90000000))
    expect(resultado.ok).toBe(true)
    expect(resultado.ok && resultado.valor.id).toBe('aberta')

    // Total zero não é caso especial: cai na faixa mais baixa.
    const zero = Alcada.resolverFaixa(alcada, Dinheiro.ZERO)
    expect(zero.ok && zero.valor.id).toBe('baixa')

    expect(Alcada.temFaixaAbertaDuplicada(alcada)).toBe(false)
    expect(
      Alcada.temFaixaAbertaDuplicada({
        obraId: 'obra-1',
        faixas: [
          { id: 'a', limiteCentavos: null, aprovadores: [] },
          { id: 'b', limiteCentavos: null, aprovadores: [] },
        ],
      }),
    ).toBe(true)
  })
})
