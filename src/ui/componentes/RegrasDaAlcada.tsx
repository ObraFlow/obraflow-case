'use client'

import { useCallback, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { Alcada, type Centavos } from '@/src/domain'
import {
  criarFaixa,
  FalhaDaApi,
  pegarFaixas,
  pegarObras,
  removerFaixa,
  salvarFaixa,
  type CorpoDeFaixa,
} from '@/src/ui/alcadas'
import { useRecurso } from '@/src/ui/hooks/useRecurso'
import type { FaixaPublica, ObraPublica, UsuarioPublico } from '@/src/ui/tipos'
import { Recurso, Vazio } from './estados'
import {
  BOTAO,
  BOTAO_ESCURO,
  BOTAO_ICONE,
  BOTAO_ICONE_ATIVO,
  BOTAO_ICONE_PERIGO,
  BOTAO_BASE,
  TAMANHO_PEQUENO,
  BOTAO_PEQUENO,
  CABECALHO,
  CARTAO,
  CODIGO,
  DESABILITADO_NEUTRO,
  NOTA,
} from './estilos'
import { DialogoDeRemocao } from './DialogoDeRemocao'
import { EditorDeFaixa } from './EditorDeFaixa'
import { IconeEditar, IconeObra, IconeRemover } from './icones'

/** O que o painel lateral está editando. `nova` é a faixa que ainda não existe. */
type Edicao = { tipo: 'nova' } | { tipo: 'existente'; faixaId: string }

type Props = {
  /**
   * Os usuários que podem ser aprovadores, lidos no servidor e entregues com a página.
   *
   * Não vêm por `fetch` como as faixas porque `GET /api/usuarios` só existe com `DEMO_MODE`
   * ligada (ADR 0005): com a flag desligada, a tela de alçada perderia a lista de quem adicionar
   * e deixaria de funcionar por causa de uma rota de demonstração. Chegar com a página também
   * dispensa um quarto estado de carregamento num painel que já tem três.
   */
  usuarios: UsuarioPublico[]
}

/**
 * Tela 3 do artboard `Alcadas`: as faixas de valor de uma obra e seus aprovadores, na ordem.
 *
 * Tudo que a tela escreve passa por Route Handler (ADR 0003): não há Server Action no caminho, e
 * o que ela faz é exatamente o que um `curl` faz. A regra de alçada não é decidida aqui — a
 * ordenação, o piso implícito e o rótulo de cada faixa saem de `src/domain/alcada.ts`.
 */
export function RegrasDaAlcada({ usuarios }: Props) {
  // A obra escolhida vive na URL para que recarregar a página volte à mesma obra — e para que o
  // endereço possa ser colado. É leitura só na montagem: quem a troca depois é `trocarObra`.
  const parametros = useSearchParams()
  const [obraId, setObraId] = useState<string | null>(parametros.get('obra'))
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [emCurso, setEmCurso] = useState(false)
  const [falha, setFalha] = useState<FalhaDaApi | null>(null)

  const obras = useRecurso<ObraPublica[]>(
    pegarObras,
    'obras',
    'Não foi possível carregar as obras.',
  )

  // A obra escolhida só existe depois que a lista chega; até lá a primeira da lista é a da tela,
  // que é o que o artboard mostra — um seletor já resolvido, nunca um vazio à espera de clique.
  const obraEscolhida =
    obras.dados?.find((o) => o.id === obraId) ?? obras.dados?.[0] ?? null

  const buscarFaixas = useCallback(
    () => pegarFaixas(obraEscolhida?.id ?? ''),
    [obraEscolhida?.id],
  )
  const faixas = useRecurso<FaixaPublica[]>(
    buscarFaixas,
    obraEscolhida?.id ?? null,
    'Não foi possível carregar as faixas desta obra.',
  )

  const lista = faixas.dados ?? []
  const alcada: Alcada.Alcada = {
    obraId: obraEscolhida?.id ?? '',
    faixas: lista.map((f) => ({
      id: f.id,
      limiteCentavos: f.limiteCentavos as Centavos | null,
      aprovadores: [],
    })),
  }

  const emEdicao =
    edicao?.tipo === 'existente' ? (lista.find((f) => f.id === edicao.faixaId) ?? null) : null
  const aRemover = lista.find((f) => f.id === removendo) ?? null

  function trocarObra(id: string) {
    setObraId(id)
    // `replaceState`, e não `router.replace`: a troca não é navegação — nada no servidor depende
    // da obra, e uma navegação remontaria a página inteira para mudar um parâmetro de leitura.
    const endereco = new URL(window.location.href)
    endereco.searchParams.set('obra', id)
    window.history.replaceState(null, '', endereco)
    setEdicao(null)
    setFalha(null)
  }

  function abrir(edicaoNova: Edicao) {
    setFalha(null)
    setEdicao(edicaoNova)
  }

  async function gravar(corpo: CorpoDeFaixa) {
    if (!obraEscolhida || !edicao) return
    setEmCurso(true)
    setFalha(null)
    try {
      if (edicao.tipo === 'nova') {
        await criarFaixa(obraEscolhida.id, corpo)
      } else {
        await salvarFaixa(edicao.faixaId, corpo)
      }
      setEdicao(null)
      faixas.recarregar()
    } catch (erro) {
      setFalha(erro instanceof FalhaDaApi ? erro : new FalhaDaApi('SEM_RESPOSTA', String(erro)))
    } finally {
      setEmCurso(false)
    }
  }

  async function confirmarRemocao() {
    if (!aRemover) return
    setEmCurso(true)
    setFalha(null)
    try {
      await removerFaixa(aRemover.id)
      setRemovendo(null)
      if (edicao?.tipo === 'existente' && edicao.faixaId === aRemover.id) setEdicao(null)
      faixas.recarregar()
    } catch (erro) {
      setFalha(erro instanceof FalhaDaApi ? erro : new FalhaDaApi('SEM_RESPOSTA', String(erro)))
    } finally {
      setEmCurso(false)
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-neutro-200 bg-cartao px-8 py-5">
        <div className="flex flex-wrap items-end gap-2.5">
          <div>
            <p className="mb-1.5 text-[12px] text-neutro-600">Configurações / Alçadas</p>
            <h1 className="text-[24px] font-[650] tracking-[-0.03em] text-forte">
              Regras de alçada
            </h1>
          </div>

          <div className="ml-3 flex min-w-[300px] flex-col gap-1.5">
            <label htmlFor="obra" className="text-[13px] font-semibold text-neutro-700">
              Obra
            </label>
            <select
              id="obra"
              value={obraEscolhida?.id ?? ''}
              disabled={!obras.dados || obras.dados.length === 0}
              onChange={(evento) => trocarObra(evento.target.value)}
              className="min-h-11 w-full rounded-lg border border-neutro-300 bg-cartao px-3 py-[11px] text-[14px] text-forte disabled:bg-neutro-50 disabled:text-neutro-500"
            >
              {obras.carregando && <option value="">Carregando obras…</option>}
              {obras.erro && <option value="">Obras indisponíveis</option>}
              {obras.dados?.length === 0 && <option value="">Nenhuma obra cadastrada</option>}
              {obras.dados?.map((obra) => (
                <option key={obra.id} value={obra.id}>
                  {obra.nome} — {obra.cidade}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          disabled={!obraEscolhida}
          onClick={() => abrir({ tipo: 'nova' })}
          className={`${BOTAO_ESCURO} ${DESABILITADO_NEUTRO}`}
        >
          + Nova faixa
        </button>
      </header>

      <div className="flex flex-wrap items-start gap-6 px-8 pt-[26px] pb-10">
        <div className="flex min-w-0 flex-[999_1_540px] flex-col gap-5">
          <section className={CARTAO}>
            <div className="border-b border-neutro-100 px-5 py-[18px]">
              <h2 className="text-[15px] font-[650] tracking-[-0.02em] text-forte">
                Faixas de valor{obraEscolhida ? ` — ${obraEscolhida.nome}` : ''}
              </h2>
              <p className="mt-1 text-[12px] text-neutro-600">
                {obras.erro
                  ? 'A lista de obras não chegou, e sem ela não há faixa a contar.'
                  : obras.dados?.length === 0
                    ? 'Sem obra não há faixa: a alçada é sempre de uma obra.'
                    : faixas.carregando || !obraEscolhida
                      ? 'Carregando as faixas desta obra…'
                      : faixas.erro
                        ? 'A contagem de faixas depende da leitura que falhou.'
                        : `${lista.length} ${lista.length === 1 ? 'faixa salva' : 'faixas salvas'} · a cadeia é formada na criação do pedido, pelo total.`}
              </p>
            </div>

            {/* Os três estados não são escritos aqui: `<Recurso>` os escolhe pela forma do
                hook. São dois recursos aninhados porque são duas perguntas — quais obras
                existem, e quais faixas esta obra tem —, e cada uma pode falhar sozinha. */}
            <Recurso
              recurso={obras}
              rotulo="Carregando as obras"
              tituloDoErro="Não foi possível carregar as obras"
              vazio={
                <Vazio titulo="Nenhuma obra cadastrada" icone={<IconeObra />}>
                  Sem obra não existe alçada. Rode <code className={CODIGO}>npm run seed</code>{' '}
                  para popular a demonstração.
                </Vazio>
              }
            >
              {() => (
                <Recurso
                  recurso={faixas}
                  rotulo="Carregando as faixas"
                  tituloDoErro="Não foi possível carregar as faixas"
                  vazio={
                    <Vazio titulo="Nenhuma faixa nesta obra" icone={<IconeObra />}>
                      Enquanto esta obra não tiver faixa nenhuma, nenhum pedido dela poderá ser
                      submetido: não há quem assine. Crie a primeira faixa para liberar a
                      submissão.
                    </Vazio>
                  }
                >
                  {(faixasDaObra) => (
                    <Tabela
                      alcada={alcada}
                      faixas={faixasDaObra}
                      selecionada={emEdicao?.id ?? null}
                      aoEditar={(id) => abrir({ tipo: 'existente', faixaId: id })}
                      aoRemover={(id) => {
                        setFalha(null)
                        setRemovendo(id)
                      }}
                    />
                  )}
                </Recurso>
              )}
            </Recurso>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutro-100 px-5 py-5">
              <p className="text-[12px] text-neutro-600">
                As faixas cobrem de R$ 0,01 até sem teto, sem sobreposição. Alterar uma faixa não
                muda pedidos já criados.
              </p>
              <button
                type="button"
                disabled={!obraEscolhida}
                onClick={() => abrir({ tipo: 'nova' })}
                className={`${BOTAO_BASE} ${TAMANHO_PEQUENO} border-dashed border-neutro-300 bg-cartao font-medium text-neutro-600 hover:bg-neutro-50 disabled:cursor-not-allowed disabled:text-neutro-300`}
              >
                + Nova faixa
              </button>
            </div>
          </section>

          <div className={`${NOTA} border-aviso-borda bg-aviso-fundo text-aviso-texto`}>
            <strong>Valor sem faixa aplicável:</strong> o pedido não é submetido. O formulário
            mostra “Nenhuma faixa de alçada cobre R$ X para esta obra” com link para esta tela.
          </div>
        </div>

        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-4" aria-label="Editar faixa">
          {edicao && obraEscolhida ? (
            <EditorDeFaixa
              key={edicao.tipo === 'nova' ? 'nova' : edicao.faixaId}
              obraNome={obraEscolhida.nome}
              faixa={emEdicao}
              faixas={lista}
              usuarios={usuarios}
              salvando={emCurso}
              erro={removendo ? null : (falha?.message ?? null)}
              campos={removendo ? {} : (falha?.campos ?? {})}
              aoCancelar={() => {
                setEdicao(null)
                setFalha(null)
              }}
              aoSalvar={gravar}
            />
          ) : (
            <div className={`${CARTAO} px-5 py-6 text-center`}>
              <p className="text-[13.5px] font-[650] text-forte">Nenhuma faixa em edição</p>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-neutro-600">
                Escolha o lápis de uma faixa para editá-la, ou use “+ Nova faixa”.
              </p>
            </div>
          )}

          <div className={`${NOTA} border-marca-50 bg-marca-15 text-marca-850`}>
            Faixa com zero aprovadores não é salva. Remover a última faixa deixa a obra sem alçada
            e bloqueia novos pedidos até a reconfiguração.
          </div>
        </aside>
      </div>

      {aRemover && (
        <DialogoDeRemocao
          titulo={
            Alcada.faixaDescrita(alcada, {
              id: aRemover.id,
              limiteCentavos: aRemover.limiteCentavos as Centavos | null,
              aprovadores: [],
            }).titulo
          }
          pedidosEmAndamento={aRemover.pedidosEmAndamento}
          removendo={emCurso}
          erro={falha?.message ?? null}
          aoCancelar={() => {
            setRemovendo(null)
            setFalha(null)
          }}
          aoConfirmar={confirmarRemocao}
        />
      )}
    </main>
  )
}

function Tabela({
  alcada,
  faixas,
  selecionada,
  aoEditar,
  aoRemover,
}: {
  alcada: Alcada.Alcada
  faixas: readonly FaixaPublica[]
  selecionada: string | null
  aoEditar: (id: string) => void
  aoRemover: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse">
        <caption className="sr-only">Faixas de alçada da obra</caption>
        <thead>
          <tr>
            <th scope="col" className={`${CABECALHO} w-[26%]`}>
              Faixa de valor
            </th>
            <th scope="col" className={`${CABECALHO} w-[58%]`}>
              Aprovadores, na ordem do fluxo
            </th>
            <th scope="col" className={`${CABECALHO} w-[16%]`}>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {faixas.map((faixa) => {
            const descricao = Alcada.faixaDescrita(alcada, {
              id: faixa.id,
              limiteCentavos: faixa.limiteCentavos as Centavos | null,
              aprovadores: [],
            })
            const ativa = faixa.id === selecionada

            return (
              <tr
                key={faixa.id}
                className={`last:[&>td]:border-b-0 ${ativa ? 'bg-marca-5' : ''}`}
              >
                <td
                  className={`${CELULA} ${ativa ? 'shadow-[inset_3px_0_0_var(--color-marca-500)]' : ''}`}
                >
                  <div className="font-semibold text-forte tabular-nums">{descricao.titulo}</div>
                  <div className="mt-0.5 text-[12px] text-neutro-600">{descricao.intervalo}</div>
                </td>
                <td className={CELULA}>
                  <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                    {faixa.aprovadores.map((aprovador, indice) => (
                      <span key={aprovador.usuarioId} className="flex items-center gap-1.5">
                        {indice > 0 && (
                          <span className="text-neutro-300" aria-hidden="true">
                            →
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-neutro-200 bg-neutro-25 px-[11px] py-[5px] text-neutro-700">
                          <span className="text-[11px] font-[650] text-marca-800">
                            {indice + 1}
                          </span>
                          {aprovador.nome}
                        </span>
                      </span>
                    ))}
                  </div>
                </td>
                <td className={CELULA}>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      aria-label={`Editar faixa ${descricao.titulo}`}
                      title="Editar faixa"
                      onClick={() => aoEditar(faixa.id)}
                      className={ativa ? BOTAO_ICONE_ATIVO : BOTAO_ICONE}
                    >
                      <IconeEditar />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remover faixa ${descricao.titulo}`}
                      title="Remover faixa"
                      onClick={() => aoRemover(faixa.id)}
                      className={BOTAO_ICONE_PERIGO}
                    >
                      <IconeRemover />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const CELULA = 'border-b border-neutro-100 p-3.5 align-middle text-[14px]'
