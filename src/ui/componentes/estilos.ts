/**
 * As classes que mais de uma tela repete.
 *
 * Existem como constante, e não como componente, porque são só o valor dos tokens do artboard
 * escrito uma vez — `.input`, `.err .input` e `label` do CSS dos mockups. Um componente de campo
 * esconderia os atributos de acessibilidade de quem o usa; uma string de classe não esconde nada.
 */

/*
 * Regra destas constantes: **nenhum elemento carrega duas utilidades da mesma propriedade no mesmo
 * estado**. No Tailwind v4, entre `text-cartao` e `text-neutro-700` não ganha a que vem depois no
 * `className`, e sim a que vem depois no CSS gerado — uma ordem que ninguém controla daqui. Foi o
 * que deixou o texto de "Cadastrar pedido" cinza sobre preto. Por isso cada variante abaixo é
 * **completa**: forma, tamanho e cor numa constante só, e a tela escolhe uma, nunca empilha duas.
 */

const CAMPO_FORMA = 'min-w-0 rounded-lg border px-3 text-[14px]'
/** Altura, largura e respiro do campo de uma linha. Quem precisa de outro passa o seu a `campo`. */
export const CAMPO_TAMANHO = 'min-h-11 w-full py-[11px]'

/**
 * A classe inteira de um campo: forma, tamanho e cor, com a cor de erro **no lugar** da neutra.
 * `tamanho` existe para o `textarea` e o `select` estreito, que mudam altura ou largura.
 */
export function campo(erro = false, tamanho = CAMPO_TAMANHO): string {
  const cor = erro ? 'border-erro-texto bg-erro-papel text-forte' : 'border-neutro-300 bg-cartao text-forte'
  return `${CAMPO_FORMA} ${tamanho} ${cor}`
}

export const CAMPO = campo()
/** O campo que mostra um valor derivado — o valor mínimo da faixa —, sem aceitar digitação. */
export const CAMPO_DE_LEITURA = `${CAMPO_FORMA} ${CAMPO_TAMANHO} border-neutro-300 bg-neutro-50 text-neutro-600`
export const ROTULO_DE_CAMPO = 'text-[13px] font-semibold text-neutro-700'
export const CARTAO = 'rounded-[12px] border border-neutro-200 bg-cartao shadow-xs'
export const NOTA = 'rounded-[10px] border px-4 py-3.5 text-[13px] leading-[1.5]'

/**
 * O piso de 44px para alvo de toque, aplicado só abaixo de 768px.
 *
 * O artboard `Estados` desenha `.btn-sm` com 38px e, na mesma folha, cobra "alvos de toque de
 * 44px". As duas coisas não se contradizem: 38px é alvo de ponteiro, que acerta o pixel; 44px é
 * alvo de dedo. A troca é por `max-md:`, e não por medição em JavaScript, para que a primeira
 * pintura já esteja certa.
 */
export const ALVO_DE_TOQUE = 'max-md:min-h-11'

// --- botões ----------------------------------------------------------------------------------

/** Forma, sem tamanho e sem cor: é a parte que todo botão de texto compartilha. */
export const BOTAO_BASE = 'cursor-pointer rounded-lg border'

const TAMANHO_NORMAL = 'min-h-11 px-[18px] text-[14px]'
/** O `.btn-sm` do artboard, com o piso de toque em tela estreita. */
export const TAMANHO_PEQUENO = `min-h-[38px] px-3 text-[13px] ${ALVO_DE_TOQUE}`

const CLARO = 'border-neutro-300 bg-cartao font-semibold text-neutro-700 hover:bg-neutro-50'
const ESCURO = 'border-neutro-900 bg-neutro-900 font-semibold text-cartao hover:bg-neutro-950'

/** O secundário: fundo branco, borda neutra. */
export const BOTAO = `${BOTAO_BASE} ${TAMANHO_NORMAL} ${CLARO}`
/** O primário: fundo quase preto, texto branco. */
export const BOTAO_ESCURO = `${BOTAO_BASE} ${TAMANHO_NORMAL} ${ESCURO}`
export const BOTAO_PEQUENO = `${BOTAO_BASE} ${TAMANHO_PEQUENO} ${CLARO}`
export const BOTAO_PEQUENO_ESCURO = `${BOTAO_BASE} ${TAMANHO_PEQUENO} ${ESCURO}`

/** Aprovar: a única ação verde da aplicação. */
export const BOTAO_APROVAR = `${BOTAO_BASE} ${TAMANHO_NORMAL} border-sucesso-acao bg-sucesso-acao font-semibold text-cartao hover:bg-sucesso-acao-forte`
/** Rejeitar: contorno e texto de erro sobre branco, para não competir com o aprovar. */
export const BOTAO_REJEITAR = `${BOTAO_BASE} ${TAMANHO_NORMAL} border-erro-borda-acao bg-cartao font-semibold text-erro-texto hover:bg-erro-fundo`

/**
 * Os estados desabilitados mais usados. Cada um declara as três cores do estado `disabled:` uma
 * vez, e por isso pode ser somado a qualquer variante acima sem repetir propriedade.
 */
export const DESABILITADO_NEUTRO =
  'disabled:cursor-not-allowed disabled:border-neutro-200 disabled:bg-neutro-50 disabled:text-neutro-500'

/** O botão quadrado de ação de linha — lápis, lixeira. Vira 44px no toque, pelo mesmo motivo. */
const ICONE_FORMA =
  'inline-flex size-[38px] max-md:size-11 cursor-pointer items-center justify-center rounded-lg border'
export const BOTAO_ICONE = `${ICONE_FORMA} border-neutro-200 bg-cartao text-neutro-600 hover:bg-neutro-50 hover:text-neutro-700`
/** O botão de ícone da linha em edição. */
export const BOTAO_ICONE_ATIVO = `${ICONE_FORMA} border-marca-100 bg-marca-15 text-marca-800 hover:bg-marca-25`
/** A lixeira: neutra em repouso, vermelha só sob o ponteiro. */
export const BOTAO_ICONE_PERIGO = `${ICONE_FORMA} border-neutro-200 bg-cartao text-neutro-600 hover:border-erro-borda hover:bg-erro-fundo hover:text-erro-texto`

/** O cabeçalho de coluna, igual nas duas tabelas que a aplicação tem. */
export const CABECALHO =
  'border-b border-neutro-200 bg-neutro-25 px-3.5 py-2.5 text-left text-[12px] font-semibold whitespace-nowrap text-neutro-600'

/** `npm run seed` e afins, quando o texto de um vazio cita um comando. */
export const CODIGO =
  'rounded-[5px] border border-neutro-200 bg-neutro-100 px-1.5 py-0.5 font-mono text-[12px]'
