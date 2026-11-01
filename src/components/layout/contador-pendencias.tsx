import { connection } from "next/server";
import { rotuloPendencias } from "@/lib/pendencias";
import { listarPendentesPara } from "@/server/services/pedidos";
import { usuarioAtualId } from "@/server/usuario-atual";

/**
 * Quantos pedidos aguardam a decisão do usuário atual. Só aparece quando há algum:
 * o amarelo é reservado a "é a sua vez" (docs/design.md). Lê cookie e banco, então
 * quem renderiza precisa envolver em <Suspense>.
 *
 * `connection()`: com Partial Prefetching o cookie entra no App Shell, e o que vem
 * depois dele ainda é "prerender". Pedidos mudam a cada decisão e não são cacheados,
 * então a consulta só pode rodar na request de verdade (o `pg` usa crypto ao abrir
 * conexão, o que o prerender rejeita).
 */
export async function ContadorPendencias() {
  const usuarioId = await usuarioAtualId();
  if (usuarioId === null) return null;

  await connection();
  const pendentes = await listarPendentesPara(usuarioId);
  if (pendentes.length === 0) return null;

  const rotulo = rotuloPendencias(pendentes.length);

  return (
    <span
      title={rotulo}
      className="rounded-sm bg-sinalizacao px-1.5 text-[11px] leading-[18px] font-bold text-sinalizacao-foreground tabular-nums"
    >
      <span aria-hidden="true">{pendentes.length}</span>
      <span className="sr-only">{rotulo}</span>
    </span>
  );
}
