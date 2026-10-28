import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-2 px-4 py-10 sm:px-8">
      <h1 className="text-2xl font-bold tracking-[-0.015em]">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço não existe ou o pedido foi removido.</p>
      <Link href="/aprovacoes" className="mt-2 w-fit font-medium underline underline-offset-4">
        Ir para as aprovações
      </Link>
    </main>
  );
}
