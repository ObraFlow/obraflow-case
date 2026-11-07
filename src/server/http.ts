/**
 * Borda HTTP: envelope de erro e wrapper de rota.
 *
 * Responsabilidade única: traduzir o vocabulário do domínio para o do HTTP, uma vez só. A rota
 * não escolhe número de situação — ela recusa com um código do enum e o número sai de
 * `SITUACAO_HTTP`. Espalhado pelos handlers, o mapeamento diverge: a mesma recusa responderia
 * 400 numa rota e 409 em outra, e a tela precisaria tratar as duas.
 *
 * Toda resposta de erro — sem exceção — sai como `{ error: { code, message, fields? } }`.
 */

import {
  SITUACAO_HTTP,
  erro as erroDominio,
  type CamposComErro,
  type Codigo,
  type ErroDominio,
} from '@/src/domain'
import { lerSessao, type Sessao } from './sessao'
import { pode, type Acao } from './permissao'

/**
 * Códigos que não são do domínio: não descrevem recusa de regra de negócio, e sim acidente ou
 * limite de transporte. Vivem aqui, e não em `src/domain/erros.ts`, porque o domínio não conhece
 * payload, timeout nem stack.
 */
export const CODIGOS_DE_BORDA = ['ERRO_INTERNO', 'PAYLOAD_GRANDE', 'TEMPO_ESGOTADO'] as const
export type CodigoDeBorda = (typeof CODIGOS_DE_BORDA)[number]

const SITUACAO_HTTP_DE_BORDA: Readonly<Record<CodigoDeBorda, number>> = {
  ERRO_INTERNO: 500,
  PAYLOAD_GRANDE: 413,
  TEMPO_ESGOTADO: 504,
}

export type CorpoDeErro = {
  readonly error: {
    readonly code: Codigo | CodigoDeBorda
    readonly message: string
    readonly fields?: CamposComErro
  }
}

/** 1 MB, o teto declarado na SPEC para qualquer corpo. */
export const LIMITE_DO_CORPO_EM_BYTES = 1024 * 1024

/** 5 s, o teto declarado na SPEC para qualquer rota. */
export const LIMITE_DE_TEMPO_EM_MS = 5000

/**
 * Recusa prevista, no formato que atravessa o `throw`.
 *
 * O domínio devolve `ErroDominio` como valor (`Resultado`), que é o certo para função pura. Na
 * borda, porém, a recusa precisa interromper o handler de qualquer profundidade — daí a exceção,
 * que o wrapper captura e converte.
 */
export class FalhaDominio extends Error {
  readonly erro: ErroDominio

  constructor(erro: ErroDominio) {
    super(erro.mensagem)
    this.name = 'FalhaDominio'
    this.erro = erro
  }
}

export function ehFalhaDominio(valor: unknown): valor is FalhaDominio {
  return valor instanceof FalhaDominio
}

/** Interrompe o handler com uma recusa prevista. */
export function recusar(codigo: Codigo, mensagem: string, campos?: CamposComErro): never {
  throw new FalhaDominio(erroDominio(codigo, mensagem, campos))
}

class FalhaDeBorda extends Error {
  readonly codigo: CodigoDeBorda

  constructor(codigo: CodigoDeBorda, mensagem: string) {
    super(mensagem)
    this.name = 'FalhaDeBorda'
    this.codigo = codigo
  }
}

// --- respostas -------------------------------------------------------------------------------

export function ok<T>(dados: T, situacao = 200, cabecalhos?: HeadersInit): Response {
  return Response.json(dados, { status: situacao, headers: cabecalhos })
}

export function respostaDeErro(erro: ErroDominio): Response {
  const corpo: CorpoDeErro = {
    error: erro.campos
      ? { code: erro.codigo, message: erro.mensagem, fields: erro.campos }
      : { code: erro.codigo, message: erro.mensagem },
  }
  return Response.json(corpo, { status: SITUACAO_HTTP[erro.codigo] })
}

function respostaDeBorda(codigo: CodigoDeBorda, mensagem: string): Response {
  const corpo: CorpoDeErro = { error: { code: codigo, message: mensagem } }
  return Response.json(corpo, { status: SITUACAO_HTTP_DE_BORDA[codigo] })
}

// --- guardas ---------------------------------------------------------------------------------

/**
 * O modo demonstração é uma flag, não um papel: desligada, a rota **não existe** — 404, não 403.
 * A diferença importa. 403 anunciaria um recurso presente e protegido; 404 não conta ao mundo que
 * existe uma entrada sem senha neste servidor (ADR 0005).
 */
export function exigirModoDemo(): void {
  if (process.env.DEMO_MODE !== 'true') {
    recusar('NAO_ENCONTRADO', 'Recurso não encontrado.')
  }
}

export function modoDemoLigado(): boolean {
  return process.env.DEMO_MODE === 'true'
}

/** Sessão ausente é 403 SEM_PERMISSAO, não 401: não há autenticação a exigir neste case. */
export async function exigirSessao(req: Request): Promise<Sessao> {
  const sessao = await lerSessao(req)
  if (!sessao) recusar('SEM_PERMISSAO', 'É preciso estar em uma sessão para esta ação.')
  return sessao
}

