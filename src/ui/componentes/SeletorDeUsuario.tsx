'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import type { UsuarioPublico } from '@/src/ui/tipos'
import { entrarComo, filtrarPessoas, pegarUsuarios } from '@/src/ui/usuarios'
import { Avatar } from './Avatar'
import {
  DESCRICAO_DO_PAPEL,
  ETIQUETA_DO_PAPEL,
  GRUPOS,
  ORDEM_DO_PAPEL,
} from './rotulos'
import {
  IconeBusca,
  IconeChevronBaixo,
  IconeChevronDireita,
  IconeConfirmado,
  IconeErro,
  IconeFechar,
} from './icones'

type Lista =
  | { nome: 'carregando' }
  | { nome: 'erro' }
  | { nome: 'pronta'; usuarios: UsuarioPublico[] }

const ETIQUETA_EM_USO = 'bg-marca-15 border-marca-100 text-marca-800'
const ETIQUETA_INFO = 'bg-info-fundo border-info-borda text-info-texto'
const ETIQUETA_NEUTRA = 'bg-neutro-50 border-neutro-200 text-neutro-600'

/**
 * O seletor do artboard `TrocarConta`: botão fixo no cabeçalho e, aberto, o diálogo com busca,
 * os três grupos de papel e a confirmação com desfazer.
 *
 * Trocar de usuário é abrir sessão nova no servidor, nunca renomear a atual (ADR 0005) — por
 * isso cada escolha é um POST, e o `router.refresh()` faz o cabeçalho e o menu serem
 * redesenhados com o papel que o servidor passou a reconhecer, não com o que a tela supôs.
 */
