'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useRecurso } from '@/src/ui/hooks/useRecurso'
import type { UsuarioPublico } from '@/src/ui/tipos'
import { entrarComo, pegarUsuarios } from '@/src/ui/usuarios'
import { Avatar } from './Avatar'
import { Recurso, Vazio } from './estados'
import { CODIGO } from './estilos'
import { DESCRICAO_DO_PAPEL, ORDEM_DO_PAPEL, ROTULO_DO_PAPEL } from './rotulos'
import { IconeCadeado, IconeChevronDireita, IconeErro } from './icones'

function ordenar(usuarios: UsuarioPublico[]): UsuarioPublico[] {
  return [...usuarios].sort(
    (a, b) =>
      ORDEM_DO_PAPEL[a.papel] - ORDEM_DO_PAPEL[b.papel] || a.nome.localeCompare(b.nome, 'pt-BR'),
  )
}

/**
 * A lista de quem pode entrar, no lugar que o artboard `Login` reserva ao formulário de
 * credencial — que não existe aqui, porque a entrada é sem senha (ADR 0005). A linha é a do
 * artboard `TrocarConta`: avatar, nome, o que o papel faz, e a seta.
 *
 * Os três estados não são escritos aqui: a tela entrega o recurso a `<Recurso>` e desenha
 * apenas a lista pronta. A Sprint 4 tinha a sua cópia dos três, a Sprint 3 tinha a dela, e cada
 * cópia divergia um pouco — a s7f1 é a passada que as recolhe.
 */
export function ListaDeUsuarios() {
  const router = useRouter()
  const [entrando, setEntrando] = useState<string | null>(null)
  const [falhaAoEntrar, setFalhaAoEntrar] = useState<string | null>(null)

  const usuarios = useRecurso<UsuarioPublico[]>(
    useCallback(() => pegarUsuarios().then(ordenar), []),
    'usuarios',
    'Não foi possível carregar os usuários.',
  )

  function entrar(usuario: UsuarioPublico) {
    setEntrando(usuario.id)
    setFalhaAoEntrar(null)
    entrarComo(usuario.id).then(
      () => {
        router.replace('/pedidos')
        router.refresh()
      },
      () => {
        setFalhaAoEntrar(`Não foi possível entrar como ${usuario.nome}.`)
        setEntrando(null)
      },
    )
  }

  return (
    <>
      {/* Falha ao entrar não é falha de leitura: não há o que recarregar, e o caminho de volta
          é clicar na pessoa de novo. Por isso o aviso, e não a caixa de erro com repetição. */}
      {falhaAoEntrar && (
        <div
          role="alert"
          className="mb-2 rounded-[11px] border border-erro-borda-forte bg-erro-papel px-4 py-[13px]"
        >
          <p className="flex items-center gap-1.5 text-[12.5px] leading-[1.5] text-erro-texto">
            <IconeErro className="shrink-0" />
            {falhaAoEntrar} Escolha a pessoa de novo.
          </p>
        </div>
      )}

      <Recurso
        recurso={usuarios}
        rotulo="Carregando os usuários"
        tituloDoErro="Não foi possível carregar os usuários"
        linhas={5}
        vazio={
          <Vazio titulo="Nenhum usuário no banco" icone={<IconeCadeado />}>
            Sem usuário não há como entrar na demonstração. Rode{' '}
            <code className={CODIGO}>npm run seed</code> para popular o banco com as cinco
            pessoas do seed.
          </Vazio>
        }
      >
        {(lista) => (
          <ul className="flex flex-col gap-2">
            {lista.map((usuario) => (
              <li key={usuario.id}>
                <button
                  type="button"
                  onClick={() => entrar(usuario)}
                  disabled={entrando !== null}
                  className="flex min-h-[68px] w-full cursor-pointer items-center gap-[13px] rounded-[11px] border border-neutro-200 bg-cartao px-4 py-[13px] text-left hover:border-neutro-350 hover:bg-neutro-25 disabled:opacity-60"
                >
                  <Avatar id={usuario.id} nome={usuario.nome} />
                  <span className="min-w-0 flex-auto">
                    <span className="block text-[14.5px] font-[650] tracking-[-0.015em] text-forte">
                      {usuario.nome}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-[1.45] text-neutro-600">
                      {ROTULO_DO_PAPEL[usuario.papel]} · {DESCRICAO_DO_PAPEL[usuario.papel]}
                    </span>
                  </span>
                  {entrando === usuario.id ? (
                    <span className="shrink-0 text-[12.5px] font-[650] text-marca-700">
                      Entrando…
                    </span>
                  ) : (
                    <IconeChevronDireita className="shrink-0 text-neutro-300" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Recurso>
    </>
  )
}
