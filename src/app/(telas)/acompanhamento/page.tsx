import Link from "next/link";
import { connection } from "next/server";
import { FilaAprovadores } from "@/components/acompanhamento/fila-aprovadores";
import { ResumoPorObra } from "@/components/acompanhamento/resumo-por-obra";
import { TemposDecisao } from "@/components/acompanhamento/tempos-decisao";
import { obterAcompanhamento } from "@/server/services/acompanhamento";
import { usuarioAtualId } from "@/server/usuario-atual";

export const metadata = { title: "Acompanhamento — ObraFlow" };

/**
 * Onde os pedidos estão e com quem: a pergunta de quem gerencia, não de quem aprova.
 * Tudo vem de `obterAcompanhamento` (uma leitura, sem cache: muda a cada decisão).
 * Sem obra com pedido, a tela inteira é o estado vazio.
 */
export default async function AcompanhamentoPage() {
  const usuarioId = await usuarioAtualId();
  await connection();
  const dados = await obterAcompanhamento();

  const semPedidos = dados.porObra.every(
    (obra) =>
      obra.pendentes.quantidade + obra.aprovados.quantidade + obra.rejeitados.quantidade === 0,
  );

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.015em]">Acompanhamento</h1>
        <p className="text-muted-foreground">Onde o dinheiro está parado e com quem.</p>
      </div>

      {semPedidos ? (
        <div className="flex flex-col items-start gap-2 rounded-sm border bg-card p-6">
          <p className="font-medium">Nenhum pedido cadastrado.</p>
          <Link href="/pedidos/novo" className="font-medium underline underline-offset-4">
            Criar o primeiro pedido
          </Link>
        </div>
      ) : (
        <>
          <ResumoPorObra porObra={dados.porObra} />
          <div className="grid gap-5 lg:grid-cols-2">
            <FilaAprovadores
              fila={dados.fila}
              usuarioAtualId={usuarioId}
              geradoEm={dados.geradoEm}
            />
            <TemposDecisao porAprovador={dados.temposPorAprovador} porObra={dados.temposPorObra} />
          </div>
        </>
      )}
    </>
  );
}
