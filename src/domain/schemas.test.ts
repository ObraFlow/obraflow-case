import { describe, expect, it } from 'vitest'

import * as Dinheiro from './dinheiro'
import * as Pedido from './pedido'
import * as Quantidade from './quantidade'
import * as Schemas from './schemas'

/** Um item válido, montado no corpo de cada caso a partir desta forma mínima. */
function itemValido(extra: Record<string, unknown> = {}) {
  return { descricao: 'Cimento CP-II', quantidade: '2,5', unidade: 'sc', precoUnitario: '33,00', ...extra }
}

describe('rascunhoSchema', () => {
  it('aceita data do pedido ausente ou vazia, e recusa data malformada', () => {
    const vazia = Schemas.validarRascunho({ dataPedido: '' })
    const malformada = Schemas.validarRascunho({ dataPedido: '30/10/2026' })

    expect(vazia.ok && vazia.valor.dataPedido).toBeUndefined()
    expect(!malformada.ok && typeof malformada.erro.campos?.dataPedido).toBe('string')
  })

  it('aceita um objeto com todos os campos ausentes', () => {
    // Rascunho e incompleto por natureza: exigir obra e item aqui acabaria com "salvar e
    // voltar depois".
    const resultado = Schemas.validarRascunho({})

    expect(resultado.ok).toBe(true)
    expect(resultado.ok && resultado.valor.itens).toBeUndefined()
  })
})

