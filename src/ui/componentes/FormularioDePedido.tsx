'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'

import { Dinheiro, Schemas, type CamposComErro, type Centavos } from '@/src/domain'
import { FalhaDaApi } from '@/src/ui/api'
import {
  corpoDoFormulario,
  formularioDoPedido,
  formularioEmBranco,
  itemEmBranco,
  mensagensSemAncora,
  motivoDoBloqueio,
  problemasDoFormulario,
  type EstadoDoFormulario,
  type ItemLocal,
} from '@/src/ui/formulario-de-pedido'
import { useRecurso } from '@/src/ui/hooks/useRecurso'
import { pegarFaixas } from '@/src/ui/alcadas'
import {
  criarRascunho,
  pegarPedido,
  salvarRascunho,
  submeterPedido,
} from '@/src/ui/pedidos'
import type {
  FornecedorPublico,
  ObraDoPedido,
  SubmissaoPublica,
} from '@/src/ui/tipos'
import { CaixaDeErro } from './estados'
import { ItensDoPedido } from './ItensDoPedido'
import { ResumoDoPedido } from './ResumoDoPedido'
import { IconeAviso, IconeConfirmado, IconeErro } from './icones'
import { BOTAO, BOTAO_ESCURO, CARTAO, NOTA, ROTULO_DE_CAMPO, campo } from './estilos'

/**
 * Tela 1 — Cadastro de pedido (artboard `Main`).
 *
 * Três coisas que são critério e não estilo:
 *
 * - **a data do pedido é campo obrigatório**, como o enunciado pede: é a data de emissão que quem
 *   compra declara. O rascunho a aceita vazia; a submissão não. Ela não se confunde com
 *   `submetidoEm`, que o servidor carimba no envio e ninguém edita;
 * - **o rascunho é salvo pela rota de verdade**, e é por isso que sair e voltar devolve o que foi
 *   preenchido: o estado vive no banco, não no navegador. Depois de salvo, o número do pedido
 *   entra na URL, e recarregar a página retoma o mesmo rascunho;
 * - **a submissão é outra chamada**. A tela salva e depois submete, porque é o rascunho gravado
 *   que o servidor valida por inteiro. `SEM_REGRA_APLICAVEL` não perde nada: o rascunho continua
 *   lá, e a tela diz onde criar a faixa que falta.
 */

type Props = {
  obras: readonly ObraDoPedido[]
  fornecedores: readonly FornecedorPublico[]
  /** O rascunho a retomar, lido de `?rascunho=` — `null` é pedido novo. */
  rascunhoId: number | null
}

type Envio =
  | { nome: 'parado' }
  | { nome: 'salvando' }
  | { nome: 'submetendo' }
  | { nome: 'salvo'; id: number }
  | { nome: 'submetido'; resultado: SubmissaoPublica }

