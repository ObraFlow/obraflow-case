import { FaixaInvalida, FaixaSobreposta } from "../erros";
import type { NivelAlcada } from "./tipos";

/** O que precisa ser conhecido de uma faixa para validar limites, níveis e sobreposição. */
export type FaixaParaValidar = {
  id: number | null;
  minCents: number;
  maxCents: number | null;
  /** `nome` é opcional e só serve para a mensagem de aprovador repetido entre faixas. */
  niveis: Array<NivelAlcada & { nome?: string }>;
  /** Texto já formatado para citar a faixa em mensagens ("R$ 0,00 a R$ 10.000,00"). Opcional. */
  rotulo?: string;
};

/**
 * Valida uma faixa isolada: limites possíveis, pelo menos um aprovador,
 * sem aprovador repetido e sem duas posições com a mesma ordem.
 * Lança `FaixaInvalida` com a mensagem para o usuário.
 */
export function validarLimites(faixa: FaixaParaValidar): void {
  if (!Number.isInteger(faixa.minCents) || faixa.minCents < 0) {
    throw new FaixaInvalida("O valor mínimo da faixa deve ser zero ou positivo.");
  }
  if (faixa.maxCents !== null) {
    if (!Number.isInteger(faixa.maxCents) || faixa.maxCents < faixa.minCents) {
      throw new FaixaInvalida("O valor máximo da faixa deve ser maior ou igual ao mínimo.");
    }
  }
  if (faixa.niveis.length === 0) {
    throw new FaixaInvalida("A faixa precisa de pelo menos um aprovador.");
  }

  const usuarios = new Set<number>();
  const ordens = new Set<number>();
  for (const nivel of faixa.niveis) {
    if (usuarios.has(nivel.usuarioId)) {
      throw new FaixaInvalida("O mesmo aprovador não pode aparecer duas vezes na faixa.");
    }
    if (ordens.has(nivel.ordem)) {
      throw new FaixaInvalida(
        "Dois aprovadores estão na mesma posição da faixa. Reordene os níveis.",
      );
    }
    usuarios.add(nivel.usuarioId);
    ordens.add(nivel.ordem);
  }
}

/**
 * Valida as faixas de UMA obra em conjunto: sem sobreposição (decisão de produto 3) e
 * sem a mesma pessoa em duas faixas (decisão 1: a cadeia acumula as faixas de baixo,
 * então alguém repetido aprovaria duas vezes o mesmo pedido).
 *
 * Recebe todas as faixas da obra, já incluindo a que está sendo criada ou editada
 * (a editada substitui a versão antiga, casada pelo `id`). Lança `FaixaSobreposta`
 * se dois intervalos cobrirem algum valor em comum e `FaixaInvalida` se um aprovador
 * aparecer em duas faixas. Buracos entre faixas são permitidos: valor sem faixa é
 * tratado na criação do pedido (decisão 2), não aqui.
 */
export function validarFaixas(faixas: FaixaParaValidar[]): void {
  for (const faixa of faixas) {
    validarLimites(faixa);
  }

  // Ordenadas pelo mínimo, basta comparar cada faixa com a seguinte.
  const ordenadas = [...faixas].sort((a, b) => a.minCents - b.minCents);

  for (let i = 1; i < ordenadas.length; i++) {
    const anterior = ordenadas[i - 1];
    const atual = ordenadas[i];
    // A anterior é aberta (sem teto) ou o teto dela alcança o mínimo da atual.
    const sobrepoe = anterior.maxCents === null || anterior.maxCents >= atual.minCents;
    if (sobrepoe) {
      // A faixa "nova" (sem id, ou a editada) é a que o usuário está mexendo; cita-se a outra.
      const outra = atual.id === null ? anterior : atual.id === anterior.id ? atual : anterior;
      const referencia = outra.rotulo
        ? ` à faixa ${outra.rotulo}`
        : " a outra faixa já cadastrada para a obra";
      throw new FaixaSobreposta(`Esta faixa se sobrepõe${referencia}. Ajuste os limites de valor.`);
    }
  }

  // Depois da sobreposição: o erro de limites é o mais fundamental e aparece primeiro.
  validarAprovadorUnicoEntreFaixas(faixas);
}

/** Cada pessoa aparece em no máximo uma faixa da obra. Cita a faixa já cadastrada (com rótulo). */
function validarAprovadorUnicoEntreFaixas(faixas: FaixaParaValidar[]): void {
  for (let i = 0; i < faixas.length; i++) {
    for (let j = i + 1; j < faixas.length; j++) {
      const a = faixas[i];
      const b = faixas[j];
      const idsDeB = new Set(b.niveis.map((nivel) => nivel.usuarioId));
      const repetido = a.niveis.find((nivel) => idsDeB.has(nivel.usuarioId));
      if (!repetido) continue;

      // A faixa em edição é a que não tem rótulo (o service rotula só as outras).
      const outra = a.rotulo ? a : b;
      const quem =
        repetido.nome ??
        b.niveis.find((nivel) => nivel.usuarioId === repetido.usuarioId)?.nome ??
        "Este aprovador";
      const onde = outra.rotulo ? ` pela faixa ${outra.rotulo}` : " por outra faixa desta obra";
      throw new FaixaInvalida(
        `${quem} já aprova${onde}. Na cadeia acumulada cada pessoa decide uma vez; remova de uma das faixas.`,
      );
    }
  }
}
