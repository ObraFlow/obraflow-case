import { describe, expect, it } from 'vitest'

import {
  chavesAncoradas,
  corpoDoFormulario,
  formularioEmBranco,
  itemEmBranco,
  mensagensSemAncora,
  motivoDoBloqueio,
  problemasDoFormulario,
  type EstadoDoFormulario,
} from './formulario-de-pedido'

/**
 * O que a s7f2 cobra, em função pura.
 *
 * A ancoragem do erro é a regra que a tela não pode errar: a chave que o servidor devolve em
 * `error.fields` e a chave que o formulário calcula sozinho precisam ser a mesma string, ou o
 * erro acende no lugar errado — ou em lugar nenhum. É isso que estes casos prendem; o que eles
 * afirmam são **chaves**, nunca o texto de uma mensagem.
 */

function comItens(...itens: Array<Partial<ReturnType<typeof itemEmBranco>>>): EstadoDoFormulario {
  return {
    ...formularioEmBranco(),
    obraId: 'obra-1',
    fornecedorId: 'fornecedor-1',
    dataPedido: '2026-10-30',
    itens: itens.map((parcial) => ({ ...itemEmBranco(), ...parcial })),
  }
}

const VALIDO = { descricao: 'Cimento CP-II 50 kg', quantidade: '10', precoUnitario: '32,90' }

describe('problemasDoFormulario', () => {
  it('ancora a quantidade negativa no item em que ela foi digitada', () => {
    const problemas = problemasDoFormulario(
      comItens(VALIDO, { ...VALIDO, quantidade: '-5' }, VALIDO),
    )

    expect(Object.keys(problemas)).toEqual(['itens.1.quantidade'])
  })

  it('recusa o que a rota recusaria: sem obra, o erro sai em obraId', () => {
    const problemas = problemasDoFormulario({ ...comItens(VALIDO), obraId: '' })

    expect(problemas).toHaveProperty('obraId')
    expect(problemas).not.toHaveProperty('fornecedorId')
  })

  it('não acusa nada quando o formulário está completo', () => {
    expect(problemasDoFormulario(comItens(VALIDO))).toEqual({})
  })
})

describe('motivoDoBloqueio', () => {
  it('bloqueia o envio enquanto a data do pedido está vazia, e diz isso', () => {
    const semData = { ...comItens(VALIDO), dataPedido: '' }
    const problemas = problemasDoFormulario(semData)

    expect(Object.keys(problemas)).toEqual(['dataPedido'])
    expect(motivoDoBloqueio(semData)).toBe(problemas.dataPedido)
  })

  it('nomeia o número do item quando o problema é de um item', () => {
    const motivo = motivoDoBloqueio(comItens(VALIDO, { ...VALIDO, precoUnitario: '' }))

    expect(motivo).toMatch(/^Item 2: /)
  })
})

describe('chavesAncoradas e mensagensSemAncora', () => {
  it('encolhe junto com a lista de itens', () => {
    const dois = chavesAncoradas(comItens(VALIDO, VALIDO))
    const um = chavesAncoradas(comItens(VALIDO))

    expect(dois.has('itens.1.quantidade')).toBe(true)
    expect(um.has('itens.1.quantidade')).toBe(false)
  })

  it('deixa passar a recusa que tem input e recolhe a que não tem', () => {
    const estado = comItens(VALIDO)
    const soltas = mensagensSemAncora(
      {
        obraId: 'ancorada no seletor de obra',
        _: 'recusa da raiz do corpo',
        'itens.7.quantidade': 'item que já foi removido',
      },
      estado,
    )

    expect(soltas).toEqual(['recusa da raiz do corpo', 'item que já foi removido'])
  })
})

describe('corpoDoFormulario', () => {
  it('omite o campo em branco em vez de enviá-lo vazio', () => {
    const corpo = corpoDoFormulario({ ...formularioEmBranco(), obraId: 'obra-1' })

    expect(corpo).toHaveProperty('obraId', 'obra-1')
    expect(corpo).not.toHaveProperty('fornecedorId')
  })
})
