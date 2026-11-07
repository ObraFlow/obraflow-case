'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'

import { Dinheiro, Quantidade, type Centavos, type Milesimos, type Papel } from '@/src/domain'
import { FalhaDaApi } from '@/src/ui/api'
import { decidirPedido, pegarPedido } from '@/src/ui/pedidos'
import { useRecurso } from '@/src/ui/hooks/useRecurso'
import type { ItemPublico, PedidoPublico } from '@/src/ui/tipos'
import { CadeiaVertical } from './CadeiaDoPedido'
import { DialogoDeRejeicao } from './DialogoDeRejeicao'
import { CaixaDeErro, EsqueletoDeLista } from './estados'
import {
  ALVO_DE_TOQUE,
  BOTAO_APROVAR,
  BOTAO_REJEITAR,
  CARTAO,
  DESABILITADO_NEUTRO,
  NOTA,
} from './estilos'
import { IconeErro } from './icones'
import {
  ETIQUETA_DA_SITUACAO,
  ROTULO_DO_PAPEL,
  dataComHora,
  dataCurta,
  faixaDoSnapshot,
} from './rotulos'

type Props = {
  pedidoId: number
  sessao: { id: string; nome: string; papel: Papel }
  /** O papel autoriza decidir? Vem da matriz da Sprint 3, o mesmo lugar que a rota consulta. */
  podePapelDecidir: boolean
}

/**
 * Tela 2 — o detalhe do pedido e a decisão (artboards `AprovacoesC` e `PedidoDetalhe`).
 *
 * Tudo o que está na tela vem de `GET /api/pedidos/[id]`: cabeçalho, itens, a cadeia lida das
 * `Etapa` gravadas, o histórico e `podeDecidir`. A tela não recebe a alçada da obra e por isso
 * não tem como recalcular a cadeia — editar ou apagar a faixa depois da submissão não muda uma
 * linha daqui (ADR 0001).
 *
 * A decisão vai por `POST /api/pedidos/[id]/decisoes` e **só** por lá (ADR 0003). O 409 que
 * aquela rota pode devolver não é defeito: é o `UPDATE` condicional dizendo que a premissa caiu
 * entre a renderização e o clique. Quando ele chega, a tela mostra a explicação e relê o pedido
 * — que é exatamente o que "a tela achava que podia decidir" exige.
 */
