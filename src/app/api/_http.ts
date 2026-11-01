// Apoio dos route handlers: ler o corpo, validar com Zod e traduzir erros para HTTP.
// É a segunda tradução dos erros de domínio (a primeira é handleServerError nas actions):
// o mesmo ErroDominio vira mensagem no form e status na API.

import { z } from "zod";
import { ErroDominio, type CodigoErro } from "@/domain/erros";
import { idSchema } from "@/lib/schemas/comum";

/** Formato de erro da API, documentado no README. */
export type ErroApi = {
  erro: {
    codigo: CodigoErro | "DADOS_INVALIDOS" | "ERRO_INTERNO";
    mensagem: string;
    /** Erros por campo (só em DADOS_INVALIDOS), no formato de `z.treeifyError`. */
    campos?: unknown;
  };
};

const STATUS_POR_CODIGO: Record<CodigoErro, number> = {
  NAO_ENCONTRADO: 404,
  // Regra de negócio não atendida pelo conteúdo enviado.
  SEM_FAIXA_APLICAVEL: 422,
  FAIXA_INVALIDA: 422,
  MOTIVO_OBRIGATORIO: 422,
  QUANTIDADE_INVALIDA: 422,
  PRECO_INVALIDO: 422,
  VALOR_EXCEDE_LIMITE: 422,
  SEGREGACAO_DE_FUNCOES: 422,
  ORIGEM_NAO_REJEITADA: 422,
  // Conflito com o estado atual do servidor.
  FAIXA_SOBREPOSTA: 409,
  DECISAO_FORA_DE_ORDEM: 409,
  CONFLITO_DE_DECISAO: 409,
  ORIGEM_JA_REFEITA: 409,
};

export function ok(dados: unknown, status = 200): Response {
  return Response.json(dados, { status });
}

function erro(status: number, corpo: ErroApi["erro"]): Response {
  return Response.json({ erro: corpo } satisfies ErroApi, { status });
}

/** Lê e valida o corpo JSON. Lança ZodError (vira 400 em `erroParaResposta`). */
export async function lerCorpo<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    throw new CorpoInvalido();
  }
  return schema.parse(corpo);
}

/** Valida os parâmetros de query (`?obraId=1&status=PENDENTE`). Lança ZodError. */
export function lerQuery<S extends z.ZodType>(request: Request, schema: S): z.infer<S> {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  return schema.parse(params);
}

/**
 * Id numérico do segmento de rota (`/api/pedidos/[id]`). Lança ZodError (400). Usa o mesmo
 * `idSchema` dos corpos, com o teto do Int do banco: acima dele o Prisma lançaria erro (500).
 */
export function lerId(valor: string): number {
  return idSchema.parse(valor);
}

class CorpoInvalido extends Error {
  constructor() {
    super("Corpo da requisição não é um JSON válido.");
    this.name = "CorpoInvalido";
  }
}

export function erroParaResposta(causa: unknown): Response {
  if (causa instanceof CorpoInvalido) {
    return erro(400, { codigo: "DADOS_INVALIDOS", mensagem: causa.message });
  }
  if (causa instanceof z.ZodError) {
    return erro(400, {
      codigo: "DADOS_INVALIDOS",
      mensagem: "Dados inválidos. Verifique os campos informados.",
      campos: z.treeifyError(causa),
    });
  }
  if (causa instanceof ErroDominio) {
    return erro(STATUS_POR_CODIGO[causa.codigo], { codigo: causa.codigo, mensagem: causa.message });
  }
  console.error("[api] erro inesperado:", causa);
  return erro(500, { codigo: "ERRO_INTERNO", mensagem: "Erro interno. Tente novamente." });
}

/**
 * Envolve um handler: o que ele devolver vira resposta, o que ele lançar vira erro HTTP.
 * Mantém cada route.ts com uma linha por verbo, sem try/catch repetido.
 */
export function tratarErros(handler: () => Promise<Response>): Promise<Response> {
  return handler().catch(erroParaResposta);
}