/**
 * Lê a sessão e cobra a ação **antes** de qualquer consulta de negócio: quem não pode não chega a
 * tocar no banco, e a recusa não depende de o recurso existir.
 */
export async function exigirPermissao(req: Request, acao: Acao): Promise<Sessao> {
  const sessao = await exigirSessao(req)
  if (!pode(sessao.papel, acao)) {
    recusar('SEM_PERMISSAO', `O papel ${sessao.papel} não autoriza esta ação.`)
  }
  return sessao
}

// --- corpo -----------------------------------------------------------------------------------

/**
 * Interpreta o corpo como JSON.
 *
 * O teto de tamanho é conferido pelo `Content-Length` antes de ler um byte — e, quando o
 * cabeçalho não vem, pelo tamanho do texto já lido. Corpo ilegível é 422 VALIDACAO: é entrada
 * malformada do cliente, não acidente do servidor.
 *
 * Corpo **ausente** é outra coisa: devolve `undefined`, e quem chama decide. `POST /api/pedidos`
 * sem corpo nenhum cria um rascunho vazio, que é o que o critério "aceita corpo com todos os
 * campos ausentes" pede — um corpo que não existe não é um corpo malformado, e recusá-lo como
 * JSON inválido confundiria as duas coisas.
 */
export async function lerCorpoJson(req: Request): Promise<unknown> {
  const declarado = req.headers.get('content-length')
  if (declarado && Number(declarado) > LIMITE_DO_CORPO_EM_BYTES) {
    throw new FalhaDeBorda('PAYLOAD_GRANDE', 'Corpo da requisição acima do limite de 1 MB.')
  }

  let texto: string
  try {
    texto = await req.text()
  } catch {
    recusar('VALIDACAO', 'Não foi possível ler o corpo da requisição.')
  }

  if (texto.trim() === '') return undefined

  if (new TextEncoder().encode(texto).length > LIMITE_DO_CORPO_EM_BYTES) {
    throw new FalhaDeBorda('PAYLOAD_GRANDE', 'Corpo da requisição acima do limite de 1 MB.')
  }

  try {
    return JSON.parse(texto) as unknown
  } catch {
    recusar('VALIDACAO', 'O corpo da requisição precisa ser JSON válido.')
  }
}

/** Exceção de controle de fluxo do Next: reconhecida pelo `digest` que ela carrega. */
function ehSinalDoFramework(valor: unknown): boolean {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    typeof (valor as { digest?: unknown }).digest === 'string'
  )
}

// --- wrapper ---------------------------------------------------------------------------------

type Manipulador<C> = (req: Request, contexto: C) => Promise<Response> | Response

/**
 * Envolve um Route Handler: impõe o teto de tempo e converte qualquer saída anormal no envelope.
 *
 * Três caminhos, nesta ordem:
 * 1. `FalhaDominio` — recusa prevista, status vindo de `SITUACAO_HTTP`;
 * 2. `FalhaDeBorda` — limite de transporte (413) ou tempo esgotado (504);
 * 3. qualquer outra coisa — 500 com mensagem genérica. A exceção original vai para o log do
 *    servidor e **não** entra na resposta: stack e mensagem interna descrevem o código, não o
 *    pedido, e vazá-las entrega ao cliente um mapa do servidor.
 */
export function rota<C = unknown>(
  manipulador: Manipulador<C>,
  opcoes: { tempoLimiteEmMs?: number } = {},
): Manipulador<C> {
  // O teto é o da SPEC, e cada contrato declara o seu: a submissão resolve faixa, monta cadeia e
  // grava tudo numa transação, e o contrato lhe dá 8 s. O número continua saindo do contrato, não
  // da rota — o que muda é de onde o wrapper o lê.
  const tempoLimite = opcoes.tempoLimiteEmMs ?? LIMITE_DE_TEMPO_EM_MS
  return async (req, contexto) => {
    let expirar: ReturnType<typeof setTimeout> | undefined
    try {
      const prazo = new Promise<never>((_, rejeitar) => {
        expirar = setTimeout(
          () =>
            rejeitar(
              new FalhaDeBorda(
                'TEMPO_ESGOTADO',
                `A requisição excedeu ${tempoLimite / 1000} s.`,
              ),
            ),
          tempoLimite,
        )
      })
      return await Promise.race([Promise.resolve(manipulador(req, contexto)), prazo])
    } catch (capturado) {
      // `redirect()`, `notFound()` e os sinais de prerender do Next viajam como exceção com
      // `digest`. Engoli-los aqui transformaria um desvio de fluxo do framework em 500 — o
      // wrapper devolve o que não é dele.
      if (ehSinalDoFramework(capturado)) throw capturado
      if (ehFalhaDominio(capturado)) return respostaDeErro(capturado.erro)
      if (capturado instanceof FalhaDeBorda) {
        return respostaDeBorda(capturado.codigo, capturado.message)
      }
      console.error('[obraflow] erro não previsto na rota', capturado)
      return respostaDeBorda('ERRO_INTERNO', 'Erro inesperado ao processar a requisição.')
    } finally {
      if (expirar) clearTimeout(expirar)
    }
  }
}
