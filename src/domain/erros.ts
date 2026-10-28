// Erros de domínio. Nascem aqui com um `codigo` estável e uma mensagem em pt-BR
// pronta para o usuário. Quem traduz para HTTP (api/_http.ts) ou para a UI
// (actions/client.ts) olha o `codigo` ou a classe, nunca o texto.

export type CodigoErro =
  | "SEM_FAIXA_APLICAVEL"
  | "FAIXA_SOBREPOSTA"
  | "FAIXA_INVALIDA"
  | "DECISAO_FORA_DE_ORDEM"
  | "CONFLITO_DE_DECISAO"
  | "MOTIVO_OBRIGATORIO"
  | "QUANTIDADE_INVALIDA"
  | "PRECO_INVALIDO"
  | "VALOR_EXCEDE_LIMITE"
  | "NAO_ENCONTRADO";

export class ErroDominio extends Error {
  readonly codigo: CodigoErro;

  constructor(codigo: CodigoErro, mensagem: string) {
    super(mensagem);
    this.name = new.target.name;
    this.codigo = codigo;
  }
}

/**
 * O total do pedido não cai em nenhuma faixa da obra (decisão de produto 2).
 * A mensagem sempre cita obra e valor; quem chama formata o valor em BRL (lib/money.ts).
 */
export class SemFaixaAplicavel extends ErroDominio {
  constructor(obraNome: string, totalFormatado: string) {
    super(
      "SEM_FAIXA_APLICAVEL",
      `A obra "${obraNome}" não tem faixa de alçada que cubra o valor ${totalFormatado}. Ajuste as regras da obra ou o valor do pedido.`,
    );
  }
}

/** Duas faixas da mesma obra cobrem o mesmo valor (decisão de produto 3). */
export class FaixaSobreposta extends ErroDominio {
  constructor(mensagem: string) {
    super("FAIXA_SOBREPOSTA", mensagem);
  }
}

/** Faixa com limites impossíveis, sem aprovador, ou com aprovador/ordem repetidos. */
export class FaixaInvalida extends ErroDominio {
  constructor(mensagem: string) {
    super("FAIXA_INVALIDA", mensagem);
  }
}

/** Quem decidiu não é o aprovador do step atual, ou a cadeia já terminou (decisão 5). */
export class DecisaoForaDeOrdem extends ErroDominio {
  constructor(mensagem: string) {
    super("DECISAO_FORA_DE_ORDEM", mensagem);
  }
}

/** O step atual já tinha sido decidido quando esta decisão chegou (duas pessoas ao mesmo tempo). */
export class ConflitoDeDecisao extends ErroDominio {
  constructor(mensagem = "Este passo já foi decidido por outra pessoa. Recarregue o pedido.") {
    super("CONFLITO_DE_DECISAO", mensagem);
  }
}

/** Rejeição sem motivo (decisão de produto 4). */
export class MotivoObrigatorio extends ErroDominio {
  constructor(mensagem = "Informe o motivo da rejeição.") {
    super("MOTIVO_OBRIGATORIO", mensagem);
  }
}

/** Quantidade de item que não é um número positivo com até 3 casas decimais. */
export class QuantidadeInvalida extends ErroDominio {
  constructor(mensagem: string) {
    super("QUANTIDADE_INVALIDA", mensagem);
  }
}

/** Preço unitário que não é um valor em centavos inteiros, zero ou positivo. */
export class PrecoInvalido extends ErroDominio {
  constructor(mensagem: string) {
    super("PRECO_INVALIDO", mensagem);
  }
}

/** Total de item ou de pedido acima do que o banco guarda (Int de 32 bits). */
export class ValorExcedeLimite extends ErroDominio {
  constructor(mensagem: string) {
    super("VALOR_EXCEDE_LIMITE", mensagem);
  }
}

/** Registro que não existe (ou não pertence ao contexto esperado). `genero` só ajusta a concordância. */
export class NaoEncontrado extends ErroDominio {
  constructor(oQue: string, genero: "m" | "f" = "m") {
    super("NAO_ENCONTRADO", `${oQue} não ${genero === "f" ? "encontrada" : "encontrado"}.`);
  }
}
