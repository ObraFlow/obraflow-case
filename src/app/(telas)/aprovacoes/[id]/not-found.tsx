import Link from "next/link";

export const metadata = { title: "Pedido não encontrado" };

/** Id que não existe (ou que não é número). Fica dentro do layout, com header e navegação. */
export default function PedidoNaoEncontrado() {
  return (
    <div className="flex flex-col items-start gap-2">
      <h1 className="text-2xl font-bold tracking-[-0.015em]">Pedido não encontrado</h1>
      <p className="text-muted-foreground">
        Não existe pedido com esse número. Ele pode ter sido removido ou o endereço está errado.
      </p>
      <Link href="/aprovacoes" className="mt-2 font-medium underline underline-offset-4">
        Voltar para aprovações
      </Link>
    </div>
  );
}
