/**
 * Schemas de entrada, um por operação.
 *
 * Responsabilidade única: dizer o que é um corpo aceitável para cada operação do pedido, e
 * traduzir a recusa para o vocabulário de erro do domínio.
 *
 * São **dois** schemas e não um com campos opcionais, porque rascunho e submissão respondem a
 * perguntas diferentes. O rascunho é incompleto por natureza — exigir obra, fornecedor e item
 * ali transformaria "salvar e voltar depois" em "preencher tudo agora". A submissão é o instante
 * em que o pedido passa a valer, e aí a exigência é total. Um schema só, com tudo opcional,
 * acabaria validando a submissão em outro lugar — e as duas regras divergiriam.
 *
 * O mesmo módulo é importado pela rota e pelo formulário: a tela recusa o que a rota recusaria,
 * em vez de o usuário descobrir o problema no envio.
 */

import { z } from 'zod'

import * as Alcada from './alcada'
import * as Decisao from './decisao'
import * as Dinheiro from './dinheiro'
import * as Quantidade from './quantidade'
import { SITUACOES_DO_PEDIDO } from './tipos'
import type { Centavos, Milesimos, Resultado } from './tipos'
import { falha, sucesso } from './tipos'
import { erro, type CamposComErro, type ErroDominio } from './erros'

/** Unidades aceitas numa linha do pedido. Lista fechada: SQLite não tem enum. */
export const UNIDADES = ['un', 'kg', 'm', 'm2', 'm3', 'sc', 'L', 'h'] as const
export type Unidade = (typeof UNIDADES)[number]

export const MAX_ITENS = 100
export const MAX_DESCRICAO = 200
export const MAX_OBSERVACOES = 2000
/** R$ 10.000.000,00 — teto do preço unitário de uma linha. */
export const MAX_PRECO_CENTAVOS = 1_000_000_000

/**
 * Coerção de preço unitário.
 *
 * A leitura da entrada é de `dinheiro.ts`, não do Zod: `z.coerce.number()` passaria por ponto
 * flutuante e "1.234,56" viraria `NaN` ou 1.234. O parser do domínio é o único lugar que sabe
 * que o último separador é o decimal — ter um segundo aqui faria a tela e a rota discordarem.
 */
const precoUnitario = z
  .union([z.string(), z.number()], { error: 'Informe o preço unitário.' })
  .transform((valor, ctx): Centavos => {
    const centavos = Dinheiro.deEntrada(String(valor))
    if (centavos === null) {
      ctx.addIssue({ code: 'custom', message: 'Preço unitário inválido.' })
      return z.NEVER
    }
    return centavos
  })
  // "Valor monetário não negativo", como o enunciado diz: zero é aceito, negativo não. A
  // quantidade, essa sim, é estritamente positiva.
  .refine((centavos) => centavos >= 0, {
    message: 'O preço unitário não pode ser negativo.',
  })
  .refine((centavos) => centavos <= MAX_PRECO_CENTAVOS, {
    message: `O preço unitário não pode passar de ${Dinheiro.formatar(
      MAX_PRECO_CENTAVOS as Centavos,
    )}.`,
  })

/** Coerção de quantidade. Precisão acima de três casas é recusada, nunca truncada. */
const quantidade = z
  .union([z.string(), z.number()], { error: 'Informe a quantidade.' })
  .transform((valor, ctx): Milesimos => {
    const milesimos = Quantidade.deEntrada(String(valor))
    if (milesimos === null) {
      ctx.addIssue({ code: 'custom', message: 'Quantidade inválida.' })
      return z.NEVER
    }
    return milesimos
  })
  .refine((milesimos) => Quantidade.ehPositiva(milesimos), {
    message: 'A quantidade deve ser maior que zero.',
  })

const descricao = z
  .string({ error: 'Informe a descrição.' })
  .trim()
  .min(1, 'Informe a descrição.')
  .max(MAX_DESCRICAO, `A descrição não pode passar de ${MAX_DESCRICAO} caracteres.`)
const unidade = z.enum(UNIDADES)
const observacoes = z
  .string()
  .trim()
  .max(MAX_OBSERVACOES, `As observações não podem passar de ${MAX_OBSERVACOES} caracteres.`)
  .optional()
/**
 * Identificadores vêm do banco e são opacos para o domínio: validar o formato cuid aqui
 * acoplaria a regra à estratégia de chave do Prisma.
 */
const identificador = z.string().trim().min(1)