export function FormularioDePedido({ obras, fornecedores, rascunhoId }: Props) {
  const [pedidoId, setPedidoId] = useState<number | null>(rascunhoId)
  const [estado, setEstado] = useState<EstadoDoFormulario>(formularioEmBranco)
  const [camposDoServidor, setCamposDoServidor] = useState<CamposComErro>({})
  const [tocados, setTocados] = useState<ReadonlySet<string>>(new Set())
  const [erro, setErro] = useState<FalhaDaApi | null>(null)
  const [envio, setEnvio] = useState<Envio>({ nome: 'parado' })

  // Retomar o rascunho é um recurso como qualquer outro: carregando, erro e repetição nascem com
  // a tela. O `?rascunho=` da URL é a chave — sem ele não há nada a buscar.
  // Pedido novo não tem o que buscar, e a promessa resolvida é o que diz isso ao hook: chave
  // `null` o deixaria carregando para sempre, e buscar `/api/pedidos/null` acenderia um erro de
  // rede na tela de quem ainda não salvou nada.
  const buscar = useCallback(
    () => (rascunhoId === null ? Promise.resolve(null) : pegarPedido(rascunhoId).then(preencher)),
    [rascunhoId],
  )
  function preencher(pedido: Awaited<ReturnType<typeof pegarPedido>>) {
    setEstado(formularioDoPedido(pedido))
    return pedido
  }
  const rascunho = useRecurso(
    buscar,
    rascunhoId === null ? 'novo' : String(rascunhoId),
    'Não foi possível carregar o rascunho.',
  )
  const carregandoRascunho = rascunhoId !== null && rascunho.carregando

  // As faixas da obra escolhida: é o que permite avisar que a obra não tem alçada **antes** de a
  // pessoa montar o pedido inteiro e descobrir no envio. A faixa aplicável em si só é resolvida
  // no servidor, na submissão (ADR 0001) — a tela não decide alçada.
  const faixas = useRecurso(
    useCallback(() => pegarFaixas(estado.obraId), [estado.obraId]),
    estado.obraId || null,
    'Não foi possível ler a alçada desta obra.',
  )
  const obraSemFaixas = estado.obraId !== '' && faixas.dados !== null && faixas.dados.length === 0

  const problemasLocais = problemasDoFormulario(estado)
  const visiveis = filtrarPorTocados(problemasLocais, tocados)
  const problemas: CamposComErro = { ...visiveis, ...camposDoServidor }
  // Campo que o servidor recusou e esta tela não desenha não pode sumir: vira mensagem geral.
  const semAncora = mensagensSemAncora(camposDoServidor, estado)
  const motivo = motivoDoBloqueio(estado)
  const ocupado = envio.nome === 'salvando' || envio.nome === 'submetendo'

  function mudar<C extends keyof EstadoDoFormulario>(campo: C, valor: EstadoDoFormulario[C]) {
    setEstado({ ...estado, [campo]: valor })
    marcar(campo)
  }

  function marcar(chave: string) {
    setTocados((anterior) => new Set(anterior).add(chave))
    setCamposDoServidor(semChave(camposDoServidor, chave))
  }

  function mudarItem(indice: number, campo: keyof ItemLocal, valor: string) {
    const itens = [...estado.itens]
    itens[indice] = { ...itens[indice], [campo]: valor }
    setEstado({ ...estado, itens })
    marcar(`itens.${indice}.${campo}`)
  }

  function removerItem(indice: number) {
    setEstado({ ...estado, itens: estado.itens.filter((_, i) => i !== indice) })
    setCamposDoServidor({})
  }

  function adicionarItem() {
    setEstado({ ...estado, itens: [...estado.itens, itemEmBranco()] })
  }

  /** Grava o rascunho e devolve o id. Primeiro salvamento cria; os seguintes substituem. */
  async function gravar(): Promise<number> {
    const corpo = corpoDoFormulario(estado)
    const pedido = pedidoId === null ? await criarRascunho(corpo) : await salvarRascunho(pedidoId, corpo)

    if (pedidoId === null) {
      setPedidoId(pedido.id)
      // O número do pedido entra na URL para que recarregar e voltar retomem o mesmo rascunho.
      // `replaceState` e não `router.replace`: nada no servidor depende do parâmetro, e a
      // navegação remontaria a página inteira para mudar um dado de leitura.
      window.history.replaceState(null, '', `/pedidos/novo?rascunho=${pedido.id}`)
    }
    return pedido.id
  }

  async function salvar() {
    setErro(null)
    setCamposDoServidor({})
    setEnvio({ nome: 'salvando' })
    try {
      setEnvio({ nome: 'salvo', id: await gravar() })
    } catch (falha) {
      recusado(falha)
    }
  }

  async function submeter() {
    setErro(null)
    setCamposDoServidor({})
    setTocados(TODOS)
    setEnvio({ nome: 'submetendo' })
    try {
      const id = await gravar()
      setEnvio({ nome: 'submetido', resultado: await submeterPedido(id) })
    } catch (falha) {
      recusado(falha)
    }
  }

  function recusado(falha: unknown) {
    setEnvio({ nome: 'parado' })
    if (falha instanceof FalhaDaApi) {
      setErro(falha)
      setCamposDoServidor(falha.campos)
      setTocados(TODOS)
      return
    }
    setErro(new FalhaDaApi('ERRO_INTERNO', 'Erro inesperado ao falar com o servidor.'))
  }

  if (envio.nome === 'submetido') {
    return <PedidoSubmetido resultado={envio.resultado} />
  }

  return (
    <main className="flex flex-auto flex-col">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-neutro-200 bg-cartao px-8 py-5">
        <div>
          <p className="mb-1.5 text-[12px] text-neutro-600">
            <Link href="/pedidos" className="hover:text-marca-700">
              Pedidos de compra
            </Link>{' '}
            / Novo
          </p>
          <h1 className="text-[24px] font-[650] tracking-[-0.03em] text-forte">
            Novo pedido de compra
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/pedidos" className={`${BOTAO} inline-flex items-center`}>
            Cancelar
          </Link>
          {/* O artboard não desenha este botão; a sprint exige salvar e voltar depois.
              Divergência declarada na SPEC, com o estilo do botão secundário do próprio
              artboard, para não introduzir linguagem visual nova. */}
          <button type="button" onClick={salvar} disabled={ocupado} className={`${BOTAO} disabled:opacity-60`}>
            {envio.nome === 'salvando' ? 'Salvando…' : 'Salvar rascunho'}
          </button>
          <button
            type="button"
            onClick={submeter}
            disabled={ocupado || motivo !== null}
            aria-describedby={motivo ? 'motivo-do-bloqueio' : undefined}
            className={`${BOTAO_ESCURO} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {envio.nome === 'submetendo' ? 'Enviando…' : 'Cadastrar pedido'}
          </button>
        </div>

        {motivo && (
          <p id="motivo-do-bloqueio" className="basis-full text-right text-[12px] text-neutro-600">
            Falta para enviar: <strong className="font-semibold text-neutro-700">{motivo}</strong>
          </p>
        )}
      </header>

      <div className="flex flex-wrap items-start gap-6 px-8 pt-7 pb-10">
        <div className="flex min-w-0 flex-[999_1_540px] flex-col gap-5">
          <section className={CARTAO}>
            <div className="border-b border-neutro-100 px-5 py-[18px]">
              <h2 className="text-[15px] font-[650] tracking-[-0.02em] text-forte">Dados gerais</h2>
              <p className="mt-1 text-[12px] text-neutro-600">
                A obra e o valor total definem a alçada aplicada ao pedido.
              </p>
            </div>

            <div className="p-5">
              {carregandoRascunho ? (
                <EsqueletoDeDados />
              ) : rascunho.erro ? (
                <CaixaDeErro
                  titulo="Não foi possível carregar o rascunho"
                  detalhe={rascunho.erro}
                  aoRepetir={rascunho.recarregar}
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Escolha
                    id="obra"
                    rotulo="Obra"
                    obrigatorio
                    vazio={obras.length === 0}
                    textoVazio="Nenhuma obra cadastrada. Rode `npm run seed`."
                    valor={estado.obraId}
                    problema={problemas.obraId}
                    aoMudar={(valor) => mudar('obraId', valor)}
                    opcoes={obras.map((obra) => ({
                      valor: obra.id,
                      texto: `${obra.nome} — ${obra.cidade}`,
                    }))}
                  />

                  <Escolha
                    id="fornecedor"
                    rotulo="Fornecedor"
                    obrigatorio
                    vazio={fornecedores.length === 0}
                    textoVazio="Nenhum fornecedor cadastrado. Rode `npm run seed`."
                    valor={estado.fornecedorId}
                    problema={problemas.fornecedorId}
                    aoMudar={(valor) => mudar('fornecedorId', valor)}
                    opcoes={fornecedores.map((fornecedor) => ({
                      valor: fornecedor.id,
                      texto: fornecedor.documento
                        ? `${fornecedor.nome} · ${fornecedor.documento}`
                        : fornecedor.nome,
                    }))}
                  />

                  <div className="flex min-w-0 flex-col gap-1.5">
                    <label htmlFor="dataPedido" className={ROTULO_DE_CAMPO}>
                      Data do pedido{' '}
                      <span className="text-marca-700" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <input
                      id="dataPedido"
                      type="date"
                      value={estado.dataPedido}
                      onChange={(evento) => mudar('dataPedido', evento.target.value)}
                      aria-invalid={problemas.dataPedido ? true : undefined}
                      className={campo(Boolean(problemas.dataPedido))}
                    />
                    {problemas.dataPedido && <Mensagem>{problemas.dataPedido}</Mensagem>}
                  </div>

                  <div className="flex min-w-0 flex-col gap-1.5">
                    <label htmlFor="observacoes" className={ROTULO_DE_CAMPO}>
                      Observações internas
                    </label>
                    <textarea
                      id="observacoes"
                      value={estado.observacoes}
                      onChange={(evento) => mudar('observacoes', evento.target.value)}
                      maxLength={Schemas.MAX_OBSERVACOES}
                      placeholder="Justificativa, urgência, centro de custo…"
                      aria-invalid={problemas.observacoes ? true : undefined}
                      className={`${campo(Boolean(problemas.observacoes), 'min-h-[84px] w-full py-[11px]')} resize-y`}
                    />
                    {problemas.observacoes && <Mensagem>{problemas.observacoes}</Mensagem>}
                  </div>
                </div>
              )}
            </div>
          </section>

          <ItensDoPedido
            itens={estado.itens}
            problemas={problemas}
            aoMudar={mudarItem}
            aoRemover={removerItem}
            aoAdicionar={adicionarItem}
          />
        </div>

        <aside
          className="flex min-w-0 flex-[1_1_320px] flex-col gap-4"
          aria-label="Resumo do pedido"
        >
          <ResumoDoPedido itens={estado.itens} />

          {envio.nome === 'salvo' && (
            <div
              role="status"
              className={`${NOTA} border-marca-50 bg-marca-15 text-marca-850`}
            >
              <p className="flex items-start gap-2">
                <IconeConfirmado className="mt-px shrink-0" />
                <span>
                  Rascunho <strong>#{envio.id}</strong> salvo. Ele é privado: só você o vê, e
                  ele continua aqui se você sair e voltar.
                </span>
              </p>
            </div>
          )}

          {erro && <RecusaDoServidor erro={erro} />}

          {semAncora.length > 0 && (
            <div
              role="alert"
              className={`${NOTA} border-erro-borda-forte bg-erro-papel text-erro-texto`}
            >
              <p className="mb-1.5 flex items-start gap-2 font-semibold">
                <IconeErro className="mt-0.5 shrink-0" />O servidor recusou algo que não está
                em nenhum campo desta tela:
              </p>
              <ul className="ml-[26px] list-disc">
                {semAncora.map((mensagem) => (
                  <li key={mensagem}>{mensagem}</li>
                ))}
              </ul>
            </div>
          )}

          {obraSemFaixas && (
            <div role="alert" className={`${NOTA} border-aviso-borda bg-aviso-fundo text-aviso-texto`}>
              <p className="flex items-start gap-2">
                <IconeAviso className="mt-0.5 shrink-0" />
                <span>
                  <strong>Esta obra ainda não tem faixas de alçada.</strong> O rascunho pode ser
                  salvo, mas o envio será recusado até que alguém{' '}
                  <Link href="/alcadas" className="underline">
                    configure a alçada da obra
                  </Link>
                  .
                </span>
              </p>
            </div>
          )}

          <div className={`${NOTA} border-aviso-borda bg-aviso-fundo text-aviso-texto`}>
            <strong>Atenção:</strong> a faixa é resolvida no envio, pelo total final. Corrigir um
            item pode mudar a faixa — e, com ela, quem assina e em que ordem.
          </div>

          <div className={`${NOTA} border-marca-50 bg-marca-15 text-marca-850`}>
            Sem regra de alçada para a faixa, o pedido não é enviado — a tela mostra o motivo e um
            atalho para{' '}
            <Link href="/alcadas" className="underline">
              configurar a alçada da obra
            </Link>
            .
          </div>
        </aside>
      </div>
    </main>
  )
}

/** Depois do envio: o número, a faixa aplicada e a cadeia gravada, na ordem da faixa. */
function PedidoSubmetido({ resultado }: { resultado: SubmissaoPublica }) {
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-auto flex-col justify-center px-6 py-14">
      <div className={`${CARTAO} p-7`}>
        <span className="inline-flex size-[54px] items-center justify-center rounded-[14px] bg-marca-15 text-marca-800">
          <IconeConfirmado tamanho={26} />
        </span>

        <h1 className="mt-3.5 text-[20px] font-[650] tracking-[-0.025em] text-forte">
          Pedido #{resultado.id} enviado
        </h1>
        <p className="mt-2 text-[13.5px] leading-[1.55] text-neutro-600">
          O envio foi registrado agora, no servidor. A faixa aplicada foi{' '}
          <strong className="text-neutro-700">
            {resultado.faixa.semTeto
              ? 'a faixa sem teto'
              : `até ${Dinheiro.formatar((resultado.faixa.limiteCentavos ?? 0) as Centavos)}`}
          </strong>
          , e a cadeia abaixo ficou gravada no pedido — editar a alçada depois não a muda
          (ADR 0001).
        </p>

        <ol className="mt-5 flex flex-col gap-2">
          {resultado.cadeia.map((etapa) => (
            <li
              key={etapa.ordem}
              className="flex items-center gap-2.5 rounded-[10px] border border-neutro-200 px-3 py-2.5"
            >
              <span
                aria-hidden="true"
                className="flex size-6.5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-marca-500 bg-marca-15 text-[12px] font-[650] text-marca-800"
              >
                {etapa.ordem + 1}
              </span>
              <span className="text-[14px] font-semibold text-forte">{etapa.nome}</span>
              <span className="ml-auto text-[12px] text-neutro-600">{etapa.situacao}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link href="/pedidos" className={`${BOTAO} inline-flex items-center`}>
            Voltar aos pedidos
          </Link>
          <Link
            href="/pedidos/novo"
            className={`${BOTAO_ESCURO} inline-flex items-center`}
          >
            Novo pedido
          </Link>
        </div>
      </div>
    </main>
  )
}

/**
 * A recusa do servidor, com o texto que o código pede.
 *
 * `SEM_REGRA_APLICAVEL` tem mensagem própria e atalho: é o único erro desta tela em que o
 * problema não está no que a pessoa digitou, e sim na alçada da obra — e o rascunho continua
 * gravado, inteiro.
 */
function RecusaDoServidor({ erro }: { erro: FalhaDaApi }) {
  const semRegra = erro.codigo === 'SEM_REGRA_APLICAVEL'

  return (
    <div role="alert" className={`${NOTA} border-erro-borda-forte bg-erro-papel text-erro-texto`}>
      <p className="flex items-start gap-2">
        <IconeErro className="mt-0.5 shrink-0" />
        <span>
          {semRegra ? (
            <>
              <strong>O pedido não foi enviado: {erro.message.toLowerCase()}</strong> O rascunho
              continua salvo, com tudo o que você preencheu. Peça a quem administra para{' '}
              <Link href="/alcadas" className="underline">
                criar a faixa na tela de regras da alçada
              </Link>{' '}
              e envie de novo.
            </>
          ) : (
            erro.message
          )}
        </span>
      </p>
    </div>
  )
}

function Escolha({
  id,
  rotulo,
  obrigatorio,
  valor,
  opcoes,
  problema,
  vazio,
  textoVazio,
  aoMudar,
}: {
  id: string
  rotulo: string
  obrigatorio?: boolean
  valor: string
  opcoes: ReadonlyArray<{ valor: string; texto: string }>
  problema?: string
  vazio: boolean
  textoVazio: string
  aoMudar: (valor: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className={ROTULO_DE_CAMPO}>
        {rotulo}{' '}
        {obrigatorio && (
          <span className="text-marca-700" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {vazio ? (
        <p className="min-h-11 rounded-lg border border-dashed border-neutro-300 bg-neutro-50 px-3 py-[11px] text-[13px] text-neutro-600">
          {textoVazio}
        </p>
      ) : (
        <select
          id={id}
          value={valor}
          onChange={(evento) => aoMudar(evento.target.value)}
          aria-invalid={problema ? true : undefined}
          className={campo(Boolean(problema))}
        >
          <option value="">Selecione…</option>
          {opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.texto}
            </option>
          ))}
        </select>
      )}

      {problema && <Mensagem>{problema}</Mensagem>}
    </div>
  )
}

function Mensagem({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-[12px] text-erro-texto">
      <IconeErro className="shrink-0" />
      {children}
    </span>
  )
}

function EsqueletoDeDados() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-hidden="true">
      {[0, 1, 2, 3].map((n) => (
        <span key={n} className="h-[68px] animate-pulse rounded-lg bg-neutro-50" />
      ))}
    </div>
  )
}

/**
 * Enquanto ninguém tocou num campo, o erro dele não aparece: um formulário que nasce vermelho
 * ensina a ignorar o vermelho. Depois de uma tentativa de envio, tudo aparece — e aí o motivo de
 * cada campo é informação, não ruído.
 */
const TODOS: ReadonlySet<string> = new Set(['*'])

function filtrarPorTocados(problemas: CamposComErro, tocados: ReadonlySet<string>): CamposComErro {
  if (tocados.has('*')) return problemas
  return Object.fromEntries(
    Object.entries(problemas).filter(([chave]) => tocados.has(chave)),
  )
}

function semChave(campos: CamposComErro, chave: string): CamposComErro {
  if (!(chave in campos)) return campos
  return Object.fromEntries(Object.entries(campos).filter(([atual]) => atual !== chave))
}
