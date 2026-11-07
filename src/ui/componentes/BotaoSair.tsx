'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { sair } from '@/src/ui/usuarios'

/**
 * Encerra a sessão pela rota, não no cliente: o cookie é httpOnly e o navegador não consegue
 * apagá-lo sozinho — que é exatamente a propriedade que se quer (ADR 0005).
 *
 * O artboard `TrocarConta` não desenha este botão; ele é divergência deliberada declarada na
 * SPEC. O estilo é emprestado do `Desfazer` do próprio artboard, para não inventar um controle
 * com linguagem visual nova.
 */
export function BotaoSair() {
  const router = useRouter()
  const [saindo, setSaindo] = useState(false)

  function encerrar() {
    setSaindo(true)
    sair().then(
      () => {
        router.replace('/entrar')
        router.refresh()
      },
      () => setSaindo(false),
    )
  }

  return (
    <button
      type="button"
      onClick={encerrar}
      disabled={saindo}
      className="min-h-9 max-md:min-h-11 shrink-0 cursor-pointer rounded-lg border border-neutro-300 bg-cartao px-3 text-[12.5px] font-[650] text-forte hover:bg-neutro-50 disabled:opacity-60"
    >
      {saindo ? 'Saindo…' : 'Sair'}
    </button>
  )
}