const itemSubmetido = z.object({
  descricao,
  quantidade,
  unidade,
  precoUnitario,
})

// --- data do pedido ---------------------------------------------------------------------------

/**
 * O fuso em que a data do pedido é lida e exibida. As obras do seed ficam na Bahia, e é o mesmo
 * fuso de `src/ui/componentes/rotulos.ts`.
 */
export const FUSO_DO_PEDIDO = 'America/Bahia'

const DATA_CIVIL = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Lê "AAAA-MM-DD" — o formato do `<input type="date">` — e devolve o instante que a representa,
 * ou `null` se o texto não é uma data do calendário ("2026-02-30" não é).
 *
 * A data do pedido é **civil**: a pessoa declara um dia, não um instante. Ela é gravada ao
 * meio-dia UTC porque esse instante cai no mesmo dia do calendário em qualquer fuso de −11 h a
 * +11 h; meia-noite UTC já seria o dia anterior na Bahia, e o pedido mudaria de data na tela.
 */
export function dataCivil(texto: string): Date | null {
  const partes = DATA_CIVIL.exec(texto.trim())
  if (!partes) return null
  const [ano, mes, dia] = partes.slice(1).map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia, 12))
  const confere =
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  return confere ? data : null
}

const FORMATO_CIVIL = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_DO_PEDIDO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** O caminho de volta de `dataCivil`: o dia, em "AAAA-MM-DD", no fuso do pedido. */
export function dataParaEntrada(instante: Date): string {
  return FORMATO_CIVIL.format(instante)
}

/**
 * A data **de emissão** do pedido, que quem compra declara. Não se confunde com `submetidoEm`,
 * que o servidor carimba na submissão e é o registro auditável de quando o pedido entrou no
 * fluxo. Nenhuma regra de data futura ou retroativa: o enunciado pede só que seja obrigatória
 * e válida, e regra de negócio não se inventa.
 */
const dataPedido = z
  .string({ error: 'Informe a data do pedido.' })
  .trim()
  .min(1, 'Informe a data do pedido.')
  .transform((texto, ctx): Date => {
    const data = dataCivil(texto)
    if (data === null) {
      ctx.addIssue({ code: 'custom', message: 'Data do pedido inválida. Use o formato AAAA-MM-DD.' })
      return z.NEVER
    }
    return data
  })

/**
 * No rascunho a data pode faltar — inclusive como texto vazio ou `null`, que é o campo apagado.
 * Presente e malformada, é recusada como na submissão.
 */
const dataPedidoDoRascunho = z.preprocess(
  (valor) => (valor === null || (typeof valor === 'string' && valor.trim() === '') ? undefined : valor),
  dataPedido.optional(),
)

/**
 * O corpo aceitável de um rascunho.
 *
 * Permissivo quanto à **ausência**: todo campo pode faltar, inclusive a obra. Estrito quanto ao
 * que está presente e malformado — um preço que não dá para interpretar não vira zero em
 * silêncio, porque o total do rascunho é exibido ao comprador.
 *
 * `totalCentavos`, `situacao` e `submetidoEm` não aparecem: são do servidor, e o Zod descarta
 * campo desconhecido em vez de recusá-lo.
 */
export const rascunhoSchema = z.object({
  obraId: identificador.optional(),
  fornecedorId: identificador.optional(),
  dataPedido: dataPedidoDoRascunho,
  observacoes,
  itens: z
    .array(
      z.object({
        descricao: z
          .string()
          .trim()
          .max(MAX_DESCRICAO, `A descrição não pode passar de ${MAX_DESCRICAO} caracteres.`)
          .optional(),
        quantidade: quantidade.optional(),
        unidade: unidade.optional(),
        precoUnitario: precoUnitario.optional(),
      }),
    )
    .max(MAX_ITENS, `O pedido aceita no máximo ${MAX_ITENS} itens.`)
    .optional(),
})

export type EntradaDeRascunho = z.infer<typeof rascunhoSchema>

/**
 * O corpo aceitável de uma submissão.
 *
 * Obra, fornecedor, data do pedido e ao menos um item são obrigatórios — os campos que o
 * enunciado marca como obrigatórios. É a submissão que resolve a faixa e grava a cadeia, e
 * nenhuma das duas é possível sem total.
 */
