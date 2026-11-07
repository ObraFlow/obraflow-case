'use client'

import { Schemas, type CamposComErro } from '@/src/domain'
import {
  campoDoItem,
  textoDeDinheiro,
  totalDoItem,
  type ItemLocal,
} from '@/src/ui/formulario-de-pedido'
import { IconeErro, IconeRemover } from './icones'
import { ALVO_DE_TOQUE, CAMPO, campo } from './estilos'

/**
 * O editor de itens do artboard `Main`: uma tabela com descrição, quantidade, unidade, preço
 * unitário, total e remover.
 *
 * Duas regras moram aqui, e as duas são critério:
 *
 * - **o total da linha não é campo**. Ele é `<input readOnly>` porque o artboard o desenha na
 *   coluna de um campo, mas nada nele é editável: quantidade × preço unitário é conta do
 *   domínio, e um total digitável seria uma segunda fonte para o mesmo número;
 * - **o erro acende no item**. A chave vem de `error.fields` — `itens.2.quantidade` —, que é o
 *   formato em que o servidor recusa e em que o mesmo schema recusa aqui. A mensagem fica na
 *   célula do campo errado, nunca no topo da tela.
 *
 * Abaixo de 768px a tabela dá lugar a um cartão por item: seis colunas de campo não cabem em
 * 390px sem rolagem horizontal, e rolar na horizontal para digitar o preço é pior do que
 * empilhar. As duas formas mostram os mesmos campos e escrevem no mesmo estado — a troca é por
 * `md:`, para que a primeira pintura já esteja certa.
 */

/** Os rótulos de unidade: o domínio guarda `m2`, a tela mostra m². */
const ROTULO_DA_UNIDADE: Readonly<Record<string, string>> = {
  un: 'un',
  kg: 'kg',
  m: 'm',
  m2: 'm²',
  m3: 'm³',
  sc: 'sc',
  L: 'L',
  h: 'h',
}

type Props = {
  itens: readonly ItemLocal[]
  problemas: CamposComErro
  aoMudar: (indice: number, campo: keyof ItemLocal, valor: string) => void
  aoRemover: (indice: number) => void
  aoAdicionar: () => void
}

