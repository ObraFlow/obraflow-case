import { describe, expect, it } from "vitest";
import type { PedidoAcompanhadoCompleto } from "./tipos";
import { ultimasMovimentacoes } from "./ultimasMovimentacoes";

const JOAO = 1;
const AMANDA = 2;
const RAFAEL = 5;

function pedido(parte: Partial<PedidoAcompanhadoCompleto>): PedidoAcompanhadoCompleto {
  return {
    id: 1,
    obraId: 1,
    fornecedorId: 1,
    criadoPorId: RAFAEL,
    origemId: null,
    totalCents: 1000,
    status: "PENDENTE",
    stepAtual: 0,
    criadoEm: 100,
    aprovacoes: [{ ordem: 0, aprovadorId: JOAO, status: "PENDENTE", decididoEm: null }],
    ...parte,
  };
}

describe("ultimasMovimentacoes", () => {
  it("cadastro e decisões viram movimentações, da mais recente para a mais antiga", () => {
    const p = pedido({
      status: "REJEITADO",
      aprovacoes: [
        { ordem: 0, aprovadorId: JOAO, status: "APROVADA", decididoEm: 200 },
        { ordem: 1, aprovadorId: AMANDA, status: "REJEITADA", decididoEm: 300 },
      ],
    });
    expect(ultimasMovimentacoes([p])).toEqual([
      { tipo: "rejeitou", em: 300, pedidoId: 1, obraId: 1, usuarioId: AMANDA, totalCents: 1000 },
      { tipo: "aprovou", em: 200, pedidoId: 1, obraId: 1, usuarioId: JOAO, totalCents: 1000 },
      { tipo: "cadastrou", em: 100, pedidoId: 1, obraId: 1, usuarioId: RAFAEL, totalCents: 1000 },
    ]);
  });

  it("pedido com origem é 'refez', não 'cadastrou'", () => {
    const refeito = pedido({ id: 8, origemId: 5 });
    expect(ultimasMovimentacoes([refeito])[0].tipo).toBe("refez");
  });

  it("nível cancelado e nível pendente não geram movimentação", () => {
    const p = pedido({
      status: "REJEITADO",
      aprovacoes: [
        { ordem: 0, aprovadorId: JOAO, status: "REJEITADA", decididoEm: 200 },
        { ordem: 1, aprovadorId: AMANDA, status: "CANCELADA", decididoEm: null },
      ],
    });
    expect(ultimasMovimentacoes([p]).map((m) => m.tipo)).toEqual(["rejeitou", "cadastrou"]);
  });

  it("respeita o limite e desempata pelo pedido mais novo", () => {
    const a = pedido({ id: 1, criadoEm: 100 });
    const b = pedido({ id: 2, criadoEm: 100 });
    const c = pedido({ id: 3, criadoEm: 50 });
    const lista = ultimasMovimentacoes([a, b, c], 2);
    expect(lista.map((m) => m.pedidoId)).toEqual([2, 1]);
  });
});
