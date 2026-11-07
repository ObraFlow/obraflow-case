'use client'

import { useEffect, useRef } from 'react'

import { IconeErro } from './icones'

type Props = {
  titulo: string
  /** Pedidos pendentes sob a faixa. É o número que a frase precisa dizer, mesmo quando é zero. */
  pedidosEmAndamento: number
  removendo: boolean
  erro: string | null
  aoCancelar: () => void
  aoConfirmar: () => void
}

/**
 * Confirmação de remoção, no molde do diálogo de rejeição do artboard `Estados`.
 *
 * Apagar faixa em uso é permitido — é decisão registrada na revisão da SPEC —, e o preço de
 * permitir é dizer o efeito antes de cobrá-lo. A frase conta quantos pedidos em andamento estão
 * sob a faixa e afirma o que acontece com eles: nada. A cadeia foi gravada na submissão e é
 * histórico do pedido, não uma visão da regra atual (ADR 0001).
 *
 * Fechar pelo `Cancelar`, pelo fundo ou pelo Esc não chama a API.
 */
export function DialogoDeRemocao({
  titulo,
  pedidosEmAndamento,
  removendo,
  erro,
  aoCancelar,
  aoConfirmar,
}: Props) {
  const confirmar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmar.current?.focus()
  }, [])

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') aoCancelar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoCancelar])

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-neutro-950/42 p-4"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoCancelar()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-remocao"
        className="w-full max-w-[460px] rounded-[12px] border border-neutro-200 bg-cartao p-5 shadow-[0_12px_16px_-4px_var(--sombra-suave)]"
      >
        <h2
          id="titulo-remocao"
          className="mb-1 text-[15px] font-[650] tracking-[-0.02em] text-forte"
        >
          Remover a faixa {titulo}?
        </h2>

        <p className="mb-4 text-[13px] leading-[1.5] text-neutro-600">
          {pedidosEmAndamento === 0
            ? 'Nenhum pedido em andamento usa esta faixa. '
            : `${pedidosEmAndamento} ${
                pedidosEmAndamento === 1 ? 'pedido em andamento usa' : 'pedidos em andamento usam'
              } esta faixa. `}
          {pedidosEmAndamento === 0
            ? 'Novos pedidos desta obra passam a ser cobertos pela faixa seguinte, ou nenhuma.'
            : `${
                pedidosEmAndamento === 1 ? 'Ele segue' : 'Eles seguem'
              } com a cadeia de aprovação gravada na submissão: quem assina e em que ordem não muda. O que muda é a regra daqui para a frente.`}
        </p>

        {erro && (
          <p role="alert" className="mb-4 flex items-start gap-2 text-[13px] text-erro-texto">
            <IconeErro className="mt-0.5 shrink-0" />
            {erro}
          </p>
        )}

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={aoCancelar}
            disabled={removendo}
            className="min-h-11 flex-[1_1_110px] cursor-pointer rounded-lg border border-neutro-300 bg-cartao px-4 text-[14px] font-semibold text-neutro-700 hover:bg-neutro-50"
          >
            Cancelar
          </button>
          <button
            ref={confirmar}
            type="button"
            onClick={aoConfirmar}
            disabled={removendo}
            className="min-h-11 flex-[1_1_150px] cursor-pointer rounded-lg border border-erro-borda-acao bg-cartao px-4 text-[14px] font-semibold text-erro-texto hover:bg-erro-fundo disabled:opacity-60"
          >
            {removendo ? 'Removendo…' : 'Confirmar remoção'}
          </button>
        </div>
      </div>
    </div>
  )
}
