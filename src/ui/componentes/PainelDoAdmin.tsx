'use client'

/**
 * Tela 10 — Painel da administração (artboard `Dashboard`).
 *
 * Cinco KPIs, quatro cartões e a fila de atenção, todos de **uma** leitura de
 * `GET /api/pedidos/painel`: um `<Recurso>` em volta de tudo, um esqueleto, um erro com
 * repetição, um vazio. Cartões com estados independentes dariam cinco esqueletos piscando em
 * tempos diferentes e, pior, números de instantes diferentes que se contradizem.
 *
 * **Nenhum número é calculado aqui.** Tempo médio, "parado há", corte por faixa e por aprovador
 * saem de `src/domain/painel.ts`, que tem caso de teste; esta tela formata e desenha. O que ela
 * decide sozinha é apenas o que é desenho: largura de barra, posição de ponto, cor de série.
 *
 * Divergências deliberadas do artboard, todas por causa do dado real:
 *
 * 1. **Sem o filtro por faixa de alçada.** O artboard desenha um terceiro seletor. A faixa de um
 *    pedido é *snapshot* — pode apontar para uma faixa editada ou já apagada (ADR 0001) —, então
 *    o seletor listaria rótulos que não existem mais na alçada de hoje. O corte por faixa está
 *    no cartão próprio, que é onde ele é honesto.
 * 2. **Sem as frases de leitura editorial.** O artboard escreve "o limite de R$ 10.000 da Aurora
 *    está separando bem" e "é o número que justifica dar um suplente ao João". São opinião de
 *    quem desenhou, não derivação: inventá-las a partir do banco seria pôr na boca do produto uma
 *    conclusão que o dado não sustenta. O que **é** derivável — quantos pedidos passam por uma
 *    assinatura só, quantos dos pendentes estão parados — ficou, calculado de verdade.
 * 3. **Sem "+1 vs ontem" no cartão de alerta.** Comparar com ontem exige histórico do próprio
 *    indicador, que o modelo não guarda. O cartão mostra o valor travado e quantos já passaram de
 *    72 h, que vêm do dado de agora.
 */

import { useCallback, useState } from 'react'

import { Dinheiro, type Centavos } from '@/src/domain'
import { useRecurso } from '@/src/ui/hooks/useRecurso'
import { PERIODOS, pegarPainel, type Painel, type Periodo } from '@/src/ui/painel'
import { Recurso, Vazio } from './estados'
import { CARTAO, CODIGO, NOTA } from './estilos'
import { duracao, variacao } from './duracao'
import { IconeAviso, IconeObra } from './icones'
import { CONSTRUTORA } from './rotulos'
import { GraficoDeSituacoes } from './GraficoDeSituacoes'
import { FilaDeAtencao, GraficoDeLinhas, PorAprovador, PorFaixa } from './PainelCartoes'

