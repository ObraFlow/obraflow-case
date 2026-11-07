/**
 * A cadeia de aprovação desenhada.
 *
 * Duas formas da mesma coisa, porque os artboards desenham duas: a **trilha** de pastilhas que a
 * linha da lista mostra (artboard `Aprovacoes`, `.pills`) e o **trilho vertical** do detalhe
 * (artboards `Aprovacoes` e `PedidoDetalhe`, `.hist`). As duas leem a mesma lista de etapas, que
 * vem do servidor já na ordem gravada.
 *
 * Nada aqui decide alçada. O componente não sabe o que é faixa, não recebe a alçada da obra e
 * não calcula de quem é a vez: `etapaAtual` chega pronta do back-end, lida das `Etapa` gravadas
 * (ADR 0001). O que este arquivo faz é escolher a cor e a palavra de cada etapa.
 */

import type { EtapaPublica } from '@/src/ui/tipos'
import { dataComHora } from './rotulos'

/**
 * O estado visual de uma etapa — e por que ele não é a situação dela.
 *
 * Uma etapa `pendente` tem três leituras possíveis: é a da vez, ainda não chegou, ou nunca vai
 * chegar porque uma anterior rejeitou. A situação gravada não distingue as três, e é justamente
 * essa distinção que o critério "nenhum botão desabilitado em silêncio" cobra.
 */
type Fase = 'aprovada' | 'rejeitada' | 'agora' | 'futura' | 'interrompida'

export function faseDaEtapa(
  etapa: EtapaPublica,
  cadeia: readonly EtapaPublica[],
  etapaAtual: EtapaPublica | null,
): Fase {
  if (etapa.situacao === 'aprovada') return 'aprovada'
  if (etapa.situacao === 'rejeitada') return 'rejeitada'
  if (etapaAtual && etapaAtual.ordem === etapa.ordem) return 'agora'
  // Rejeição encerra o pedido inteiro: as etapas seguintes não ficam "esperando", elas deixam
  // de existir como decisão possível. Dizer isso na tela é o que impede alguém de esperar uma
  // vez que nunca vai chegar.
  return cadeia.some((outra) => outra.situacao === 'rejeitada') ? 'interrompida' : 'futura'
}

const PASTILHA_DA_FASE: Readonly<Record<Fase, string>> = {
  aprovada: 'border-sucesso-borda bg-sucesso-fundo text-sucesso-texto',
  rejeitada: 'border-erro-borda-forte bg-erro-fundo text-erro-texto',
  agora: 'border-marca-100 bg-marca-15 font-[650] text-marca-800',
  futura: 'border-neutro-200 bg-neutro-25 text-neutro-600',
  interrompida: 'border-neutro-200 bg-neutro-25 text-neutro-500',
}

function textoDaFase(fase: Fase, etapa: EtapaPublica): string {
  const posicao = `${etapa.ordem + 1} · ${etapa.nome}`
  switch (fase) {
    case 'aprovada':
      return `${posicao} ✓`
    case 'rejeitada':
      return `${posicao} ✕ rejeitou`
    case 'agora':
      return `${posicao} — decide agora`
    case 'interrompida':
      return `${posicao} — não chegou a decidir`
    case 'futura':
      return posicao
  }
}

/**
 * A trilha da linha da lista: uma pastilha por etapa, separadas por seta.
 *
 * Quebra de linha em vez de rolagem horizontal — numa tela de 390 px a trilha de três
 * aprovadores vira três linhas empilhadas, e continua legível sem gesto nenhum.
 */
