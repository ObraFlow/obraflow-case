import { describe, expect, it } from "vitest";
import { posicaoNaCadeia } from "./segregacao";

const JOAO = 1;
const AMANDA = 2;
const RAFAEL = 5;

const cadeia = [
  { ordem: 0, aprovadorId: JOAO },
  { ordem: 1, aprovadorId: AMANDA },
];

describe("posicaoNaCadeia", () => {
  it("devolve a posição de quem está na cadeia", () => {
    expect(posicaoNaCadeia(cadeia, JOAO)).toBe(0);
    expect(posicaoNaCadeia(cadeia, AMANDA)).toBe(1);
  });

  it("devolve null para quem não aprova esse pedido", () => {
    expect(posicaoNaCadeia(cadeia, RAFAEL)).toBeNull();
  });

  it("cadeia vazia nunca contém ninguém", () => {
    expect(posicaoNaCadeia([], JOAO)).toBeNull();
  });
});