export function SeletorDeUsuario({ sessao }: { sessao: UsuarioPublico | null }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [lista, setLista] = useState<Lista>({ nome: 'carregando' })
  const [busca, setBusca] = useState('')
  const [trocando, setTrocando] = useState<string | null>(null)
  const [anterior, setAnterior] = useState<UsuarioPublico | null>(null)
  const [recemTrocado, setRecemTrocado] = useState<UsuarioPublico | null>(null)

  const gatilho = useRef<HTMLButtonElement>(null)
  const campoDeBusca = useRef<HTMLInputElement>(null)

  // Carrega só quando o diálogo abre: o cabeçalho de toda página não precisa da lista inteira.
  useEffect(() => {
    if (!aberto) return
    let vivo = true
    pegarUsuarios().then(
      (usuarios) => {
        if (vivo) setLista({ nome: 'pronta', usuarios })
      },
      () => {
        if (vivo) setLista({ nome: 'erro' })
      },
    )
    return () => {
      vivo = false
    }
  }, [aberto])

  // `Esc` fecha, como o rodapé do diálogo anuncia.
  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') fechar()
    }
    document.addEventListener('keydown', aoTeclar)
    campoDeBusca.current?.focus()
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aberto])

  function abrir() {
    setBusca('')
    setLista({ nome: 'carregando' })
    setAberto(true)
  }

  function fechar() {
    setAberto(false)
    gatilho.current?.focus()
  }

  function recarregar() {
    setLista({ nome: 'carregando' })
    pegarUsuarios().then(
      (usuarios) => setLista({ nome: 'pronta', usuarios }),
      () => setLista({ nome: 'erro' }),
    )
  }

  function trocar(usuario: UsuarioPublico, guardarAnterior = true) {
    setTrocando(usuario.id)
    const deQuemSaio = sessao
    entrarComo(usuario.id).then(
      (novo) => {
        setTrocando(null)
        setAberto(false)
        setAnterior(guardarAnterior ? deQuemSaio : null)
        setRecemTrocado(novo)
        router.refresh()
      },
      () => {
        setTrocando(null)
        setLista({ nome: 'erro' })
      },
    )
  }

  const usuarios = lista.nome === 'pronta' ? filtrarPessoas(lista.usuarios, busca) : []

  return (
    <>
      <button
        ref={gatilho}
        type="button"
        onClick={() => (aberto ? fechar() : abrir())}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className={`inline-flex min-h-[46px] cursor-pointer items-center gap-2.5 rounded-[10px] border bg-cartao py-1.5 pr-3 pl-[7px] text-left hover:bg-neutro-25 ${
          aberto
            ? 'border-neutro-900 ring-3 ring-neutro-900/10'
            : 'border-neutro-300 hover:border-neutro-350'
        }`}
      >
        {sessao ? (
          <Avatar id={sessao.id} nome={sessao.nome} />
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-avatar-cinza-fundo text-[11px] font-[650] text-avatar-cinza-texto"
          >
            —
          </span>
        )}
        <span>
          <span className="block text-[11px] leading-[1.2] text-neutro-600">
            {sessao ? 'Testando como' : 'Nenhuma sessão'}
          </span>
          <span className="text-[13.5px] font-[650] tracking-[-0.015em] text-forte">
            {sessao ? sessao.nome : 'Escolher usuário'}
          </span>
        </span>
        <span className="rounded-[5px] border border-demo-borda bg-demo-fundo px-1.5 py-[3px] text-[10px] font-bold tracking-[0.08em] text-demo-texto">
          DEMO
        </span>
        <IconeChevronBaixo className="shrink-0 text-neutro-300" />
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-neutro-950/42"
            aria-hidden="true"
            onClick={fechar}
          />
          <div className="absolute inset-0 flex items-start justify-center overflow-y-auto px-5 py-14">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="troca-titulo"
              aria-describedby="troca-descricao"
              className="w-[560px] max-w-full overflow-hidden rounded-2xl border border-neutro-200 bg-cartao shadow-[0_24px_48px_-12px_var(--sombra-forte)]"
            >
              <div className="flex items-start justify-between gap-3.5 border-b border-neutro-100 px-[22px] pt-5 pb-4">
                <div>
                  <h2
                    id="troca-titulo"
                    className="m-0 text-[18px] font-[650] tracking-[-0.025em] text-forte"
                  >
                    Trocar de usuário
                  </h2>
                  <p
                    id="troca-descricao"
                    className="mt-[5px] text-[12.5px] leading-[1.5] text-neutro-600"
                  >
                    Troca imediata, sem logout. Serve para percorrer a alçada inteira na avaliação
                    do case.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fechar}
                  aria-label="Fechar"
                  className="inline-flex size-[38px] max-md:size-11 shrink-0 cursor-pointer items-center justify-center rounded-[9px] border border-transparent text-neutro-600 hover:bg-neutro-50 hover:text-forte"
                >
                  <IconeFechar />
                </button>
              </div>

              <div className="border-b border-neutro-100 px-[22px] py-3.5">
                <div className="flex min-h-11 items-center gap-[9px] rounded-[10px] border border-neutro-300 bg-cartao px-3">
                  <IconeBusca className="shrink-0 text-neutro-500" />
                  <input
                    ref={campoDeBusca}
                    type="search"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    aria-label="Buscar pessoa ou papel"
                    placeholder="Buscar pessoa ou papel"
                    className="min-w-0 flex-auto border-none bg-transparent text-[14px] text-forte outline-none placeholder:text-neutro-500"
                  />
                </div>
              </div>

              <div className="max-h-[430px] overflow-y-auto">
                {lista.nome === 'carregando' && <Esqueleto />}

                {lista.nome === 'erro' && (
                  <div className="px-[22px] py-8 text-center">
                    <p className="flex items-center justify-center gap-1.5 text-[13px] text-forte">
                      <IconeErro className="text-marca-700" />
                      Não foi possível carregar as pessoas.
                    </p>
                    <button
                      type="button"
                      onClick={recarregar}
                      className="mt-3 min-h-9 max-md:min-h-11 cursor-pointer rounded-lg border border-neutro-300 bg-cartao px-3 text-[12.5px] font-[650] text-forte hover:bg-neutro-50"
                    >
                      Tentar de novo
                    </button>
                  </div>
                )}

                {lista.nome === 'pronta' && usuarios.length === 0 && (
                  <p className="px-[22px] py-8 text-center text-[13px] text-neutro-600">
                    {busca
                      ? `Ninguém corresponde a “${busca}”.`
                      : 'Nenhum usuário no banco. Rode npm run seed para popular a demonstração.'}
                  </p>
                )}

                {lista.nome === 'pronta' &&
                  usuarios.length > 0 &&
                  GRUPOS.map((grupo) => {
                    const doGrupo = usuarios
                      .filter((u) => grupo.papeis.includes(u.papel))
                      .sort(
                        (a, b) =>
                          ORDEM_DO_PAPEL[a.papel] - ORDEM_DO_PAPEL[b.papel] ||
                          a.nome.localeCompare(b.nome, 'pt-BR'),
                      )
                    if (doGrupo.length === 0) return null
                    return (
                      <div key={grupo.titulo}>
                        <p className="px-[22px] pt-4 pb-2 text-[11px] font-[650] tracking-[0.06em] text-neutro-500 uppercase">
                          {grupo.titulo}
                        </p>
                        {doGrupo.map((usuario) => (
                          <Linha
                            key={usuario.id}
                            usuario={usuario}
                            emUso={usuario.id === sessao?.id}
                            ocupado={trocando !== null}
                            trocandoNesta={trocando === usuario.id}
                            aoEscolher={() => trocar(usuario)}
                          />
                        ))}
                      </div>
                    )
                  })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutro-100 bg-neutro-25 px-[22px] pt-[15px] pb-[18px]">
                <p className="min-w-0 flex-[1_1_280px] text-[12px] leading-[1.5] text-neutro-600">
                  A troca assume a <strong>sessão</strong> da pessoa: obras, permissões e alçada
                  passam a ser as dela. Senha não é pedida — por isso só existe com{' '}
                  <code className="text-[11.5px]">DEMO_MODE</code> ligado.
                </p>
                <span className="text-[12px] text-neutro-600">
                  <span className="rounded-[5px] border border-neutro-200 bg-neutro-100 px-1.5 py-0.5 font-mono text-[11px] text-neutro-600">
                    Esc
                  </span>{' '}
                  fecha
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {recemTrocado && (
        <div className="fixed right-6 bottom-6 z-50 w-[360px] max-w-[calc(100vw-48px)]">
          <div className="flex items-center gap-[11px] rounded-[11px] border border-neutro-200 bg-cartao px-[15px] py-[13px] shadow-[0_8px_16px_-6px_var(--sombra-suave)]">
            <Avatar id={recemTrocado.id} nome={recemTrocado.nome} />
            <div className="min-w-0 flex-auto">
              <div className="text-[13px] font-[650] text-forte">
                Agora você é {recemTrocado.nome}
              </div>
              <div className="mt-0.5 text-[12px] text-neutro-600">
                {DESCRICAO_DO_PAPEL[recemTrocado.papel]}
              </div>
            </div>
            {anterior && (
              <button
                type="button"
                onClick={() => {
                  const volta = anterior
                  setRecemTrocado(null)
                  setAnterior(null)
                  trocar(volta, false)
                }}
                className="min-h-9 max-md:min-h-11 shrink-0 cursor-pointer rounded-lg border border-neutro-300 bg-cartao px-3 text-[12.5px] font-[650] text-forte hover:bg-neutro-50"
              >
                Desfazer
              </button>
            )}
            <button
              type="button"
              onClick={() => setRecemTrocado(null)}
              aria-label="Dispensar aviso"
              className="inline-flex size-7 max-md:size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-neutro-500 hover:bg-neutro-50 hover:text-forte"
            >
              <IconeFechar tamanho={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Linha({
  usuario,
  emUso,
  ocupado,
  trocandoNesta,
  aoEscolher,
}: {
  usuario: UsuarioPublico
  emUso: boolean
  ocupado: boolean
  trocandoNesta: boolean
  aoEscolher: () => void
}) {
  const etiqueta = ETIQUETA_DO_PAPEL[usuario.papel]
  return (
    <button
      type="button"
      onClick={aoEscolher}
      disabled={ocupado || emUso}
      aria-current={emUso ? 'true' : undefined}
      className={`flex min-h-[68px] w-full cursor-pointer items-center gap-[13px] border-t border-neutro-50 px-[22px] py-[13px] text-left first:border-t-0 disabled:cursor-default ${
        emUso ? 'bg-marca-5 shadow-[inset_3px_0_0_var(--color-marca-500)]' : 'bg-cartao hover:bg-neutro-25'
      } ${ocupado && !trocandoNesta ? 'opacity-60' : ''}`}
    >
      <Avatar id={usuario.id} nome={usuario.nome} />
      <span className="min-w-0 flex-auto">
        <span className="block text-[14.5px] font-[650] tracking-[-0.015em] text-forte">
          {usuario.nome}
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-[1.45] text-neutro-600">
          {DESCRICAO_DO_PAPEL[usuario.papel]}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2.5">
        <span
          className={`rounded-full border px-[9px] py-1 text-[11.5px] font-[650] whitespace-nowrap ${
            emUso ? ETIQUETA_EM_USO : etiqueta.tom === 'info' ? ETIQUETA_INFO : ETIQUETA_NEUTRA
          }`}
        >
          {emUso ? 'Em uso' : trocandoNesta ? 'Entrando…' : etiqueta.texto}
        </span>
        {emUso ? (
          <IconeConfirmado className="text-marca-800" />
        ) : (
          <IconeChevronDireita className="shrink-0 text-neutro-300" />
        )}
      </span>
    </button>
  )
}

function Esqueleto() {
  return (
    <div aria-busy="true" aria-label="Carregando pessoas">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex min-h-[68px] items-center gap-[13px] border-t border-neutro-50 px-[22px] py-[13px] first:border-t-0"
        >
          <span className="size-8 shrink-0 animate-pulse rounded-full bg-neutro-100" />
          <span className="flex-auto">
            <span className="block h-3.5 w-40 animate-pulse rounded bg-neutro-100" />
            <span className="mt-2 block h-3 w-56 animate-pulse rounded bg-neutro-50" />
          </span>
        </div>
      ))}
    </div>
  )
}