export function TrilhaDaCadeia({
  cadeia,
  etapaAtual,
}: {
  cadeia: readonly EtapaPublica[]
  etapaAtual: EtapaPublica | null
}) {
  if (cadeia.length === 0) {
    return (
      <p className="text-[12px] text-neutro-500">
        Sem cadeia: a alçada só é resolvida no envio do pedido.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
      {cadeia.map((etapa, indice) => {
        const fase = faseDaEtapa(etapa, cadeia, etapaAtual)
        return (
          <span key={etapa.ordem} className="flex items-center gap-1.5">
            {indice > 0 && (
              <span className="text-neutro-300" aria-hidden="true">
                →
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${PASTILHA_DA_FASE[fase]}`}
            >
              {textoDaFase(fase, etapa)}
            </span>
          </span>
        )
      })}
    </div>
  )
}

const CONTA_DA_FASE: Readonly<Record<Fase, string>> = {
  aprovada: 'border-sucesso-borda-forte bg-sucesso-fundo text-sucesso-texto',
  rejeitada: 'border-erro-borda-forte bg-erro-fundo text-erro-texto',
  agora: 'border-marca-500 bg-marca-15 text-marca-800',
  futura: 'border-neutro-300 bg-cartao text-neutro-600',
  interrompida: 'border-neutro-300 bg-cartao text-neutro-500',
}

/**
 * O trilho vertical do detalhe: uma conta por etapa, ligadas por uma linha.
 *
 * Empilha por construção — é uma coluna, não uma linha que quebra —, e é o que mantém a cadeia
 * legível em 390 px sem rolagem lateral. O motivo da rejeição aparece aqui, em citação, porque é
 * o texto que quem recebeu o pedido de volta precisa ler.
 */
export function CadeiaVertical({
  cadeia,
  etapaAtual,
  sessaoId,
}: {
  cadeia: readonly EtapaPublica[]
  etapaAtual: EtapaPublica | null
  sessaoId: string | null
}) {
  if (cadeia.length === 0) {
    return (
      <p className="text-[13px] leading-[1.55] text-neutro-600">
        Este pedido ainda é um rascunho: a faixa é resolvida e a cadeia é gravada no envio, e não
        antes (ADR 0001).
      </p>
    )
  }

  return (
    <ol className="flex flex-col">
      {cadeia.map((etapa, indice) => {
        const fase = faseDaEtapa(etapa, cadeia, etapaAtual)
        const ultima = indice === cadeia.length - 1
        return (
          <li key={etapa.ordem} className="flex gap-3">
            <div className="flex w-[26px] shrink-0 flex-col items-center">
              <span
                aria-hidden="true"
                className={`flex size-[26px] items-center justify-center rounded-full border-[1.5px] text-[12px] font-[650] ${CONTA_DA_FASE[fase]}`}
              >
                {fase === 'aprovada' ? '✓' : fase === 'rejeitada' ? '✕' : etapa.ordem + 1}
              </span>
              {!ultima && <span className="min-h-4 w-px flex-auto bg-neutro-200" />}
            </div>

            <div className={ultima ? '' : 'pb-[18px]'}>
              <p
                className={`text-[14px] font-semibold ${
                  fase === 'futura' || fase === 'interrompida' ? 'text-neutro-600' : 'text-forte'
                }`}
              >
                {etapa.nome}
                {etapa.usuarioId === sessaoId && (
                  <span className="ml-1.5 text-[12px] font-medium text-marca-800">— você</span>
                )}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-[1.5] text-neutro-600">
                {legendaDaEtapa(fase, etapa, cadeia)}
              </p>
              {etapa.motivo && (
                <p className="mt-1.5 rounded-r-md border-l-2 border-neutro-200 bg-neutro-25 px-2.5 py-2 text-[13px] text-neutro-700">
                  “{etapa.motivo}”
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function legendaDaEtapa(
  fase: Fase,
  etapa: EtapaPublica,
  cadeia: readonly EtapaPublica[],
): string {
  const posicao = `Ordem ${etapa.ordem + 1} de ${cadeia.length} na cadeia`
  switch (fase) {
    case 'aprovada':
      return `Aprovou em ${dataComHora(etapa.decididoEm)} · ${posicao}`
    case 'rejeitada':
      return `Rejeitou em ${dataComHora(etapa.decididoEm)} · ${posicao} · fluxo encerrado`
    case 'agora':
      return `Aguardando decisão · ${posicao}`
    case 'interrompida':
      return `Não chegou a decidir: o pedido foi rejeitado antes · ${posicao}`
    case 'futura':
      return `Só decide depois da aprovação da ordem ${etapa.ordem} · ${posicao}`
  }
}