export const submissaoSchema = z.object({
  // Mensagem no construtor, e não só no `.min`: o `.min` cobre o campo presente e vazio; ausente
  // cairia no texto padrão da biblioteca, em inglês, e ele chega à tela ancorado no campo.
  obraId: z.string({ error: 'Informe a obra do pedido.' }).trim().min(1, 'Informe a obra do pedido.'),
  fornecedorId: z
    .string({ error: 'Informe o fornecedor.' })
    .trim()
    .min(1, 'Informe o fornecedor.'),
  dataPedido,
  observacoes,
  itens: z
    .array(itemSubmetido, { error: 'O pedido precisa de ao menos um item.' })
    .min(1, 'O pedido precisa de ao menos um item.')
    .max(MAX_ITENS, `O pedido aceita no máximo ${MAX_ITENS} itens.`),
})

export type EntradaDeSubmissao = z.infer<typeof submissaoSchema>

/**
 * Adapta o erro do Zod ao formato que a interface ancora no input.
 *
 * O formato nativo do Zod não atravessa a borda: ele carrega o vocabulário da biblioteca
 * (`invalid_type`, `too_small`, `path` como array), e a tela passaria a depender dele. Aqui a
 * saída é `CamposComErro` — `{ 'itens.0.quantidade': 'A quantidade deve ser maior que zero.' }` —
 * e trocar de biblioteca de validação deixa de ser uma mudança de contrato.
 */
export function camposDoZodError(zodError: z.ZodError): CamposComErro {
  const campos: Record<string, string> = {}
  for (const problema of zodError.issues) {
    const caminho = problema.path.map(String).join('.')
    const chave = caminho === '' ? '_' : caminho
    // O primeiro problema de cada campo é o que a tela mostra; os seguintes são consequência.
    if (!(chave in campos)) campos[chave] = problema.message
  }
  return campos
}

/**
 * Roda um schema e devolve `Resultado`, não exceção.
 *
 * Entrada inválida é caso esperado de formulário, e a rota precisa transformá-la em 422 com
 * código — não em stack trace.
 */
export function validarCom<T>(
  schema: z.ZodType<T>,
  dados: unknown,
): Resultado<T, ErroDominio> {
  const analise = schema.safeParse(dados)
  if (analise.success) return sucesso(analise.data)
  return falha(
    erro('VALIDACAO', 'Revise os campos destacados.', camposDoZodError(analise.error)),
  )
}

/** Atalhos nomeados, para a rota não repetir qual schema é de qual operação. */
export function validarRascunho(dados: unknown): Resultado<EntradaDeRascunho, ErroDominio> {
  return validarCom(rascunhoSchema, dados)
}

export function validarSubmissao(dados: unknown): Resultado<EntradaDeSubmissao, ErroDominio> {
  return validarCom(submissaoSchema, dados)
}

// --- faixa da alçada ---------------------------------------------------------------------------

/**
 * Limite superior de uma faixa.
 *
 * Três formas de entrada, e a distinção entre duas delas é o ponto:
 *
 * - **texto** é o que a pessoa digitou — "10.000,00" — e é lido por `Dinheiro.deEntrada`, pelo
 *   mesmo motivo do preço unitário: `z.coerce.number()` passaria por ponto flutuante e viraria
 *   10. Um segundo parser aqui faria a tela e a rota discordarem sobre o mesmo texto;
 * - **número** já é o inteiro em centavos, como o contrato da rota declara (`int > 0`). Passá-lo
 *   pelo parser de texto multiplicaria por cem quem chamasse a rota por `curl`, em silêncio;
 * - **ausência** — `null`, `undefined` ou texto vazio — é a **faixa aberta**, que é um valor
 *   legítimo e não uma falta.
 */
const limiteDaFaixa = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((valor, ctx): Centavos | null => {
    if (valor === null || valor === undefined) return null

    if (typeof valor === 'number') {
      if (!Number.isInteger(valor)) {
        ctx.addIssue({ code: 'custom', message: 'O valor máximo em centavos deve ser inteiro.' })
        return z.NEVER
      }
      return Dinheiro.deCentavos(valor)
    }

    if (valor.trim() === '') return null

    const centavos = Dinheiro.deEntrada(valor)
    if (centavos === null) {
      ctx.addIssue({ code: 'custom', message: 'Valor máximo inválido.' })
      return z.NEVER
    }
    return centavos
  })
  .refine((centavos) => centavos === null || Dinheiro.ehPositivo(centavos), {
    message: 'O valor máximo deve ser maior que zero. Deixe em branco para a faixa sem teto.',
  })

