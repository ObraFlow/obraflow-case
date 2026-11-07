'use client'

import { textoDeDinheiro, totalDoItem, type ItemLocal } from '@/src/ui/formulario-de-pedido'
import { CARTAO } from './estilos'

/**
 * O cartão "Resumo" do artboard `Main`: uma linha por item e o total do pedido.
 *
 * O item inválido aparece **apagado, com travessão**, e fica fora da soma. É deliberado e é
 * critério: somar meia linha mostraria um total que o servidor não confirmaria — e é pelo total
 * que a alçada é decidida. Melhor um número a menos do que um número errado.
 *
 * Nada aqui é editável. O total do pedido é `<input readOnly>` pelo mesmo motivo do total da
 * linha: ele é a soma, não um campo.
 */
export function ResumoDoPedido({ itens }: { itens: readonly ItemLocal[] }) {
  const linhas = itens.map((item, indice) => ({
    chave: item.chave,
    nome: item.descricao.trim() || `Item ${indice + 1}`,
    total: totalDoItem(item),
  }))

  const soma = linhas.reduce((acumulado, linha) => acumulado + (linha.total ?? 0), 0)
  const temInvalido = linhas.some((linha) => linha.total === null)

  return (
    <section className={CARTAO}>
      <div className="border-b border-neutro-100 px-5 py-[18px]">
        <h2 className="text-[15px] font-[650] tracking-[-0.02em] text-forte">Resumo</h2>
      </div>

      <div className="p-5">
        {linhas.map((linha) => (
          <div
            key={linha.chave}
            className={`flex justify-between gap-3 py-2 text-[14px] ${
              linha.total === null ? 'text-neutro-500' : 'text-neutro-600'
            }`}
          >
            <span className="min-w-0 truncate">{linha.nome}</span>
            <strong
              className={`tabular-nums ${
                linha.total === null ? 'font-normal text-neutro-500' : 'text-forte'
              }`}
            >
              {linha.total === null ? '—' : `R$ ${textoDeDinheiro(linha.total)}`}
            </strong>
          </div>
        ))}

        <div className="mt-1.5 flex items-baseline justify-between gap-3 border-t border-neutro-200 pt-3.5">
          <label htmlFor="total-do-pedido" className="text-[13px] text-neutro-600">
            Total do pedido
          </label>
          <input
            id="total-do-pedido"
            readOnly
            value={`R$ ${textoDeDinheiro(soma)}`}
            className="w-auto max-w-[60%] flex-none border-0 bg-transparent p-0 text-right text-[26px] font-[650] tracking-[-0.03em] text-forte tabular-nums"
          />
        </div>

        <p className="mt-2.5 text-[12px] text-neutro-600">
          {temInvalido
            ? 'Soma dos itens válidos. O item com erro ainda não entra no total.'
            : 'Soma dos itens. A faixa da alçada é resolvida pelo total, no envio.'}
        </p>
      </div>
    </section>
  )
}