export function PainelDoAdmin() {
  const [dias, setDias] = useState<Periodo>(30)
  const [obraId, setObraId] = useState<string | null>(null)

  const buscar = useCallback(() => pegarPainel(dias, obraId), [dias, obraId])
  const painel = useRecurso<Painel>(
    buscar,
    `${dias}|${obraId ?? 'todas'}`,
    'Não foi possível carregar o painel.',
  )

  // O seletor de obra precisa das obras, que vêm **dentro** da resposta. Enquanto a primeira
  // leitura não chega ele fica desabilitado em vez de sumir: um controle que aparece depois
  // empurra o resto da barra para o lado no meio do carregamento.
  const obras = painel.dados?.obras ?? []

  return (
    <main className="flex flex-1 flex-col gap-5 px-8 pt-[26px] pb-10 max-md:px-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-[650] tracking-[-0.033em] text-forte">
            Painel da empresa
          </h1>
          <p className="mt-[7px] text-[13.5px] text-neutro-600">
            Como a alçada está se comportando nas obras da {CONSTRUTORA}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="inline-flex overflow-hidden rounded-[9px] border border-neutro-300 bg-cartao"
            role="group"
            aria-label="Período"
          >
            {PERIODOS.map((opcao) => (
              <button
                key={opcao}
                type="button"
                aria-pressed={opcao === dias}
                onClick={() => setDias(opcao)}
                className={`min-h-[42px] cursor-pointer border-r border-neutro-200 px-[13px] text-[13px] last:border-r-0 ${
                  opcao === dias
                    ? 'bg-neutro-900 font-[650] text-cartao'
                    : 'bg-cartao font-[550] text-neutro-600 hover:bg-neutro-50'
                }`}
              >
                {opcao} dias
              </button>
            ))}
          </div>

          <select
            aria-label="Filtrar por obra"
            value={obraId ?? ''}
            disabled={obras.length === 0}
            onChange={(evento) => setObraId(evento.target.value || null)}
            className="min-h-[42px] rounded-[9px] border border-neutro-300 bg-cartao px-3 text-[13.5px] text-forte disabled:bg-neutro-50 disabled:text-neutro-500"
          >
            <option value="">Todas as obras</option>
            {obras.map((obra) => (
              <option key={obra.id} value={obra.id}>
                {obra.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Recurso
        recurso={painel}
        rotulo="Carregando o painel"
        tituloDoErro="Não foi possível carregar o painel"
        linhas={5}
        estaVazio={(dados) => dados.submetidos === 0}
        vazio={
          <div className={CARTAO}>
            <Vazio titulo="Nenhum pedido submetido ainda" icone={<IconeObra />}>
              O painel mede a cadeia de aprovação, e sem pedido submetido não há cadeia a medir —
              KPIs zerados e eixos vazios diriam o contrário. Rode{' '}
              <code className={CODIGO}>npm run seed</code> para popular a demonstração.
            </Vazio>
          </div>
        }
      >
        {(dados) => <Conteudo dados={dados} />}
      </Recurso>
    </main>
  )
}

function Conteudo({ dados }: { dados: Painel }) {
  return (
    <div className="flex flex-col gap-5">
      <Kpis dados={dados} />

      <div className="grid grid-cols-[1.55fr_1fr] items-start gap-5 max-lg:grid-cols-1">
        <GraficoDeLinhas serie={dados.serie} />

        <div className="flex flex-col gap-4">
          {/* O cartão de situações lê a **sua** rota, `/api/pedidos/resumo`: é o contrato daquela
              contagem, e um número com duas fontes um dia diverge. O seletor de obra chega a ele
              como propriedade — o de período não, porque "estado atual da cadeia" é do agora. */}
          <GraficoDeSituacoes obraId={dados.obraId} />

          {dados.kpis.parados.quantidade > 0 && (
            <div className={`${NOTA} border-aviso-borda-forte bg-aviso-fundo text-aviso-texto`}>
              <strong>
                {dados.kpis.parados.quantidade}{' '}
                {dados.kpis.parados.quantidade === 1 ? 'pedido está parado' : 'pedidos estão parados'}
              </strong>{' '}
              há mais de 24 h, com{' '}
              {Dinheiro.formatar(dados.kpis.parados.valorTravadoCentavos as Centavos)} travados na
              cadeia. A fila no fim da página diz com quem cada um está.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 items-start gap-5 max-lg:grid-cols-1">
        <PorFaixa dados={dados} />
        <PorAprovador linhas={dados.porAprovador} />
      </div>

      <FilaDeAtencao linhas={dados.fila} />
    </div>
  )
}

// --- KPIs ----------------------------------------------------------------------------------------

function Kpis({ dados }: { dados: Painel }) {
  const { kpis, dias } = dados
  const taxa = kpis.rejeicao.taxa

  return (
    <div className="grid grid-cols-5 gap-4 max-xl:grid-cols-3 max-md:grid-cols-1">
      <Kpi
        rotulo={`Pedidos em ${dias} dias`}
        valor={String(kpis.pedidos.valor)}
        comparado={kpis.pedidos}
        rodape={`${kpis.pedidos.anterior} no período anterior`}
      />

      <Kpi
        rotulo="Valor aprovado"
        valor={
          <>
            <small className="text-[16px] font-semibold tracking-[-0.02em] text-neutro-600">
              R${' '}
            </small>
            {Dinheiro.formatar(kpis.valorAprovadoCentavos.valor as Centavos).replace(/^R\$\s*/, '')}
          </>
        }
        comparado={kpis.valorAprovadoCentavos}
        rodape="Só pedidos com cadeia concluída"
      />

      <Kpi
        rotulo="Tempo médio até a decisão"
        valor={duracao(kpis.tempoMedioEmMs.valor)}
        // O tempo melhora quando **cai**: a comparação é invertida de propósito, e a seta para
        // baixo é a verde. Reusar a regra dos outros KPIs pintaria de vermelho uma melhora.
        comparado={
          kpis.tempoMedioEmMs.valor !== null && kpis.tempoMedioEmMs.anterior !== null
            ? {
                valor: kpis.tempoMedioEmMs.valor,
                anterior: kpis.tempoMedioEmMs.anterior,
                variacao:
                  (kpis.tempoMedioEmMs.valor - kpis.tempoMedioEmMs.anterior) /
                  kpis.tempoMedioEmMs.anterior,
              }
            : null
        }
        menorEhMelhor
        rodape="Da submissão à última assinatura"
      />

      <Kpi
        rotulo="Taxa de rejeição"
        valor={
          taxa === null ? (
            '—'
          ) : (
            <>
              {(taxa * 100).toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              <small className="text-[16px] font-semibold text-neutro-600">%</small>
            </>
          )
        }
        neutro={`${kpis.rejeicao.rejeitados} de ${kpis.rejeicao.total} pedidos`}
        rodape={
          kpis.rejeicao.rejeitados === 0
            ? 'Nenhuma rejeição no período'
            : kpis.rejeicao.comMotivo === kpis.rejeicao.rejeitados
              ? 'Todas com motivo registrado'
              : `${kpis.rejeicao.comMotivo} de ${kpis.rejeicao.rejeitados} com motivo registrado`
        }
      />

      <Kpi
        alerta
        rotulo={
          <>
            <IconeAviso tamanho={13} className="text-alerta-texto" />
            Parados há mais de 24 h
          </>
        }
        valor={String(kpis.parados.quantidade)}
        neutro={
          kpis.parados.criticos > 0 ? `${kpis.parados.criticos} há mais de 72 h` : 'nenhum crítico'
        }
        rodape={`${Dinheiro.formatar(kpis.parados.valorTravadoCentavos as Centavos)} travados na cadeia`}
      />
    </div>
  )
}

function Kpi({
  rotulo,
  valor,
  comparado,
  menorEhMelhor = false,
  neutro,
  rodape,
  alerta = false,
}: {
  rotulo: React.ReactNode
  valor: React.ReactNode
  comparado?: { valor: number; anterior: number; variacao: number | null } | null
  menorEhMelhor?: boolean
  neutro?: string
  rodape: string
  alerta?: boolean
}) {
  const texto = comparado ? variacao(comparado.variacao) : null
  const subiu = comparado?.variacao != null && comparado.variacao >= 0
  const bom = menorEhMelhor ? !subiu : subiu

  return (
    <div
      className={`rounded-[14px] border p-[18px] shadow-xs ${
        alerta ? 'border-aviso-borda-forte bg-aviso-fundo' : 'border-neutro-200 bg-cartao'
      }`}
    >
      <span className="flex items-center gap-1.5 text-[12.5px] text-neutro-600">{rotulo}</span>
      <p className="my-[9px] text-[30px] leading-[1.05] font-[650] tracking-[-0.038em] text-forte tabular-nums">
        {valor}
      </p>

      {texto ? (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[12px] font-[650] ${
            bom
              ? 'border-sucesso-borda-forte bg-sucesso-fundo text-sucesso-acao'
              : 'border-erro-borda-forte bg-erro-fundo text-erro-texto'
          }`}
        >
          <Seta paraCima={subiu} />
          {texto}
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full border border-neutro-200 bg-neutro-50 px-2 py-[3px] text-[12px] font-[650] text-neutro-600">
          {neutro ?? 'sem base de comparação'}
        </span>
      )}

      <p className="mt-2 text-[11.5px] leading-[1.45] text-neutro-500">{rodape}</p>
    </div>
  )
}

function Seta({ paraCima }: { paraCima: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden="true"
    >
      {paraCima ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M12 5v14M6 13l6 6 6-6" />}
    </svg>
  )
}
