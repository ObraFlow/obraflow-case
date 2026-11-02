import { describe, expect, it } from "vitest";
import { criarPedido } from "./pedidos";

// um pedido certinho, que cada teste estraga de um jeito diferente
const pedidoValido = {
  idObra: 1,
  idFornecedor: 1,
  dataPedido: "2026-10-27",
  itens: [{ descricao: "Cimento CP-II 50kg", quantidade: 10, unidade: "un", precoUnitarioCentavos: 4000 }],
};

// atalho pra mudar só um campo do item, sem repetir o pedido inteiro em cada teste
const comItem = (mudanca: Partial<(typeof pedidoValido.itens)[0]>) => ({
  ...pedidoValido,
  itens: [{ ...pedidoValido.itens[0], ...mudanca }],
});

// aqui eu quero provar que o back barra o pedido errado, mesmo que alguém pule a validação da tela.
// "rejects.toThrow" quer dizer: espero que dê erro, com essa mensagem
describe("criarPedido recusa dados inválidos", () => {
  it("pedido sem itens", async () => {
    await expect(criarPedido({ ...pedidoValido, itens: [] })).rejects.toThrow("pelo menos um item");
  });

  it("pedido sem obra", async () => {
    await expect(criarPedido({ ...pedidoValido, idObra: NaN })).rejects.toThrow("Selecione a obra");
  });

  it("data do pedido em formato errado", async () => {
    await expect(criarPedido({ ...pedidoValido, dataPedido: "27/10/2026" })).rejects.toThrow("data do pedido");
  });

  it("item sem descrição", async () => {
    await expect(criarPedido(comItem({ descricao: "   " }))).rejects.toThrow("descrição");
  });

  it("quantidade zero ou negativa", async () => {
    await expect(criarPedido(comItem({ quantidade: 0 }))).rejects.toThrow("maior que zero");
    await expect(criarPedido(comItem({ quantidade: -5 }))).rejects.toThrow("maior que zero");
  });

  it("preço negativo", async () => {
    await expect(criarPedido(comItem({ precoUnitarioCentavos: -100 }))).rejects.toThrow("não pode ser negativo");
  });

  it("unidade fora da lista", async () => {
    await expect(criarPedido(comItem({ unidade: "litro" }))).rejects.toThrow("Unidade inválida");
  });
});