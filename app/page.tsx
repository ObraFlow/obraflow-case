import { redirect } from 'next/navigation'

import { sessaoAtual } from '@/src/ui/sessao-no-servidor'

// Página por sessão: o conteúdo depende do cookie e não há casca estática a validar.
export const instant = false

/** A raiz não tem conteúdo próprio: leva a quem está dentro para os pedidos, e os demais à entrada. */
export default async function Home() {
  const sessao = await sessaoAtual()
  redirect(sessao ? '/pedidos' : '/entrar')
}
