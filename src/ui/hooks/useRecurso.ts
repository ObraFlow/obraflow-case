'use client'

import { useEffect, useState } from 'react'

/**
 * Um recurso lido da API, com os três estados que a SPEC exige de toda lista.
 *
 * `carregando`, `vazio` e `erro com repetição` nascem com a tela e não são passada posterior: uma
 * lista que pisca vazio antes de carregar ensina quem lê a desconfiar do que vê. O hook existe
 * para que esses três estados sejam escritos uma vez só — cada lista que os reescreve acaba
 * esquecendo um.
 *
 * `chave` é o que identifica o que está sendo buscado: trocar a obra troca a chave, e a busca
 * recomeça do esqueleto. Chave `null` é "não há o que buscar ainda" — fica carregando sem
 * disparar nada, que é o estado da tela enquanto a lista de obras não chegou.
 */
export type Recurso<T> = {
  readonly dados: T | null
  readonly carregando: boolean
  readonly erro: string | null
  readonly recarregar: () => void
}

type Estado<T> = { readonly chave: string | null } & (
  | { nome: 'carregando' }
  | { nome: 'erro'; mensagem: string }
  | { nome: 'pronto'; dados: T }
)

export function useRecurso<T>(
  buscar: () => Promise<T>,
  chave: string | null,
  mensagemDeErro: string,
): Recurso<T> {
  const [estado, setEstado] = useState<Estado<T>>({ nome: 'carregando', chave })
  const [tentativa, setTentativa] = useState(0)

  // Ajuste durante a renderização, e não dentro de um efeito: quando a chave muda, o que está em
  // memória é resposta de *outra* pergunta. Mostrá-la por um quadro até o efeito corrigir é
  // exibir a faixa da obra anterior sob o nome da obra nova — e é o que o efeito faria.
  if (estado.chave !== chave) setEstado({ nome: 'carregando', chave })

  useEffect(() => {
    if (chave === null) return

    let vivo = true
    buscar().then(
      (dados) => {
        if (vivo) setEstado({ nome: 'pronto', chave, dados })
      },
      (falha: unknown) => {
        if (vivo) {
          setEstado({
            nome: 'erro',
            chave,
            mensagem: falha instanceof Error ? falha.message : mensagemDeErro,
          })
        }
      },
    )
    return () => {
      vivo = false
    }
    // `buscar` é recriada a cada renderização por quem chama; o que de fato muda o que se busca é
    // a chave. `tentativa` é o que o botão de repetir incrementa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, tentativa])

  const atual: Estado<T> = estado.chave === chave ? estado : { nome: 'carregando', chave }

  return {
    dados: atual.nome === 'pronto' ? atual.dados : null,
    carregando: atual.nome === 'carregando',
    erro: atual.nome === 'erro' ? atual.mensagem : null,
    // Repetir é evento, não efeito: o esqueleto volta antes da nova tentativa.
    recarregar: () => {
      setEstado({ nome: 'carregando', chave })
      setTentativa((n) => n + 1)
    },
  }
}
