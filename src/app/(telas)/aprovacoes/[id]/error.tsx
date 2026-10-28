"use client";

import { ErroDeRota } from "@/components/layout/erro-de-rota";

export default function PedidoError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErroDeRota error={error} retry={retry} titulo="Não foi possível carregar o pedido" />;
}
