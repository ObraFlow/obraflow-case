/**
 * Tela 10 — Painel da administração (artboard `Dashboard`).
 *
 * Rota própria, e não uma seção no topo de `/alcadas`: a tela de alçada responde ao artboard
 * `Alcadas`, que não desenha gráfico nenhum, e ela já foi aprovada com critério de fidelidade a
 * esse desenho. O painel é **outra** tela do mesmo canvas, e tem endereço próprio.
 *
 * Como em `/alcadas`, a decisão de papel aqui não é o controle de acesso: o controle é o 403 de
 * `GET /api/pedidos/painel` e de `GET /api/pedidos/resumo`, que vale para quem chamar as rotas
 * sem passar por esta página.
 */

import { Suspense } from 'react'

import { pode } from '@/src/server/permissao'
import { AcessoNegado } from '@/src/ui/componentes/AcessoNegado'
import { PainelDoAdmin } from '@/src/ui/componentes/PainelDoAdmin'
import { sessaoAtual } from '@/src/ui/sessao-no-servidor'

// Página por sessão: o conteúdo depende do cookie e não há casca estática a validar.
export const instant = false

export const metadata = { title: 'Painel da empresa · ObraFlow' }

export default async function Administracao() {
  const sessao = await sessaoAtual()

  if (!pode(sessao?.papel, 'ver_resumo')) {
    return <AcessoNegado papel={sessao?.papel ?? null} acao="ver_resumo" />
  }

  return (
    <Suspense>
      <PainelDoAdmin />
    </Suspense>
  )
}
