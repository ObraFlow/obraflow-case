import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { FormularioPedido } from "@/components/pedidos/formulario-pedido";
import { NaoEncontrado } from "@/domain/erros";
import type { PedidoDetalhe } from "@/lib/dto";
import { idSchema } from "@/lib/schemas/comum";
import { listarFornecedores, listarObras } from "@/server/services/cadastros";
import { obterPedido } from "@/server/services/pedidos";
import { usuarioAtualId } from "@/server/usuario-atual";

export const metadata = { title: "Novo pedido" };

/** Pedido de origem de `?refazer=`. Id inválido ou inexistente vira 404, como no detalhe. */
async function carregarOrigem(valor: string): Promise<PedidoDetalhe> {
  const id = idSchema.safeParse(valor);
  if (!id.success) notFound();
  await connection();
  try {
    return await obterPedido(id.data);
  } catch (erro) {
    if (erro instanceof NaoEncontrado) notFound();
    throw erro;
  }
}

/**
 * Novo pedido. Obras e fornecedores vêm do cache de cadastros; quem cria é o usuário do
 * cookie, lido pela action no envio e usado aqui só para o aviso de segregação no preview.
 * Com `?refazer=ID`, o formulário começa preenchido com o pedido rejeitado: a nova versão
 * passa pela alçada do zero e fica ligada à origem nos dois sentidos.
 */
export default async function NovoPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ refazer?: string }>;
}) {
  const [{ refazer }, obras, fornecedores, usuarioId] = await Promise.all([
    searchParams,
    listarObras(),
    listarFornecedores(),
    usuarioAtualId(),
  ]);
  const origem = refazer ? await carregarOrigem(refazer) : null;

  const faltaCadastro =
    obras.length === 0 ? "obra" : fornecedores.length === 0 ? "fornecedor" : null;

  // Só um pedido rejeitado e ainda sem nova versão pode ser refeito; o service recusa de
  // todo jeito, mas aqui a pessoa descobre antes de preencher.
  const origemNaoRefazivel =
    origem !== null && (origem.status !== "REJEITADO" || origem.refeitoPor !== null);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.015em] font-stretch-[112%] tabular-nums">
          {origem ? `Refazer o pedido #${origem.id}` : "Novo pedido"}
        </h1>
        <p className="text-muted-foreground">
          {origem
            ? "Ajuste o que foi apontado na rejeição. A nova versão passa pela alçada do zero."
            : "O total dos itens define a faixa de alçada e quem vai aprovar. Você verá a cadeia antes de cadastrar."}
        </p>
      </div>

      {faltaCadastro ? (
        <div className="flex flex-col items-start gap-2 rounded-sm border bg-card p-6">
          <p className="font-medium">
            {faltaCadastro === "obra"
              ? "Nenhuma obra cadastrada."
              : "Nenhum fornecedor cadastrado."}
          </p>
          <p className="text-muted-foreground">
            Um pedido precisa de obra e fornecedor, que vêm do cadastro inicial: rode{" "}
            <code>npm run db:seed</code>. As regras de alçada ficam em{" "}
            <Link href="/regras" className="font-medium underline underline-offset-4">
              Regras
            </Link>
            .
          </p>
        </div>
      ) : origem && origemNaoRefazivel ? (
        <div className="flex flex-col items-start gap-2 rounded-sm border bg-card p-6">
          <p className="font-medium">
            {origem.refeitoPor
              ? `O pedido #${origem.id} já foi refeito pelo pedido #${origem.refeitoPor.id}.`
              : `O pedido #${origem.id} não foi rejeitado, então não há o que refazer.`}
          </p>
          <p className="text-muted-foreground">
            {origem.refeitoPor ? (
              <>
                Acompanhe a nova versão em{" "}
                <Link
                  href={`/aprovacoes/${origem.refeitoPor.id}`}
                  className="font-medium underline underline-offset-4"
                >
                  pedido #{origem.refeitoPor.id}
                </Link>
                .
              </>
            ) : (
              <>
                Veja a situação dele em{" "}
                <Link
                  href={`/aprovacoes/${origem.id}`}
                  className="font-medium underline underline-offset-4"
                >
                  pedido #{origem.id}
                </Link>
                , ou{" "}
                <Link href="/pedidos/novo" className="font-medium underline underline-offset-4">
                  cadastre um pedido novo
                </Link>
                .
              </>
            )}
          </p>
        </div>
      ) : (
        <FormularioPedido
          obras={obras}
          fornecedores={fornecedores}
          usuarioAtualId={usuarioId}
          origem={origem}
        />
      )}
    </>
  );
}
