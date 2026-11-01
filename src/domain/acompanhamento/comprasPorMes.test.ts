import { describe, expect, it } from "vitest";
import { comprasAprovadasPorMes } from "./comprasPorMes";
import type { PedidoAcompanhado } from "./tipos";

const JOAO = 1;
const AMANDA = 2;

/** Chave de mês em UTC, suficiente para o teste: o fuso é problema de quem chama. */
function chaveUtc(ms: number): string {
  const data = new Date(ms);
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MESES = ["2026-08", "2026-09", "2026-10"];

function aprovado(
  id: number,
  totalCents: number,
  criadoEm: number,
  decisoes: number[],
): PedidoAcompanhado {
  return {
    id,
    obraId: 1,
    totalCents,
    status: "APROVADO",
    stepAtual: decisoes.length,
    criadoEm,
    aprovacoes: decisoes.map((decididoEm, ordem) => ({
      ordem,
      aprovadorId: ordem === 0 ? JOAO : AMANDA,
      status: "APROVADA" as const,
      decididoEm,
    })),
  };
}

describe("comprasAprovadasPorMes", () => {
  it("conta no mês da última aprovação, não no da criação", () => {
    const criadoEmAgosto = Date.UTC(2026, 7, 28);
    const joaoAprovouEmAgosto = Date.UTC(2026, 7, 30);
    const amandaAprovouEmSetembro = Date.UTC(2026, 8, 2);
    const pedidos = [
      aprovado(1, 500, criadoEmAgosto, [joaoAprovouEmAgosto, amandaAprovouEmSetembro]),
    ];

    const serie = comprasAprovadasPorMes(pedidos, MESES, chaveUtc);
    expect(serie).toEqual([
      { mes: "2026-08", quantidade: 0, totalCents: 0 },
      { mes: "2026-09", quantidade: 1, totalCents: 500 },
      { mes: "2026-10", quantidade: 0, totalCents: 0 },
    ]);
  });

  it("pendente e rejeitado não entram", () => {
    const pendente: PedidoAcompanhado = {
      ...aprovado(2, 100, Date.UTC(2026, 9, 1), []),
      status: "PENDENTE",
      aprovacoes: [{ ordem: 0, aprovadorId: JOAO, status: "PENDENTE", decididoEm: null }],
    };
    const rejeitado: PedidoAcompanhado = {
      ...aprovado(3, 100, Date.UTC(2026, 9, 1), [Date.UTC(2026, 9, 2)]),
      status: "REJEITADO",
      aprovacoes: [
        { ordem: 0, aprovadorId: JOAO, status: "REJEITADA", decididoEm: Date.UTC(2026, 9, 2) },
      ],
    };
    const serie = comprasAprovadasPorMes([pendente, rejeitado], MESES, chaveUtc);
    expect(serie.every((mes) => mes.quantidade === 0)).toBe(true);
  });

  it("soma vários pedidos do mesmo mês e mantém a ordem recebida", () => {
    const pedidos = [
      aprovado(1, 300, Date.UTC(2026, 9, 1), [Date.UTC(2026, 9, 3)]),
      aprovado(2, 700, Date.UTC(2026, 9, 5), [Date.UTC(2026, 9, 6)]),
      aprovado(3, 50, Date.UTC(2026, 7, 5), [Date.UTC(2026, 7, 6)]),
    ];
    const serie = comprasAprovadasPorMes(pedidos, ["2026-10", "2026-08"], chaveUtc);
    expect(serie.map((mes) => mes.mes)).toEqual(["2026-10", "2026-08"]);
    expect(serie[0]).toEqual({ mes: "2026-10", quantidade: 2, totalCents: 1000 });
    expect(serie[1]).toEqual({ mes: "2026-08", quantidade: 1, totalCents: 50 });
  });

  it("aprovação fora da janela é ignorada", () => {
    const antigo = aprovado(1, 999, Date.UTC(2025, 0, 1), [Date.UTC(2025, 0, 2)]);
    const serie = comprasAprovadasPorMes([antigo], MESES, chaveUtc);
    expect(serie.every((mes) => mes.totalCents === 0)).toBe(true);
  });
});
