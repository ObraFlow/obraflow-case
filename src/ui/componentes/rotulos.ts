/**
 * Vocabulário da interface.
 *
 * Responsabilidade única: traduzir o que o domínio chama de `papel` para o que o mockup mostra
 * na tela, num lugar só. Os textos saem dos artboards `TrocarConta` e `Perfis` (SPEC § Mockups);
 * onde o mockup descreve uma pessoa concreta — "Engenheira residente · Residencial Aurora" —
 * a descrição aqui é a do papel, porque cargo e obra não existem no modelo e a lista de
 * divergências já declara os nomes dos artboards como ilustrativos.
 */

import { Dinheiro, PAPEIS, type Centavos, type Papel, type SituacaoDoPedido } from '@/src/domain'

/** Marca fixa: não existe entidade Empresa nem seletor dela (ADR 0006). */
export const CONSTRUTORA = 'Construtora Vértice'

/** Rótulo curto, para a etiqueta ao lado do nome. */
export const ROTULO_DO_PAPEL: Readonly<Record<Papel, string>> = {
  admin: 'Admin',
  aprovador: 'Aprovador',
  comprador: 'Comprador',
  visualizador: 'Visualizador',
}

/** A linha de descrição sob o nome, no seletor de usuário. */
export const DESCRICAO_DO_PAPEL: Readonly<Record<Papel, string>> = {
  admin: 'Configura as faixas de alçada das obras',
  aprovador: 'Decide os pedidos das faixas em que está',
  comprador: 'Cria e submete pedidos; não aprova',
  visualizador: 'Acompanha os pedidos em leitura',
}

/** A etiqueta à direita da linha. `Em uso` é de quem está dentro e não vem daqui. */
type Etiqueta = { texto: string; tom: 'info' | 'neutro' }

export const ETIQUETA_DO_PAPEL: Readonly<Record<Papel, Etiqueta>> = {
  admin: { texto: 'Edita as regras da alçada', tom: 'info' },
  aprovador: { texto: 'Decide na alçada', tom: 'info' },
  comprador: { texto: 'Cria pedidos, não aprova', tom: 'info' },
  visualizador: { texto: 'Só leitura', tom: 'neutro' },
}

/**
 * Os três grupos do modal, na ordem do artboard. O título do primeiro carrega o nome da
 * construtora, como no mockup — é o único lugar em que a empresa aparece fora do cabeçalho.
 */
export const GRUPOS: ReadonlyArray<{ titulo: string; papeis: readonly Papel[] }> = [
  { titulo: `Administração · ${CONSTRUTORA}`, papeis: ['admin'] },
  { titulo: 'Aprovadores com alçada', papeis: ['aprovador'] },
  { titulo: 'Outros papéis', papeis: ['comprador', 'visualizador'] },
]

/** Duas letras, como no mockup: "Marina Alencar" vira "MA", "Caio" vira "CA". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '??'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

/**
 * O artboard dá uma cor de avatar por pessoa, sem regra visível. Aqui a escolha é determinística
 * pelo id: a mesma pessoa tem sempre a mesma cor, em qualquer tela e entre recargas, sem precisar
 * de uma coluna no banco para isso.
 */
const AVATARES = ['rosa', 'roxo', 'azul', 'cinza', 'verde'] as const
export type CorDeAvatar = (typeof AVATARES)[number]

export function corDoAvatar(id: string): CorDeAvatar {
  let soma = 0
  for (let i = 0; i < id.length; i += 1) soma = (soma + id.charCodeAt(i)) % 4096
  return AVATARES[soma % AVATARES.length]
}

export const CLASSE_DO_AVATAR: Readonly<Record<CorDeAvatar, string>> = {
  rosa: 'bg-avatar-rosa-fundo text-avatar-rosa-texto',
  roxo: 'bg-avatar-roxo-fundo text-avatar-roxo-texto',
  azul: 'bg-avatar-azul-fundo text-avatar-azul-texto',
  cinza: 'bg-avatar-cinza-fundo text-avatar-cinza-texto',
  verde: 'bg-avatar-verde-fundo text-avatar-verde-texto',
}

/** A ordem em que os papéis aparecem dentro de um grupo e na tela de entrada. */
export const ORDEM_DO_PAPEL: Readonly<Record<Papel, number>> = Object.fromEntries(
  PAPEIS.map((p, i) => [p, i]),
) as Record<Papel, number>

// --- pedidos e cadeia (Sprint 6) ---------------------------------------------------------------

/** A etiqueta de situação do pedido, com as cores do artboard `Aprovacoes` (`.badge`). */
export const ETIQUETA_DA_SITUACAO: Readonly<
  Record<SituacaoDoPedido, { texto: string; classe: string }>
> = {
  rascunho: {
    texto: 'Rascunho',
    classe: 'border-neutro-200 bg-neutro-50 text-neutro-600',
  },
  pendente: {
    texto: 'Pendente',
    classe: 'border-aviso-borda-forte bg-aviso-fundo text-aviso-texto',
  },
  aprovado: {
    texto: 'Aprovado',
    classe: 'border-sucesso-borda-forte bg-sucesso-fundo text-sucesso-texto',
  },
  rejeitado: {
    texto: 'Rejeitado',
    classe: 'border-erro-borda-forte bg-erro-fundo text-erro-texto',
  },
}

/**
 * Data e hora como o artboard as escreve — `23/10/2026`, `23/10/2026 09:12`.
 *
 * O locale é fixo em `pt-BR` pelo mesmo motivo de `Dinheiro.formatar`: o locale do navegador
 * faria a mesma data aparecer diferente para cada pessoa, e a trilha auditável é a mesma para
 * todo mundo.
 */
export function dataCurta(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' })
}

export function dataComHora(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Bahia',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Como a faixa do **snapshot** é escrita na tela.
 *
 * Deriva do que o pedido guarda — `faixaLimiteCentavos` e `faixaSemTeto` —, e não da alçada da
 * obra: é a regra sob a qual o pedido foi submetido, e ela sobrevive a editar ou apagar a faixa
 * (ADR 0001). Por isso a frase da faixa aberta é "Sem teto" e não "Acima de X": o piso é o
 * limite da faixa anterior, que o snapshot não guarda e que a tela não tem como inventar.
 */
export function faixaDoSnapshot(
  faixa: { limiteCentavos: number | null; semTeto: boolean } | null,
): string {
  if (!faixa) return 'Sem faixa registrada'
  if (faixa.semTeto || faixa.limiteCentavos === null) return 'Faixa sem teto'
  return `Faixa até ${Dinheiro.formatar(faixa.limiteCentavos as Centavos)}`
}