/**
 * O corpo aceitável de uma faixa, na criação e na substituição.
 *
 * `aprovadores` é a lista ordenada de usuários: **a posição no array é a ordem na cadeia**, e
 * nenhuma ordem enviada pelo cliente é lida. É o que torna `PUT` suficiente e dispensa uma rota
 * de reordenação — reordenar e salvar é o mesmo corpo com os ids em outra sequência, e a faixa
 * nunca passa por um estado em que dois aprovadores ocupam a mesma posição.
 *
 * A repetição é recusada aqui, e não só pelo índice único do banco, porque o erro precisa chegar
 * à tela ancorado em `aprovadores` — e não como violação de constraint.
 */
export const faixaSchema = z.object({
  limiteCentavos: limiteDaFaixa,
  aprovadores: z
    .array(identificador, { error: 'Informe ao menos um aprovador.' })
    .min(1, 'A faixa precisa de ao menos um aprovador.')
    .max(
      Alcada.MAX_APROVADORES_POR_FAIXA,
      `A faixa aceita no máximo ${Alcada.MAX_APROVADORES_POR_FAIXA} aprovadores.`,
    )
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'O mesmo aprovador não pode aparecer duas vezes na faixa.',
    }),
})

export type EntradaDeFaixa = z.infer<typeof faixaSchema>

export function validarFaixa(dados: unknown): Resultado<EntradaDeFaixa, ErroDominio> {
  return validarCom(faixaSchema, dados)
}

// --- cadastros: obra e fornecedor --------------------------------------------------------------

export const MAX_NOME_DE_OBRA = 120
export const MAX_CIDADE = 80
export const MAX_NOME_DE_FORNECEDOR = 160

/**
 * O corpo aceitável de uma obra nova. São os dois campos que o modelo tem — `nome` e `cidade` —, e
 * nada mais: o artboard `Empresa` desenha também responsável, situação e data de início, que não
 * existem no modelo e entram como divergência declarada, não como coluna inventada aqui.
 */
export const obraSchema = z.object({
  nome: z
    .string({ error: 'Informe o nome da obra.' })
    .trim()
    .min(1, 'Informe o nome da obra.')
    .max(MAX_NOME_DE_OBRA, `O nome não pode passar de ${MAX_NOME_DE_OBRA} caracteres.`),
  cidade: z
    .string({ error: 'Informe a cidade da obra.' })
    .trim()
    .min(1, 'Informe a cidade da obra.')
    .max(MAX_CIDADE, `A cidade não pode passar de ${MAX_CIDADE} caracteres.`),
})

export type EntradaDeObra = z.infer<typeof obraSchema>

export function validarObra(dados: unknown): Resultado<EntradaDeObra, ErroDominio> {
  return validarCom(obraSchema, dados)
}

/**
 * O CNPJ, opcional como no modelo. Aceita com ou sem máscara e grava sempre mascarado
 * ("12.345.678/0001-90"), que é como o seed e a tela o mostram. A exigência é só a forma — 14
 * dígitos —: o enunciado não pede validação de dígito verificador, e regra não se inventa.
 */
const cnpj = z.preprocess(
  (valor) => (valor === null || (typeof valor === 'string' && valor.trim() === '') ? undefined : valor),
  z
    .string()
    .transform((texto, ctx): string => {
      const digitos = texto.replace(/[.\/\-\s]/g, '')
      if (!/^\d{14}$/.test(digitos)) {
        ctx.addIssue({ code: 'custom', message: 'O CNPJ tem 14 dígitos, como 12.345.678/0001-90.' })
        return z.NEVER
      }
      return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    })
    .optional(),
)

/** O corpo aceitável de um fornecedor novo: `nome` e, opcionalmente, o CNPJ (`documento`). */
export const fornecedorSchema = z.object({
  nome: z
    .string({ error: 'Informe o nome do fornecedor.' })
    .trim()
    .min(1, 'Informe o nome do fornecedor.')
    .max(MAX_NOME_DE_FORNECEDOR, `O nome não pode passar de ${MAX_NOME_DE_FORNECEDOR} caracteres.`),
  documento: cnpj,
})

export type EntradaDeFornecedor = z.infer<typeof fornecedorSchema>

export function validarFornecedor(dados: unknown): Resultado<EntradaDeFornecedor, ErroDominio> {
  return validarCom(fornecedorSchema, dados)
}

// --- decisão -----------------------------------------------------------------------------------

