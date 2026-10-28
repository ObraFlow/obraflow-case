import Link from "next/link";
import { FormularioPedido } from "@/components/pedidos/formulario-pedido";
import { listarFornecedores, listarObras } from "@/server/services/cadastros";

/**
 * Novo pedido. Obras e fornecedores vêm do cache de cadastros; quem cria é o usuário do
 * cookie, lido pela action no envio. Sem obra ou fornecedor, não há como criar pedido.
 */
export default async function NovoPedidoPage() {
  const [obras, fornecedores] = await Promise.all([listarObras(), listarFornecedores()]);

  const faltaCadastro =
    obras.length === 0 ? "obra" : fornecedores.length === 0 ? "fornecedor" : null;

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.015em]">Novo pedido</h1>
        <p className="text-muted-foreground">
          O total dos itens define a faixa de alçada e quem vai aprovar. Você verá a cadeia antes de
          cadastrar.
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
            Um pedido precisa de obra e fornecedor. Cadastre pela API (
            <code>POST /api/{faltaCadastro === "obra" ? "obras" : "fornecedores"}</code>) ou rode o
            seed. As regras de alçada ficam em{" "}
            <Link href="/regras" className="font-medium underline underline-offset-4">
              Regras
            </Link>
            .
          </p>
        </div>
      ) : (
        <FormularioPedido obras={obras} fornecedores={fornecedores} />
      )}
    </>
  );
}
