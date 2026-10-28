import { describe, expect, it } from "vitest";
import { ConflitoDeDecisao, ErroDominio, NaoEncontrado, SemFaixaAplicavel } from "./erros";

describe("erros de domínio", () => {
  it("toda subclasse é um ErroDominio e um Error, com codigo e name próprios", () => {
    const erro = new ConflitoDeDecisao();
    expect(erro).toBeInstanceOf(ErroDominio);
    expect(erro).toBeInstanceOf(Error);
    expect(erro.codigo).toBe("CONFLITO_DE_DECISAO");
    expect(erro.name).toBe("ConflitoDeDecisao");
  });

  it("SemFaixaAplicavel sempre cita obra e valor (decisão de produto 2)", () => {
    const erro = new SemFaixaAplicavel("Residencial Jardim das Acácias", "R$ 35.000,00");
    expect(erro.message).toContain("Residencial Jardim das Acácias");
    expect(erro.message).toContain("R$ 35.000,00");
    expect(erro.codigo).toBe("SEM_FAIXA_APLICAVEL");
  });

  it("NaoEncontrado monta a mensagem a partir do que faltou", () => {
    expect(new NaoEncontrado("Pedido").message).toBe("Pedido não encontrado.");
  });
});
