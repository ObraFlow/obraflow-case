/** Intervalo de valores de uma obra que nenhuma faixa cobre. `ateCents` null = sem teto. */
export type Lacuna = {
  deCents: number;
  ateCents: number | null;
};

/**
 * Lista os buracos entre as faixas de uma obra (decisão de produto 2: valor sem faixa
 * bloqueia o pedido; aqui só tornamos isso visível na tela de regras).
 *
 * Recebe faixas já validadas (sem sobreposição) em qualquer ordem. Considera o buraco
 * antes da primeira faixa (se ela não começa em zero), entre faixas consecutivas e
 * depois da última (se ela tem teto). Sem faixas, não há o que listar: a tela trata
 * o caso vazio separadamente.
 */
export function encontrarLacunas(
  faixas: ReadonlyArray<{ minCents: number; maxCents: number | null }>,
): Lacuna[] {
  if (faixas.length === 0) return [];

  const ordenadas = [...faixas].sort((a, b) => a.minCents - b.minCents);
  const lacunas: Lacuna[] = [];

  if (ordenadas[0].minCents > 0) {
    lacunas.push({ deCents: 0, ateCents: ordenadas[0].minCents - 1 });
  }

  for (let i = 1; i < ordenadas.length; i++) {
    const anterior = ordenadas[i - 1];
    const atual = ordenadas[i];
    if (anterior.maxCents !== null && anterior.maxCents + 1 < atual.minCents) {
      lacunas.push({ deCents: anterior.maxCents + 1, ateCents: atual.minCents - 1 });
    }
  }

  const ultima = ordenadas[ordenadas.length - 1];
  if (ultima.maxCents !== null) {
    lacunas.push({ deCents: ultima.maxCents + 1, ateCents: null });
  }

  return lacunas;
}
