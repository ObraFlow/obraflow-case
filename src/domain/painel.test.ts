import { describe, expect, it } from 'vitest'

import * as Painel from './painel'
import { deCentavos, formatar } from './dinheiro'
import type { SituacaoDaEtapa, SituacaoDoPedido } from './tipos'

const AGORA = new Date('2026-10-31T12:00:00.000Z')

function h(horasAtras: number): Date {
  return new Date(AGORA.getTime() - horasAtras * Painel.UMA_HORA_EM_MS)
}

type EtapaCrua = {
  nome: string
  situacao: SituacaoDaEtapa
  decididoEm?: Date | null
  motivo?: string | null
}

let proximo = 1000

function pedido(dados: {
  situacao: SituacaoDoPedido
  reais?: number
  submetidoEm?: Date | null
  obraId?: string
  obraNome?: string
  faixaLimiteCentavos?: number | null
  faixaSemTeto?: boolean
  etapas?: EtapaCrua[]
}): Painel.PedidoDoPainel {
  proximo += 1
  return {
    id: proximo,
    obraId: dados.obraId ?? 'obra-1',
    obraNome: dados.obraNome ?? 'Residencial Aurora',
    fornecedorNome: 'Aço Norte',
    situacao: dados.situacao,
    totalCentavos: deCentavos((dados.reais ?? 100) * 100),
    qtdItens: 2,
    submetidoEm: dados.submetidoEm === undefined ? h(100) : dados.submetidoEm,
    faixaLimiteCentavos: dados.faixaLimiteCentavos ?? 1_000_000,
    faixaSemTeto: dados.faixaSemTeto ?? false,
    etapas: (dados.etapas ?? []).map((e, i) => ({
      ordem: i,
      usuarioId: `u-${e.nome}`,
      nome: e.nome,
      situacao: e.situacao,
      decididoEm: e.decididoEm ?? null,
      motivo: e.motivo ?? null,
    })),
  }
}

describe('quando a etapa recebeu a vez', () => {
  it('a primeira recebe na submissão do pedido', () => {
    const p = pedido({
      situacao: 'pendente',
      submetidoEm: h(30),
      etapas: [{ nome: 'Amanda', situacao: 'pendente' }],
    })
    expect(Painel.recebeuAVezEm(p, 0)).toEqual(h(30))
  })

  it('a segunda recebe quando a primeira foi decidida, não quando o pedido foi submetido', () => {
    const p = pedido({
      situacao: 'pendente',
      submetidoEm: h(30),
      etapas: [
        { nome: 'Amanda', situacao: 'aprovada', decididoEm: h(26) },
        { nome: 'João', situacao: 'pendente' },
      ],
    })
    expect(Painel.recebeuAVezEm(p, 1)).toEqual(h(26))
  })

  it('a segunda não recebeu a vez enquanto a primeira não decidiu', () => {
    const p = pedido({
      situacao: 'pendente',
      etapas: [
        { nome: 'Amanda', situacao: 'pendente' },
        { nome: 'João', situacao: 'pendente' },
      ],
    })
    expect(Painel.recebeuAVezEm(p, 1)).toBeNull()
  })
})

describe('parado há', () => {
  it('conta do instante em que quem tem a vez a recebeu, não da submissão', () => {
    const p = pedido({
      situacao: 'pendente',
      submetidoEm: h(100),
      etapas: [
        { nome: 'Amanda', situacao: 'aprovada', decididoEm: h(10) },
        { nome: 'João', situacao: 'pendente' },
      ],
    })
    expect(Painel.paradoHaEmMs(p, AGORA)).toBe(10 * Painel.UMA_HORA_EM_MS)
  })

  it('pedido já decidido não está parado com ninguém', () => {
    const p = pedido({
      situacao: 'aprovado',
      etapas: [{ nome: 'Amanda', situacao: 'aprovada', decididoEm: h(2) }],
    })
    expect(Painel.paradoHaEmMs(p, AGORA)).toBeNull()
  })
})