export function ItensDoPedido({ itens, problemas, aoMudar, aoRemover, aoAdicionar }: Props) {
  const noLimite = itens.length >= Schemas.MAX_ITENS

  return (
    <section className="rounded-[12px] border border-neutro-200 bg-cartao shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutro-100 px-5 py-[18px]">
        <div>
          <h2 className="text-[15px] font-[650] tracking-[-0.02em] text-forte">Itens do pedido</h2>
          <p className="mt-1 text-[12px] text-neutro-600">
            {itens.length} {itens.length === 1 ? 'item' : 'itens'} · o total do item é calculado
            (quantidade × preço unitário).
          </p>
        </div>
        <BotaoAdicionar aoAdicionar={aoAdicionar} noLimite={noLimite} />
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr>
              <Cabecalho largura="38%">
                Descrição <Obrigatorio />
              </Cabecalho>
              <Cabecalho largura="12%" numerica>
                Qtd. <Obrigatorio />
              </Cabecalho>
              <Cabecalho largura="12%">
                Unidade <Obrigatorio />
              </Cabecalho>
              <Cabecalho largura="16%" numerica>
                Preço unit. <Obrigatorio />
              </Cabecalho>
              <Cabecalho largura="16%" numerica>
                Total
              </Cabecalho>
              <Cabecalho largura="6%">
                <span className="sr-only">Ações</span>
              </Cabecalho>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, indice) => (
              <Linha
                key={item.chave}
                item={item}
                indice={indice}
                problemas={problemas}
                podeRemover={itens.length > 1}
                aoMudar={aoMudar}
                aoRemover={aoRemover}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden">
        {itens.map((item, indice) => (
          <Cartao
            key={item.chave}
            item={item}
            indice={indice}
            problemas={problemas}
            podeRemover={itens.length > 1}
            aoMudar={aoMudar}
            aoRemover={aoRemover}
          />
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutro-100 p-5">
        <p className="m-0 text-[12px] text-neutro-600">
          {noLimite
            ? `O pedido aceita no máximo ${Schemas.MAX_ITENS} itens.`
            : 'O pedido precisa de pelo menos um item válido para ser enviado.'}
        </p>
        <BotaoAdicionar aoAdicionar={aoAdicionar} noLimite={noLimite} />
      </div>
    </section>
  )
}

function BotaoAdicionar({
  aoAdicionar,
  noLimite,
}: {
  aoAdicionar: () => void
  noLimite: boolean
}) {
  return (
    <button
      type="button"
      onClick={aoAdicionar}
      disabled={noLimite}
      title={noLimite ? `Máximo de ${Schemas.MAX_ITENS} itens por pedido.` : undefined}
      className={`min-h-9 ${ALVO_DE_TOQUE} cursor-pointer rounded-lg border border-dashed border-neutro-300 bg-cartao px-3 text-[13px] font-medium text-neutro-600 hover:bg-neutro-50 disabled:cursor-not-allowed disabled:text-neutro-350 disabled:hover:bg-cartao`}
    >
      + Adicionar item
    </button>
  )
}

function Linha({
  item,
  indice,
  problemas,
  podeRemover,
  aoMudar,
  aoRemover,
}: {
  item: ItemLocal
  indice: number
  problemas: CamposComErro
  podeRemover: boolean
  aoMudar: Props['aoMudar']
  aoRemover: Props['aoRemover']
}) {
  const total = totalDoItem(item)
  const numero = indice + 1

  return (
    <tr>
      <Celula>
        <Campo
          rotulo={`Descrição do item ${numero}`}
          chave={campoDoItem(indice, 'descricao')}
          variante="tabela"
          problemas={problemas}
          valor={item.descricao}
          aoMudar={(valor) => aoMudar(indice, 'descricao', valor)}
          placeholder="Cimento CP-II 50 kg"
          maxLength={Schemas.MAX_DESCRICAO}
        />
      </Celula>

      <Celula>
        <Campo
          rotulo={`Quantidade do item ${numero}`}
          chave={campoDoItem(indice, 'quantidade')}
          variante="tabela"
          problemas={problemas}
          valor={item.quantidade}
          aoMudar={(valor) => aoMudar(indice, 'quantidade', valor)}
          numerica
          modo="decimal"
          placeholder="0"
        />
      </Celula>

      <Celula>
        <select
          aria-label={`Unidade do item ${numero}`}
          value={item.unidade}
          onChange={(evento) => aoMudar(indice, 'unidade', evento.target.value)}
          className={CAMPO}
        >
          {Schemas.UNIDADES.map((unidade) => (
            <option key={unidade} value={unidade}>
              {ROTULO_DA_UNIDADE[unidade] ?? unidade}
            </option>
          ))}
        </select>
      </Celula>

      <Celula>
        <Campo
          rotulo={`Preço unitário do item ${numero}`}
          chave={campoDoItem(indice, 'precoUnitario')}
          variante="tabela"
          problemas={problemas}
          valor={item.precoUnitario}
          aoMudar={(valor) => aoMudar(indice, 'precoUnitario', valor)}
          numerica
          modo="decimal"
          placeholder="0,00"
        />
      </Celula>

      <Celula>
        {/* Campo de leitura, nunca editável: o total da linha é conta do domínio. */}
        <input
          readOnly
          aria-label={`Total do item ${numero}`}
          value={total === null ? '—' : `R$ ${textoDeDinheiro(total)}`}
          className={`w-full min-w-0 border-0 bg-transparent px-0 py-[11px] text-right text-[14px] tabular-nums ${
            total === null ? 'text-neutro-500' : 'font-semibold text-forte'
          }`}
        />
      </Celula>

      <Celula>
        <button
          type="button"
          aria-label={`Remover item ${numero}`}
          title={podeRemover ? `Remover item ${numero}` : 'O pedido precisa de ao menos um item.'}
          disabled={!podeRemover}
          onClick={() => aoRemover(indice)}
          className="mt-1 flex size-9 cursor-pointer items-center justify-center rounded-lg border border-transparent bg-transparent text-neutro-600 hover:border-erro-borda hover:bg-erro-fundo hover:text-erro-texto disabled:cursor-not-allowed disabled:text-neutro-300 disabled:hover:border-transparent disabled:hover:bg-transparent"
        >
          <IconeRemover />
        </button>
      </Celula>
    </tr>
  )
}

/**
 * O mesmo item da linha da tabela, empilhado — a forma de 390px.
 *
 * Descrição ocupa a largura inteira porque é o campo que estoura primeiro; quantidade, unidade e
 * preço dividem a linha de baixo, e o total fecha o cartão ao lado do botão de remover, que é
 * onde ele já está na tabela.
 */
function Cartao({
  item,
  indice,
  problemas,
  podeRemover,
  aoMudar,
  aoRemover,
}: {
  item: ItemLocal
  indice: number
  problemas: CamposComErro
  podeRemover: boolean
  aoMudar: Props['aoMudar']
  aoRemover: Props['aoRemover']
}) {
  const total = totalDoItem(item)
  const numero = indice + 1

  return (
    <li className="flex flex-col gap-3 border-b border-neutro-100 p-5 last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-[650] tracking-[0.04em] text-neutro-600 uppercase">
          Item {numero}
        </span>
        <button
          type="button"
          aria-label={`Remover item ${numero}`}
          title={podeRemover ? `Remover item ${numero}` : 'O pedido precisa de ao menos um item.'}
          disabled={!podeRemover}
          onClick={() => aoRemover(indice)}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-neutro-200 bg-cartao text-neutro-600 hover:border-erro-borda hover:bg-erro-fundo hover:text-erro-texto disabled:cursor-not-allowed disabled:text-neutro-300 disabled:hover:border-neutro-200 disabled:hover:bg-cartao"
        >
          <IconeRemover />
        </button>
      </div>

      <Campo
        rotulo={`Descrição do item ${numero}`}
        chave={campoDoItem(indice, 'descricao')}
        variante="cartao"
        problemas={problemas}
        valor={item.descricao}
        aoMudar={(valor) => aoMudar(indice, 'descricao', valor)}
        placeholder="Cimento CP-II 50 kg"
        maxLength={Schemas.MAX_DESCRICAO}
      />

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Campo
          rotulo={`Quantidade do item ${numero}`}
          chave={campoDoItem(indice, 'quantidade')}
          variante="cartao"
          problemas={problemas}
          valor={item.quantidade}
          aoMudar={(valor) => aoMudar(indice, 'quantidade', valor)}
          numerica
          modo="decimal"
          placeholder="0"
        />
        <select
          aria-label={`Unidade do item ${numero}`}
          value={item.unidade}
          onChange={(evento) => aoMudar(indice, 'unidade', evento.target.value)}
          className={`${campo(false, 'min-h-11 w-auto py-[11px]')} self-start`}
        >
          {Schemas.UNIDADES.map((unidade) => (
            <option key={unidade} value={unidade}>
              {ROTULO_DA_UNIDADE[unidade] ?? unidade}
            </option>
          ))}
        </select>
      </div>

      <Campo
        rotulo={`Preço unitário do item ${numero}`}
        chave={campoDoItem(indice, 'precoUnitario')}
        variante="cartao"
        problemas={problemas}
        valor={item.precoUnitario}
        aoMudar={(valor) => aoMudar(indice, 'precoUnitario', valor)}
        numerica
        modo="decimal"
        placeholder="0,00"
      />

      <p className="flex items-baseline justify-between gap-3 border-t border-neutro-50 pt-3">
        <span className="text-[12.5px] text-neutro-600">Total do item</span>
        <span
          className={`text-[15px] tabular-nums ${
            total === null ? 'text-neutro-500' : 'font-[650] text-forte'
          }`}
        >
          {total === null ? '—' : `R$ ${textoDeDinheiro(total)}`}
        </span>
      </p>
    </li>
  )
}

function Campo({
  rotulo,
  chave,
  variante,
  problemas,
  valor,
  aoMudar,
  numerica,
  modo,
  placeholder,
  maxLength,
}: {
  rotulo: string
  chave: string
  /** Tabela e cartão desenham o mesmo campo; o sufixo é o que impede dois ids iguais no DOM. */
  variante: 'tabela' | 'cartao'
  problemas: CamposComErro
  valor: string
  aoMudar: (valor: string) => void
  numerica?: boolean
  modo?: 'decimal'
  placeholder?: string
  maxLength?: number
}) {
  const problema = problemas[chave]
  const idDoErro = `erro-${variante}-${chave.replace(/\./g, '-')}`

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <input
        aria-label={rotulo}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        inputMode={modo}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={problema ? true : undefined}
        aria-describedby={problema ? idDoErro : undefined}
        className={`${campo(Boolean(problema))} ${numerica ? 'text-right tabular-nums' : ''}`}
      />
      {problema && (
        <span id={idDoErro} className="flex items-center gap-1.5 text-[12px] text-erro-texto">
          <IconeErro className="shrink-0" />
          {problema}
        </span>
      )}
    </div>
  )
}

function Cabecalho({
  largura,
  numerica,
  children,
}: {
  largura: string
  numerica?: boolean
  children: React.ReactNode
}) {
  return (
    <th
      scope="col"
      style={{ width: largura }}
      className={`border-b border-neutro-200 bg-neutro-25 px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap text-neutro-600 ${
        numerica ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

function Celula({ children }: { children: React.ReactNode }) {
  return <td className="border-b border-neutro-100 p-3 align-top text-[14px]">{children}</td>
}

function Obrigatorio() {
  return (
    <span className="text-marca-700" aria-hidden="true">
      *
    </span>
  )
}
