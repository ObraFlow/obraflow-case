"use client";

import { useLinkStatus } from "next/link";

/**
 * Filho de um <Link> que marca `data-pendente` enquanto a navegação daquele link ainda não
 * terminou (`useLinkStatus`, Next 16). O link estiliza a si mesmo com a variante
 * `has-[[data-pendente]]:` do Tailwind: um filho não consegue mudar o pai, mas o pai consegue
 * reagir ao filho com `:has()`. Fica escondido: só existe para carregar o atributo.
 * Serve às abas e à paginação da lista de pedidos, onde o clique demora o tempo da consulta.
 */
export function MarcadorPendente() {
  const { pending } = useLinkStatus();
  return <span hidden data-pendente={pending ? "" : undefined} />;
}

/** Classes que o <Link> aplica a si mesmo enquanto o filho está pendente. */
export const CLASSE_LINK_PENDENTE =
  "transition-opacity duration-150 has-[[data-pendente]]:cursor-progress has-[[data-pendente]]:opacity-60";