describe('tempo até a decisão', () => {
  it('vai da submissão à última assinatura', () => {
    const p = pedido({
      situacao: 'aprovado',
      submetidoEm: h(20),
      etapas: [
        { nome: 'Amanda', situacao: 'aprovada', decididoEm: h(14) },
        { nome: 'João', situacao: 'aprovada', decididoEm: h(5) },
      ],
    })
    expect(Painel.tempoAteDecisaoEmMs(p)).toBe(15 * Painel.UMA_HORA_EM_MS)
  })

  it('é nulo enquanto a cadeia não terminou', () => {
    const p = pedido({ situacao: 'pendente', etapas: [{ nome: 'Amanda', situacao: 'pendente' }] })
    expect(Painel.tempoAteDecisaoEmMs(p)).toBeNull()
  })
})

describe('KPIs', () => {
  const j = Painel.janela(AGORA, 30)

  it('a variação é nula quando o período anterior é zero, e não 100%', () => {
    const k = Painel.kpis([pedido({ situacao: 'pendente', submetidoEm: h(24) })], j, AGORA)
    expect(k.pedidos.valor).toBe(1)
    expect(k.pedidos.anterior).toBe(0)
    expect(k.pedidos.variacao).toBeNull()
  })

  it('compara com a janela imediatamente anterior, do mesmo tamanho', () => {
    const k = Painel.kpis(
      [
        pedido({ situacao: 'pendente', submetidoEm: h(24) }),
        pedido({ situacao: 'pendente', submetidoEm: h(48) }),
        // 40 dias atrás: cai na janela anterior (de 60 a 30 dias atrás).
        pedido({ situacao: 'pendente', submetidoEm: h(40 * 24) }),
      ],
      j,
      AGORA,
    )
    expect(k.pedidos).toEqual({ valor: 2, anterior: 1, variacao: 1 })
  })

  it('o valor aprovado soma só pedidos de cadeia concluída', () => {
    const k = Painel.kpis(
      [
        pedido({ situacao: 'aprovado', reais: 300, submetidoEm: h(24) }),
        pedido({ situacao: 'pendente', reais: 999, submetidoEm: h(24) }),
        pedido({ situacao: 'rejeitado', reais: 888, submetidoEm: h(24) }),
      ],
      j,
      AGORA,
    )
    expect(k.valorAprovadoCentavos.valor).toBe(30_000)
  })

  it('"parados" é do agora, não do período: um travado há 40 dias continua travado hoje', () => {
    const travado = pedido({
      situacao: 'pendente',
      reais: 500,
      submetidoEm: h(40 * 24),
      etapas: [{ nome: 'João', situacao: 'pendente' }],
    })
    const k = Painel.kpis([travado], j, AGORA)
    // Fora da janela de 30 dias: não conta como pedido do período...
    expect(k.pedidos.valor).toBe(0)
    // ...mas está parado agora, e é isso que o cartão de alerta existe para mostrar.
    expect(k.parados.quantidade).toBe(1)
    expect(k.parados.criticos).toBe(1)
    expect(k.parados.valorTravadoCentavos).toBe(50_000)
  })

  it('pendente há menos de 24 h não entra em "parados"', () => {
    const k = Painel.kpis(
      [
        pedido({
          situacao: 'pendente',
          submetidoEm: h(5),
          etapas: [{ nome: 'Amanda', situacao: 'pendente' }],
        }),
      ],
      j,
      AGORA,
    )
    expect(k.parados.quantidade).toBe(0)
  })

  it('conta quantas rejeições têm motivo registrado em vez de supor que todas têm', () => {
    const k = Painel.kpis(
      [
        pedido({
          situacao: 'rejeitado',
          submetidoEm: h(24),
          etapas: [{ nome: 'Amanda', situacao: 'rejeitada', decididoEm: h(20), motivo: 'Caro' }],
        }),
        pedido({
          situacao: 'rejeitado',
          submetidoEm: h(24),
          etapas: [{ nome: 'Amanda', situacao: 'rejeitada', decididoEm: h(20), motivo: '' }],
        }),
      ],
      j,
      AGORA,
    )
    expect(k.rejeicao).toEqual({ rejeitados: 2, total: 2, comMotivo: 1, taxa: 1 })
  })
})

