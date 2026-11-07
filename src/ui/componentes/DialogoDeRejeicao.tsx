'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { Decisao, Schemas } from '@/src/domain'
import { ROTULO_DE_CAMPO, campo } from './estilos'
import { IconeErro } from './icones'

type Props = {
  pedidoId: number
  totalFormatado: string
  enviando: boolean
  /** O erro que o servidor devolveu na tentativa anterior, já desembrulhado do envelope. */
  erro: { mensagem: string; campos: Readonly<Record<string, string>> } | null
  aoFechar: () => void
  aoConfirmar: (motivo: string) => void
}

/**
 * O diálogo de rejeição: motivo obrigatório, de 3 a 500 caracteres.
 *
 * A validação é a **mesma** do servidor — `Schemas.validarDecisao`, o schema que a rota roda —, e
 * não uma segunda regra escrita aqui. Duas validações para a mesma coisa discordam na primeira
 * mudança, e quem paga é quem escreve um motivo que a tela aceita e a rota recusa. O botão não
 * envia enquanto o schema recusar; o 422 do servidor continua existindo e é tratado, porque a
 * tela não é o controle.
 *
 * Acessibilidade, que aqui é critério e não acabamento:
 *
 * - o foco entra no campo de motivo ao abrir;
 * - `Tab` e `Shift+Tab` circulam **dentro** do diálogo, nunca saem para a página atrás;
 * - `Esc` fecha;
 * - ao fechar, o foco volta ao botão que abriu — e não para o início da página, que obrigaria a
 *   percorrer a tela inteira de volta.
 */
export function DialogoDeRejeicao({
  pedidoId,
  totalFormatado,
  enviando,
  erro,
  aoFechar,
  aoConfirmar,
}: Props) {
  const [motivo, setMotivo] = useState('')
  const [tocado, setTocado] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)
  const campoDeMotivo = useRef<HTMLTextAreaElement>(null)
  const gatilho = useRef<Element | null>(null)
  const idMotivo = useId()
  const idErro = useId()

  // Guarda quem abriu antes de mover o foco, e devolve na saída — inclusive quando o diálogo
  // fecha por `Esc` ou por clique no fundo, que é justamente quando ninguém pensa em devolver.
  useEffect(() => {
    gatilho.current = document.activeElement
    campoDeMotivo.current?.focus()
    return () => {
      if (gatilho.current instanceof HTMLElement) gatilho.current.focus()
    }
  }, [])

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        aoFechar()
        return
      }
      if (evento.key !== 'Tab' || !caixa.current) return

      const focaveis = caixa.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focaveis.length === 0) return

      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      const atual = document.activeElement

      // A armadilha é só a volta nas pontas: no meio da lista o navegador já faz o certo, e
      // interceptar cada Tab quebraria a ordem natural dos campos.
      if (evento.shiftKey && (atual === primeiro || !caixa.current.contains(atual))) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && atual === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  const analise = Schemas.validarDecisao({ tipo: 'rejeitar', motivo })
  const erroDoCampo = analise.ok
    ? (erro?.campos.motivo ?? null)
    : (analise.erro.campos?.motivo ?? analise.erro.mensagem)
  const mostrarErro = (tocado && erroDoCampo !== null) || Boolean(erro?.campos.motivo)

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setTocado(true)
    // A validação barra antes do submit: sem motivo, nada é enviado e o foco volta ao campo.
    if (!analise.ok) {
      campoDeMotivo.current?.focus()
      return
    }
    aoConfirmar(motivo.trim())
  }

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-neutro-950/42 p-4"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar()
      }}
    >
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-rejeicao"
        className="w-full max-w-[480px] rounded-[12px] border border-neutro-200 bg-cartao p-5 shadow-[0_12px_16px_-4px_var(--sombra-suave)]"
      >
        <h2
          id="titulo-rejeicao"
          className="mb-1 text-[15px] font-[650] tracking-[-0.02em] text-forte"
        >
          Rejeitar o pedido #{pedidoId}?
        </h2>
        <p className="mb-4 text-[13px] leading-[1.5] text-neutro-600">
          {totalFormatado} · a rejeição <strong className="text-neutro-700">encerra o pedido
          inteiro</strong>: nenhuma etapa seguinte chega a decidir, e quem criou o pedido precisa
          refazê-lo. O motivo é o que essa pessoa vai ler.
        </p>

        <form onSubmit={enviar} noValidate>
          <label htmlFor={idMotivo} className={`mb-1.5 block ${ROTULO_DE_CAMPO}`}>
            Motivo da rejeição
          </label>
          <textarea
            id={idMotivo}
            ref={campoDeMotivo}
            rows={4}
            value={motivo}
            maxLength={Decisao.MOTIVO_MAXIMO}
            onChange={(evento) => setMotivo(evento.target.value)}
            onBlur={() => setTocado(true)}
            aria-invalid={mostrarErro}
            aria-describedby={mostrarErro ? idErro : undefined}
            placeholder="Preço 18% acima da última cotação da mesma locadora. Refazer com três orçamentos."
            className={`${campo(mostrarErro, 'min-h-11 w-full py-2.5')} resize-y`}
          />

          <div className="mt-1.5 flex flex-wrap items-start justify-between gap-2">
            {mostrarErro ? (
              <p id={idErro} className="flex items-start gap-1.5 text-[12.5px] text-erro-texto">
                <IconeErro className="mt-0.5 shrink-0" />
                {erroDoCampo}
              </p>
            ) : (
              <p className="text-[12.5px] text-neutro-600">
                De {Decisao.MOTIVO_MINIMO} a {Decisao.MOTIVO_MAXIMO} caracteres.
              </p>
            )}
            <span className="text-[12px] text-neutro-500 tabular-nums">
              {motivo.trim().length}/{Decisao.MOTIVO_MAXIMO}
            </span>
          </div>

          {erro && !erro.campos.motivo && (
            <p role="alert" className="mt-3 flex items-start gap-2 text-[13px] text-erro-texto">
              <IconeErro className="mt-0.5 shrink-0" />
              {erro.mensagem}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={aoFechar}
              disabled={enviando}
              className="min-h-11 flex-[1_1_110px] cursor-pointer rounded-lg border border-neutro-300 bg-cartao px-4 text-[14px] font-semibold text-neutro-700 hover:bg-neutro-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="min-h-11 flex-[1_1_150px] cursor-pointer rounded-lg border border-erro-borda-acao bg-cartao px-4 text-[14px] font-semibold text-erro-texto hover:bg-erro-fundo disabled:opacity-60"
            >
              {enviando ? 'Rejeitando…' : 'Confirmar rejeição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