/**
 * O corpo aceitável de uma decisão.
 *
 * O `motivo` é obrigatório **somente** quando o tipo é `rejeitar`, e a recusa sai ancorada em
 * `motivo` — é o que o critério cobra (`campos.motivo`) e é o que o diálogo precisa para pintar
 * o campo certo. O `superRefine` existe porque a obrigatoriedade depende de outro campo do mesmo
 * objeto; um `motivo` sempre obrigatório cobraria justificativa de quem aprova.
 *
 * A aprovação ignora o motivo enviado: aprovar não comenta, e aceitar um texto que o banco não
 * guarda seria prometer um registro que não existe.
 */
export const decisaoSchema = z
  .object({
    tipo: z.enum(['aprovar', 'rejeitar'], { error: 'A decisão é aprovar ou rejeitar.' }),
    motivo: z.string().trim().optional(),
  })
  .superRefine((valor, ctx) => {
    if (valor.tipo !== 'rejeitar') return
    const motivo = valor.motivo ?? ''
    if (motivo.length < Decisao.MOTIVO_MINIMO) {
      ctx.addIssue({
        code: 'custom',
        path: ['motivo'],
        message: 'Informe o motivo da rejeição, com ao menos três caracteres.',
      })
      return
    }
    if (motivo.length > Decisao.MOTIVO_MAXIMO) {
      ctx.addIssue({
        code: 'custom',
        path: ['motivo'],
        message: `O motivo não pode passar de ${Decisao.MOTIVO_MAXIMO} caracteres.`,
      })
    }
  })

export type EntradaDeDecisao = z.infer<typeof decisaoSchema>

export function validarDecisao(dados: unknown): Resultado<EntradaDeDecisao, ErroDominio> {
  return validarCom(decisaoSchema, dados)
}

// --- filtros da lista de pedidos ---------------------------------------------------------------

export const PER_PAGE_PADRAO = 50
export const PER_PAGE_MAXIMO = 100

/**
 * Os filtros de `GET /api/pedidos`, lidos de uma query string.
 *
 * `situacao` é repetível — `?situacao=pendente&situacao=aprovado` —, por isso a entrada é sempre
 * uma lista, montada por quem lê a URL. Situação fora do conjunto fechado é 422, e não um filtro
 * ignorado em silêncio: um filtro que o servidor descarta devolveria mais pedidos do que a tela
 * pediu, e ninguém notaria.
 *
 * `page` e `perPage` chegam como texto da URL e são lidos como inteiro aqui. Fora da faixa é
 * recusa, não recorte: `perPage=5000` é um pedido que o servidor não atende, e atendê-lo pela
 * metade esconderia o teto de quem pagina.
 */
const inteiroDaQuery = (rotulo: string) =>
  z
    .union([z.string(), z.number(), z.undefined()])
    .transform((valor, ctx): number | undefined => {
      if (valor === undefined || valor === '') return undefined
      const texto = String(valor).trim()
      if (!/^\d+$/.test(texto)) {
        ctx.addIssue({ code: 'custom', message: `${rotulo} precisa ser um número inteiro.` })
        return z.NEVER
      }
      return Number(texto)
    })

export const filtroDePedidosSchema = z.object({
  situacao: z
    .array(
      // Mensagem no construtor, como em `obraId` do `submissaoSchema`: sem ela o Zod responde
      // "Invalid option: expected one of …", em inglês, e o texto chega à tela.
      z.enum(SITUACOES_DO_PEDIDO, {
        error: `A situação é uma de ${SITUACOES_DO_PEDIDO.join(', ')}.`,
      }),
      { error: 'Situação desconhecida.' },
    )
    .optional(),
  obraId: identificador.optional(),
  page: inteiroDaQuery('A página')
    .refine((n) => n === undefined || n >= 1, { message: 'A página começa em 1.' })
    .transform((n) => n ?? 1),
  perPage: inteiroDaQuery('O tamanho da página')
    .refine((n) => n === undefined || (n >= 1 && n <= PER_PAGE_MAXIMO), {
      message: `O tamanho da página vai de 1 a ${PER_PAGE_MAXIMO}.`,
    })
    .transform((n) => n ?? PER_PAGE_PADRAO),
})

export type FiltroDePedidos = z.infer<typeof filtroDePedidosSchema>

export function validarFiltroDePedidos(dados: unknown): Resultado<FiltroDePedidos, ErroDominio> {
  return validarCom(filtroDePedidosSchema, dados)
}