describe('corte por faixa', () => {
  it('agrupa pelo snapshot do pedido, não pela alçada de hoje', () => {
    const cortes = Painel.porFaixa([
      pedido({ situacao: 'aprovado', faixaLimiteCentavos: 1_000_000 }),
      pedido({ situacao: 'pendente', faixaLimiteCentavos: 1_000_000 }),
      pedido({ situacao: 'pendente', faixaSemTeto: true, faixaLimiteCentavos: null }),
    ])
    // O rótulo sai de `Dinheiro.formatar`, e a expectativa também: o separador que o Intl usa
    // em pt-BR é espaço **inquebrável**, e escrevê-lo à mão aqui testaria a tecla de espaço.
    expect(cortes.map((c) => [c.rotulo, c.pedidos])).toEqual([
      [`Até ${formatar(deCentavos(1_000_000))}`, 2],
      ['Faixa sem teto', 1],
    ])
  })

  it('rascunho não entra: ele não tem faixa, porque não foi submetido', () => {
    expect(Painel.porFaixa([pedido({ situacao: 'rascunho', submetidoEm: null })])).toEqual([])
  })
})

describe('corte por aprovador', () => {
  it('mede de receber a vez até decidir, e ignora etapa ainda pendente', () => {
    const cortes = Painel.porAprovador([
      pedido({
        situacao: 'pendente',
        submetidoEm: h(20),
        etapas: [
          { nome: 'Amanda', situacao: 'aprovada', decididoEm: h(16) },
          { nome: 'João', situacao: 'pendente' },
        ],
      }),
    ])
    expect(cortes).toEqual([
      {
        usuarioId: 'u-Amanda',
        nome: 'Amanda',
        decisoes: 1,
        tempoMedioEmMs: 4 * Painel.UMA_HORA_EM_MS,
        nivelMaximo: 1,
      },
    ])
  })
})

describe('fila de atenção', () => {
  it('traz os parados há mais de 24 h, do mais antigo para o mais novo', () => {
    const fila = Painel.filaDeAtencao(
      [
        pedido({
          situacao: 'pendente',
          submetidoEm: h(30),
          etapas: [{ nome: 'Amanda', situacao: 'pendente' }],
        }),
        pedido({
          situacao: 'pendente',
          submetidoEm: h(80),
          etapas: [{ nome: 'João', situacao: 'pendente' }],
        }),
        pedido({
          situacao: 'pendente',
          submetidoEm: h(3),
          etapas: [{ nome: 'Amanda', situacao: 'pendente' }],
        }),
      ],
      AGORA,
    )
    expect(fila.map((l) => [l.comQuem, Math.round(l.paradoHaEmMs / Painel.UMA_HORA_EM_MS)])).toEqual(
      [
        ['João', 80],
        ['Amanda', 30],
      ],
    )
    expect(fila[0].critico).toBe(true)
    expect(fila[1].critico).toBe(false)
  })
})

describe('série semanal', () => {
  it('põe o pedido na semana em que foi aprovado, não na em que foi submetido', () => {
    const serie = Painel.serieSemanal(
      [
        pedido({
          situacao: 'aprovado',
          reais: 1000,
          submetidoEm: h(20 * 24),
          etapas: [{ nome: 'Amanda', situacao: 'aprovada', decididoEm: h(3 * 24) }],
        }),
      ],
      AGORA,
      6,
    )
    const ultima = serie.pontos[serie.pontos.length - 1]
    expect(ultima.rotulo).toBe('S6')
    expect(ultima.porObra['obra-1']).toBe(100_000)
    // A semana da submissão (3 semanas atrás) fica zerada: lá nada foi aprovado.
    expect(serie.pontos[3].porObra['obra-1']).toBe(0)
  })
})