describe('submissaoSchema', () => {
  it('recusa pedido sem item e pedido com mais de cem itens', () => {
    const semItens = Schemas.validarSubmissao({
      obraId: 'obra-1',
      fornecedorId: 'forn-1',
      dataPedido: '2026-10-30',
      itens: [],
    })
    const itensDemais = Schemas.validarSubmissao({
      obraId: 'obra-1',
      fornecedorId: 'forn-1',
      dataPedido: '2026-10-30',
      itens: Array.from({ length: 101 }, () => itemValido()),
    })

    expect(!semItens.ok && semItens.erro.codigo).toBe('VALIDACAO')
    expect(!itensDemais.ok && itensDemais.erro.codigo).toBe('VALIDACAO')

    // O limite em si e aceito: 100 itens passam.
    const noLimite = Schemas.validarSubmissao({
      obraId: 'obra-1',
      fornecedorId: 'forn-1',
      dataPedido: '2026-10-30',
      itens: Array.from({ length: 100 }, () => itemValido()),
    })
    expect(noLimite.ok).toBe(true)
  })

  it('recusa quantidade zero e preco acima do teto', () => {
    const quantidadeZero = Schemas.validarSubmissao({
      obraId: 'obra-1',
      fornecedorId: 'forn-1',
      dataPedido: '2026-10-30',
      itens: [itemValido({ quantidade: '0' })],
    })
    // R$ 10.000.000,01 — um centavo acima do teto da linha.
    const precoAcimaDoTeto = Schemas.validarSubmissao({
      obraId: 'obra-1',
      fornecedorId: 'forn-1',
      dataPedido: '2026-10-30',
      itens: [itemValido({ precoUnitario: '10000000,01' })],
    })

    expect(!quantidadeZero.ok && quantidadeZero.erro.codigo).toBe('VALIDACAO')
    expect(!precoAcimaDoTeto.ok && precoAcimaDoTeto.erro.codigo).toBe('VALIDACAO')
  })

  it('aceita preco zero e recusa preco negativo, como o enunciado pede ("nao negativo")', () => {
    const precoZero = Schemas.validarSubmissao({
      obraId: 'obra-1',
      fornecedorId: 'forn-1',
      dataPedido: '2026-10-30',
      itens: [itemValido({ precoUnitario: '0' })],
    })
    const precoNegativo = Schemas.validarSubmissao({
      obraId: 'obra-1',
      fornecedorId: 'forn-1',
      dataPedido: '2026-10-30',
      itens: [itemValido({ precoUnitario: '-0,01' })],
    })

    expect(precoZero.ok && precoZero.valor.itens[0].precoUnitario).toBe(0)
    expect(!precoNegativo.ok && precoNegativo.erro.campos?.['itens.0.precoUnitario']).toBe(
      'O preço unitário não pode ser negativo.',
    )
  })

  it('recusa na submissao o item cujo preco ficou ausente no rascunho, e aceita o de preco zero', () => {
    // O rascunho grava preco ausente como nulo, nunca como zero: zero e preco valido, e gravar a
    // ausencia como zero faria o item passar pela submissao como se custasse R$ 0,00.
    const linhas = Pedido.linhasDeItens([
      { descricao: 'Brinde', quantidade: Quantidade.deMilesimos(1000), unidade: 'un' },
      {
        descricao: 'Amostra',
        quantidade: Quantidade.deMilesimos(1000),
        unidade: 'un',
        precoUnitario: Dinheiro.ZERO,
      },
    ])
    expect(linhas[0].precoUnitarioCentavos).toBeNull()
    expect(linhas[1].precoUnitarioCentavos).toBe(0)

    const resultado = Schemas.validarSubmissao(
      Pedido.entradaDeSubmissao({
        obraId: 'obra-1',
        fornecedorId: 'forn-1',
        dataPedido: new Date('2026-10-30T12:00:00Z'),
        observacoes: null,
        itens: linhas,
      }),
    )

    expect(!resultado.ok && Object.keys(resultado.erro.campos ?? {})).toEqual(['itens.0.precoUnitario'])
  })

  it('exige a data do pedido, ancorada em dataPedido, e recusa data que nao existe', () => {
    const base = { obraId: 'obra-1', fornecedorId: 'forn-1', itens: [itemValido()] }
    const semData = Schemas.validarSubmissao(base)
    const dataVazia = Schemas.validarSubmissao({ ...base, dataPedido: '' })
    const dataInexistente = Schemas.validarSubmissao({ ...base, dataPedido: '2026-02-30' })
    const comData = Schemas.validarSubmissao({ ...base, dataPedido: '2026-10-30' })

    expect(!semData.ok && semData.erro.campos?.dataPedido).toBe('Informe a data do pedido.')
    expect(!dataVazia.ok && dataVazia.erro.campos?.dataPedido).toBe('Informe a data do pedido.')
    expect(!dataInexistente.ok && typeof dataInexistente.erro.campos?.dataPedido).toBe('string')
    // A data e civil: gravada ao meio-dia UTC, ela volta como o mesmo dia no fuso do pedido.
    expect(comData.ok && comData.valor.dataPedido.toISOString()).toBe('2026-10-30T12:00:00.000Z')
    expect(comData.ok && Schemas.dataParaEntrada(comData.valor.dataPedido)).toBe('2026-10-30')
  })

  it('recusa descricao acima de 200 e observacoes acima de 2000 caracteres', () => {
    const descricaoLonga = Schemas.validarSubmissao({
      obraId: 'obra-1',
      fornecedorId: 'forn-1',
      dataPedido: '2026-10-30',
      itens: [itemValido({ descricao: 'x'.repeat(201) })],
    })
    const observacoesLongas = Schemas.validarSubmissao({
      obraId: 'obra-1',
      fornecedorId: 'forn-1',
      dataPedido: '2026-10-30',
      observacoes: 'x'.repeat(2001),
      itens: [itemValido()],
    })

    expect(!descricaoLonga.ok && descricaoLonga.erro.codigo).toBe('VALIDACAO')
    expect(!observacoesLongas.ok && observacoesLongas.erro.codigo).toBe('VALIDACAO')
  })

  it('devolve campos em CamposComErro e descarta o que e do servidor', () => {
    const resultado = Schemas.validarSubmissao({
      obraId: 'obra-1',
      fornecedorId: 'forn-1',
      dataPedido: '2026-10-30',
      itens: [itemValido({ quantidade: 'abc' })],
    })

    expect(!resultado.ok && resultado.erro.codigo).toBe('VALIDACAO')
    // CamposComErro e Record<string, string>: caminho achatado por ponto, mensagem como texto.
    // O formato nativo do Zod (issues com path em array) nao atravessa a borda.
    const campos = !resultado.ok ? resultado.erro.campos : undefined
    expect(campos).toBeDefined()
    expect(typeof campos?.['itens.0.quantidade']).toBe('string')
    expect(Object.values(campos ?? {}).every((v) => typeof v === 'string')).toBe(true)

    // totalCentavos e situacao sao do servidor; enviados pelo cliente, sao descartados.
    const comDataPedido = Schemas.validarSubmissao({
      obraId: 'obra-1',
      fornecedorId: 'forn-1',
      dataPedido: '2026-10-30',
      totalCentavos: 1,
      situacao: 'aprovado',
      itens: [itemValido()],
    })
    expect(comDataPedido.ok).toBe(true)
    expect(comDataPedido.ok && 'situacao' in comDataPedido.valor).toBe(false)
    expect(comDataPedido.ok && 'totalCentavos' in comDataPedido.valor).toBe(false)
    // A coercao usa os parsers do dominio: "2,5" sc vira 2500 milesimos, "33,00" vira 3300.
    expect(comDataPedido.ok && comDataPedido.valor.itens[0].quantidade).toBe(2500)
    expect(comDataPedido.ok && comDataPedido.valor.itens[0].precoUnitario).toBe(3300)
  })
})

describe('obraSchema e fornecedorSchema', () => {
  it('exige nome e cidade da obra, com erro em cada campo', () => {
    const vazia = Schemas.validarObra({})
    const ok = Schemas.validarObra({ nome: '  Edifício Íris ', cidade: 'Lauro de Freitas/BA' })

    expect(!vazia.ok && Object.keys(vazia.erro.campos ?? {}).sort()).toEqual(['cidade', 'nome'])
    expect(ok.ok && ok.valor).toEqual({ nome: 'Edifício Íris', cidade: 'Lauro de Freitas/BA' })
  })

  it('aceita fornecedor sem CNPJ, grava o CNPJ mascarado e recusa o que não tem 14 dígitos', () => {
    const semCnpj = Schemas.validarFornecedor({ nome: 'Vidraçaria Sol', documento: '' })
    const semMascara = Schemas.validarFornecedor({ nome: 'Madeireira', documento: '11222333000181' })
    const curto = Schemas.validarFornecedor({ nome: 'Madeireira', documento: '123' })

    expect(semCnpj.ok && semCnpj.valor.documento).toBeUndefined()
    expect(semMascara.ok && semMascara.valor.documento).toBe('11.222.333/0001-81')
    expect(!curto.ok && Object.keys(curto.erro.campos ?? {})).toEqual(['documento'])
  })
})