export function DetalheDoPedido({ pedidoId, sessao, podePapelDecidir }: Props) {
  const buscar = useCallback(() => pegarPedido(pedidoId), [pedidoId])
  // O id da sessão entra na chave, e não só o do pedido: `podeDecidir` é resposta **para esta
  // sessão**, e trocar de pessoa pelo cabeçalho troca a pergunta. O `router.refresh()` do
  // seletor renderiza de novo o Server Component — que é quem entrega `sessao` —, mas não
  // refaz o `fetch` deste cliente. Sem a sessão na chave, a tela anunciaria a vez de quem
  // acabou de sair.
  const pedido = useRecurso<PedidoPublico>(
    buscar,
    `${pedidoId}|${sessao.id}`,
    'Não foi possível carregar este pedido.',
  )

  const [rejeitando, setRejeitando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<FalhaDaApi | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const dados = pedido.dados

  async function decidir(decisao: { tipo: 'aprovar' } | { tipo: 'rejeitar'; motivo: string }) {
    setEnviando(true)
    setFalha(null)
    setAviso(null)
    try {
      await decidirPedido(pedidoId, decisao)
      setRejeitando(false)
      // Relê o pedido em vez de remendar o estado local: a nova etapa da vez, a situação e o
      // histórico são do servidor, e reconstruí-los aqui seria uma segunda verdade. A página
      // não recarrega — só este recurso.
      pedido.recarregar()
    } catch (erro) {
      const apanhada =
        erro instanceof FalhaDaApi ? erro : new FalhaDaApi('SEM_RESPOSTA', String(erro))
      // 409 é a premissa caída, não erro de quem clicou: fecha o diálogo, explica e relê.
      if (apanhada.codigo === 'NAO_E_SUA_VEZ' || apanhada.codigo === 'CADEIA_CONCLUIDA') {
        setRejeitando(false)
        setAviso(apanhada.message)
        pedido.recarregar()
      } else {
        setFalha(apanhada)
      }
    } finally {
      setEnviando(false)
    }
  }

  if (pedido.carregando) {
    return (
      <main className="flex-1 px-8 py-8">
        <section className={CARTAO}>
          <EsqueletoDeLista linhas={5} rotulo="Carregando o pedido" />
        </section>
      </main>
    )
  }

  if (pedido.erro || !dados) {
    return (
      <main className="flex-1 px-8 py-8">
        <section className={CARTAO}>
          <CaixaDeErro
            titulo="Não foi possível carregar este pedido"
            detalhe={pedido.erro ?? 'Resposta vazia do servidor.'}
            aoRepetir={pedido.recarregar}
          />
        </section>
      </main>
    )
  }

  const etiqueta = ETIQUETA_DA_SITUACAO[dados.situacao]
  const bloqueio = motivoDoBloqueio(dados, sessao, podePapelDecidir)
  const rejeicao = dados.cadeia.find((etapa) => etapa.situacao === 'rejeitada') ?? null

  return (
    <main className="flex flex-1 flex-col">
      <div className="border-b border-neutro-200 bg-cartao px-8 pt-[22px] pb-[26px]">
        <Link
          href="/pedidos"
          className={`inline-flex min-h-9 ${ALVO_DE_TOQUE} items-center gap-[7px] text-[13px] font-semibold text-neutro-600 hover:text-forte`}
        >
          <span aria-hidden="true">←</span> Voltar para a lista
        </Link>

        <div className="mt-2.5 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-[28px] font-[650] tracking-[-0.032em] text-forte">
              Pedido #{dados.id}
            </h1>
            <p className="mt-2 text-[13.5px] text-neutro-600">
              {dados.obra?.nome ?? 'Sem obra'} · {dados.fornecedor?.nome ?? 'Sem fornecedor'} ·{' '}
              {dados.dataPedido
                ? `emitido em ${dataCurta(dados.dataPedido)}`
                : 'ainda não enviado'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`${CHIP} border-neutro-200 bg-neutro-50 text-neutro-600`}>
                Somente leitura
              </span>
              <span className={`${CHIP} ${etiqueta.classe}`}>
                {etiqueta.texto}
                {dados.etapaAtual &&
                  ` · ordem ${dados.etapaAtual.ordem + 1} de ${dados.cadeia.length}`}
              </span>
              <span className={`${CHIP} border-marca-100 bg-marca-15 text-marca-800`}>
                {faixaDoSnapshot(dados.faixa)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[12px] text-neutro-600">Total do pedido</span>
            <p className="mt-1 text-[34px] font-[650] tracking-[-0.038em] text-forte tabular-nums">
              {Dinheiro.formatar(dados.totalCentavos as Centavos)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-[22px] px-8 pt-[26px] pb-10">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          {rejeicao && (
            <div className={`${NOTA} border-erro-borda-forte bg-erro-fundo text-erro-texto`}>
              <strong>Pedido rejeitado por {rejeicao.nome}</strong> em{' '}
              {dataComHora(rejeicao.decididoEm)}. O fluxo foi encerrado: nenhuma etapa seguinte
              chega a decidir.
              {rejeicao.motivo && (
                <p className="mt-2 rounded-r-md border-l-2 border-erro-borda-acao bg-cartao px-3 py-2 text-[13px] text-neutro-700">
                  “{rejeicao.motivo}”
                </p>
              )}
            </div>
          )}

          <section className={CARTAO}>
            <div className="border-b border-neutro-100 px-[22px] py-[18px]">
              <h2 className="text-[16px] font-[650] tracking-[-0.022em] text-forte">
                Dados gerais
              </h2>
              <p className="mt-1 text-[12.5px] text-neutro-600">
                Mesmos campos do cadastro, sem edição
              </p>
            </div>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[18px_22px] px-[22px] py-5">
              <Dado rotulo="Obra" valor={dados.obra?.nome ?? '—'} nota={dados.obra?.cidade} />
              <Dado
                rotulo="Fornecedor"
                valor={dados.fornecedor?.nome ?? '—'}
                nota={dados.fornecedor?.documento ?? undefined}
              />
              <Dado
                rotulo="Data do pedido"
                valor={dataCurta(dados.dataPedido)}
                nota={
                  dados.submetidoEm
                    ? `enviado em ${dataComHora(dados.submetidoEm)} por ${dados.criadoPor.nome}`
                    : `rascunho de ${dados.criadoPor.nome}`
                }
              />
              <Dado
                rotulo="Identificador"
                valor={`#${dados.id}`}
                nota={`${dados.itens.length} ${dados.itens.length === 1 ? 'item' : 'itens'}`}
              />
              <div className="col-span-full">
                <dt className="mb-1.5 text-[12px] text-neutro-600">Observações internas</dt>
                <dd className="m-0 font-serif text-[15px] leading-[1.55] text-neutro-700 italic">
                  {dados.observacoes?.trim() || 'Sem observações.'}
                </dd>
              </div>
            </dl>
          </section>

          <ItensDoPedido itens={dados.itens} totalCentavos={dados.totalCentavos} />

          <section className={CARTAO}>
            <div className="border-b border-neutro-100 px-[22px] py-[18px]">
              <h2 className="text-[16px] font-[650] tracking-[-0.022em] text-forte">
                Histórico de decisões
              </h2>
              <p className="mt-1 text-[12.5px] text-neutro-600">
                Trilha auditável, na ordem da cadeia gravada
              </p>
            </div>
            <div className="px-[22px] py-5">
              <CadeiaVertical
                cadeia={dados.cadeia}
                etapaAtual={dados.etapaAtual}
                sessaoId={sessao.id}
              />
            </div>
          </section>
        </div>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4" aria-label="Regra aplicada">
          <section className={CARTAO}>
            <div className="border-b border-neutro-100 px-[22px] py-[18px]">
              <h2 className="text-[16px] font-[650] tracking-[-0.022em] text-forte">
                Regra aplicada
              </h2>
            </div>
            <div className="px-[22px] py-5">
              <dl className="flex flex-col gap-3.5">
                <Dado
                  rotulo="Faixa"
                  valor={faixaDoSnapshot(dados.faixa)}
                  nota="congelada no envio do pedido"
                />
                <Dado
                  rotulo="Cadeia"
                  valor={
                    dados.cadeia.length === 0
                      ? 'Ainda não formada'
                      : dados.cadeia.map((etapa) => etapa.nome).join(' → ')
                  }
                  nota="decisão em ordem, uma de cada vez"
                />
                <Dado
                  rotulo="Etapa atual"
                  valor={
                    dados.etapaAtual
                      ? `${dados.etapaAtual.ordem + 1} de ${dados.cadeia.length} — ${dados.etapaAtual.nome}`
                      : 'Nenhuma: a cadeia terminou'
                  }
                />
              </dl>
              <div className={`${NOTA} mt-4 border-marca-50 bg-marca-15 text-marca-850`}>
                Editar a alçada da obra agora não altera este pedido: a cadeia foi gravada no
                envio.
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-4 border-t border-neutro-200 bg-cartao px-8 py-4 shadow-[0_-4px_16px_-6px_var(--sombra-suave)]">
        <div className="min-w-0">
          <p className="text-[15px] font-[650] tracking-[-0.02em] text-forte">
            {bloqueio ? bloqueio.titulo : 'A decisão é sua'}
          </p>
          {/* Nenhum botão apagado em silêncio: a explicação fica ao lado dele, sempre, e é
              diferente para cada motivo — cadeia concluída, vez de outra pessoa e papel sem
              permissão não são a mesma recusa e não cabem na mesma frase. */}
          <p className="mt-[3px] max-w-[640px] text-[12.5px] leading-[1.5] text-neutro-600">
            {bloqueio
              ? bloqueio.explicacao
              : `#${dados.id} · ${Dinheiro.formatar(dados.totalCentavos as Centavos)} · rejeitar exige motivo e encerra o pedido.`}
          </p>
          {aviso && (
            <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-erro-texto">
              <IconeErro className="mt-0.5 shrink-0" />
              {aviso} O pedido foi relido.
            </p>
          )}
          {falha && (
            <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-erro-texto">
              <IconeErro className="mt-0.5 shrink-0" />
              {falha.message}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={Boolean(bloqueio) || enviando}
            onClick={() => {
              setFalha(null)
              setAviso(null)
              setRejeitando(true)
            }}
            className={`${BOTAO_REJEITAR} ${DESABILITADO_NEUTRO}`}
          >
            Rejeitar
          </button>
          <button
            type="button"
            disabled={Boolean(bloqueio) || enviando}
            onClick={() => void decidir({ tipo: 'aprovar' })}
            className={`${BOTAO_APROVAR} ${DESABILITADO_NEUTRO}`}
          >
            {enviando ? 'Enviando…' : 'Aprovar pedido'}
          </button>
        </div>
      </div>

      {rejeitando && (
        <DialogoDeRejeicao
          pedidoId={dados.id}
          totalFormatado={Dinheiro.formatar(dados.totalCentavos as Centavos)}
          enviando={enviando}
          erro={falha ? { mensagem: falha.message, campos: falha.campos } : null}
          aoFechar={() => {
            setRejeitando(false)
            setFalha(null)
          }}
          aoConfirmar={(motivo) => void decidir({ tipo: 'rejeitar', motivo })}
        />
      )}
    </main>
  )
}

/**
 * Por que a decisão não está disponível — ou `null` quando ela está.
 *
 * Quatro motivos distintos, quatro frases distintas. É o critério "cadeia concluída, não é a sua
 * vez e papel sem permissão têm, cada um, mensagem própria": uma frase genérica obrigaria quem
 * lê a adivinhar qual dos quatro casos é o seu.
 *
 * Isto **não** é controle de acesso: o controle é o 403 de `exigirPermissao` e o 409 do `UPDATE`
 * condicional, que valem para quem chamar a rota sem passar por esta tela.
 */
function motivoDoBloqueio(
  pedido: PedidoPublico,
  sessao: { id: string; papel: Papel },
  podePapelDecidir: boolean,
): { titulo: string; explicacao: string } | null {
  if (pedido.situacao === 'rascunho') {
    return {
      titulo: 'Este pedido ainda é um rascunho',
      explicacao:
        'A cadeia de aprovação só é gravada no envio. Enquanto o pedido não for enviado não há etapa a decidir — nem para você, nem para ninguém.',
    }
  }

  if (!podePapelDecidir) {
    return {
      titulo: 'Seu papel não decide pedidos',
      explicacao: `${ROTULO_DO_PAPEL[sessao.papel]} não aprova nem rejeita: a decisão é do aprovador da faixa. Você vê o pedido inteiro, inclusive o histórico, mas o servidor responde 403 a qualquer decisão vinda daqui.`,
    }
  }

  if (pedido.situacao === 'aprovado') {
    return {
      titulo: 'Cadeia concluída',
      explicacao:
        'Este pedido já percorreu toda a cadeia de aprovação e está aprovado. Nenhuma decisão nova é aceita — nem para reverter.',
    }
  }

  if (pedido.situacao === 'rejeitado') {
    return {
      titulo: 'Fluxo interrompido',
      explicacao:
        'A rejeição encerrou o pedido inteiro. Nenhuma etapa posterior se torna decidível, e o pedido precisa ser refeito por quem o criou.',
    }
  }

  if (!pedido.podeDecidir) {
    const naCadeia = pedido.cadeia.some((etapa) => etapa.usuarioId === sessao.id)
    const vez = pedido.etapaAtual
    return naCadeia
      ? {
          titulo: 'Ainda não é a sua vez',
          explicacao: vez
            ? `A ordem ${vez.ordem + 1} da cadeia é de ${vez.nome}, e é quem decide agora. A sua etapa só abre depois que as anteriores forem aprovadas — fora de ordem, o servidor responde 409 NAO_E_SUA_VEZ.`
            : 'Há uma etapa anterior aguardando decisão.',
        }
      : {
          titulo: 'Você não está na cadeia deste pedido',
          explicacao: `A cadeia foi gravada no envio, a partir da faixa da obra, e você não está nela.${
            vez ? ` Quem decide agora é ${vez.nome}.` : ''
          } Entrar na faixa hoje não muda este pedido (ADR 0001).`,
        }
  }

  return null
}

/**
 * Os itens, em tabela no desktop e em cartões na tela estreita.
 *
 * As duas formas renderizam os mesmos dados — não há conteúdo que exista só numa das duas. A
 * troca é por `md:`, e não por medição em JavaScript, para que a primeira pintura já esteja
 * certa.
 */
function ItensDoPedido({
  itens,
  totalCentavos,
}: {
  itens: readonly ItemPublico[]
  totalCentavos: number
}) {
  const total = Dinheiro.formatar(totalCentavos as Centavos)

  return (
    <section className={CARTAO}>
      <div className="border-b border-neutro-100 px-[22px] py-[18px]">
        <h2 className="text-[16px] font-[650] tracking-[-0.022em] text-forte">Itens do pedido</h2>
        <p className="mt-1 text-[12.5px] text-neutro-600">
          {itens.length} {itens.length === 1 ? 'item' : 'itens'} · o total é o que define a alçada
        </p>
      </div>

      <table className="hidden w-full border-collapse md:table">
        <caption className="sr-only">Itens do pedido</caption>
        <thead>
          <tr>
            <th scope="col" className={CABECALHO}>
              Descrição
            </th>
            <th scope="col" className={`${CABECALHO} text-right`}>
              Quantidade
            </th>
            <th scope="col" className={CABECALHO}>
              Unidade
            </th>
            <th scope="col" className={`${CABECALHO} text-right`}>
              Preço unitário
            </th>
            <th scope="col" className={`${CABECALHO} text-right`}>
              Total do item
            </th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id}>
              <td className={`${CELULA} font-semibold text-forte`}>{item.descricao}</td>
              <td className={`${CELULA} text-right tabular-nums`}>
                {Quantidade.formatar(item.quantidadeMilesimos as Milesimos)}
              </td>
              <td className={CELULA}>{item.unidade}</td>
              <td className={`${CELULA} text-right tabular-nums`}>
                {item.precoUnitarioCentavos === null
                  ? '—'
                  : Dinheiro.formatar(item.precoUnitarioCentavos as Centavos)}
              </td>
              <td className={`${CELULA} text-right tabular-nums`}>
                {Dinheiro.formatar(item.totalCentavos as Centavos)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="bg-neutro-25 px-[22px] py-3 text-[13px] font-semibold text-forte">
              Total do pedido · valor que define a alçada
            </td>
            <td className="bg-neutro-25 px-[22px] py-3 text-right text-[17px] font-[650] tracking-[-0.025em] text-forte tabular-nums">
              {total}
            </td>
          </tr>
        </tfoot>
      </table>

      <ul className="md:hidden">
        {itens.map((item) => (
          <li key={item.id} className="border-b border-neutro-100 px-[22px] py-3.5">
            <p className="text-[14px] font-semibold text-forte">{item.descricao}</p>
            <p className="mt-1 text-[12.5px] text-neutro-600">
              {Quantidade.formatar(item.quantidadeMilesimos as Milesimos)} {item.unidade} ×{' '}
              {item.precoUnitarioCentavos === null
                  ? '—'
                  : Dinheiro.formatar(item.precoUnitarioCentavos as Centavos)}
            </p>
            <p className="mt-1.5 text-[14px] font-[650] text-forte tabular-nums">
              {Dinheiro.formatar(item.totalCentavos as Centavos)}
            </p>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 bg-neutro-25 px-[22px] py-3.5">
          <span className="text-[13px] font-semibold text-forte">Total do pedido</span>
          <span className="text-[17px] font-[650] text-forte tabular-nums">{total}</span>
        </li>
      </ul>

      {itens.length === 0 && (
        <p className="px-[22px] py-6 text-center text-[13px] text-neutro-600">
          Este pedido não tem item nenhum.
        </p>
      )}
    </section>
  )
}

function Dado({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div>
      <dt className="mb-1.5 text-[12px] text-neutro-600">{rotulo}</dt>
      <dd className="m-0 text-[14.5px] leading-[1.45] font-semibold tracking-[-0.015em] text-forte">
        {valor}
        {nota && <small className="mt-[3px] block text-[12.5px] font-normal text-neutro-600">{nota}</small>}
      </dd>
    </div>
  )
}

const CHIP =
  'inline-flex items-center gap-1.5 rounded-full border px-[11px] py-1 text-[12px] font-[650]'
const CABECALHO =
  'border-b border-neutro-200 bg-neutro-25 px-[22px] py-2.5 text-left text-[12px] font-semibold whitespace-nowrap text-neutro-600'
const CELULA = 'border-b border-neutro-50 px-[22px] py-3.5 text-[14px] text-neutro-700'
