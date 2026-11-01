import type { FaixaAlcada } from "./tipos";

/**
 * Encontra a faixa de alçada que cobre um valor.
 *
 * Uma faixa cobre o valor quando `minCents <= total` e (`maxCents` é null ou `total <= maxCents`).
 * Os dois limites são inclusivos; `maxCents` null é a faixa aberta ("acima de").
 *
 * Devolve null quando nenhuma faixa cobre o valor. Quem chama decide o que fazer:
 * o service de criação de pedido lança `SemFaixaAplicavel` (decisão de produto 2);
 * o preview da tela de novo pedido só mostra "sem faixa para esse valor".
 *
 * Assume que as faixas não se sobrepõem (garantido por `validarFaixas` ao salvar).
 */
export function resolverRegra(faixas: FaixaAlcada[], totalCents: number): FaixaAlcada | null {
  for (const faixa of faixas) {
    const acimaDoMinimo = totalCents >= faixa.minCents;
    const abaixoDoTeto = faixa.maxCents === null || totalCents <= faixa.maxCents;
    if (acimaDoMinimo && abaixoDoTeto) {
      return faixa;
    }
  }
  return null;
}
