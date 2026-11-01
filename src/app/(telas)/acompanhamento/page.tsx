import Link from "next/link";
import { connection } from "next/server";
import { ComprasPorMes } from "@/components/acompanhamento/compras-por-mes";
import { Comprometido } from "@/components/acompanhamento/comprometido";
import { FilaAprovadores } from "@/components/acompanhamento/fila-aprovadores";
import { FornecedoresMaisComprados } from "@/components/acompanhamento/fornecedores-mais-comprados";
import { OrcamentoDasObras } from "@/components/acompanhamento/orcamento-das-obras";
import { TemposDecisao } from "@/components/acompanhamento/tempos-decisao";
import { UltimasMovimentacoes } from "@/components/acompanhamento/ultimas-movimentacoes";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { SeletorObra } from "@/components/layout/seletor-obra";
import { resumoOrcamento } from "@/domain/orcamento/resumoOrcamento";
import type { OrcamentoObraDto, ResumoObraDto } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";
import { idSchema } from "@/lib/schemas/comum";
import { obterAcompanhamento } from "@/server/services/acompanhamento";
import { listarObras } from "@/server/services/cadastros";
import { usuarioAtualId } from "@/server/usuario-atual";

export const metadata = { title: "Acompanhamento" };

/** Sem filtro, o orçamento comprometido é a soma das obras que têm orçamento. */
function orcamentoConsolidado(porObra: ResumoObraDto[]): OrcamentoObraDto {
  const comOrcamento = porObra.filter((obra) => obra.orcamento.orcamentoCents > 0);
  const soma = (campo: "orcamentoCents" | "aprovadoCents" | "pendenteCents") =>
    comOrcamento.reduce((total, obra) => total + obra.orcamento[campo], 0);
  return resumoOrcamento({
    orcamentoCents: soma("orcamentoCents"),
    aprovadoCents: soma("aprovadoCents"),
    pendenteCents: soma("pendenteCents"),
  });
}

/**
 * Orçamento, compras e onde o dinheiro está parado: a pergunta de quem gerencia, não de
 * quem aprova. Tudo vem de `obterAcompanhamento` (uma leitura, sem cache: muda a cada
 * decisão). `?obra=` recorta tudo menos o bloco de comparação entre obras.
 */
export default async function AcompanhamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ obra?: string }>;
}) {
  const [{ obra }, usuarioId, obras] = await Promise.all([
    searchParams,
    usuarioAtualId(),
    listarObras(),
  ]);
  const obraLida = idSchema.safeParse(obra);
  const obraId =
    obraLida.success && obras.some((o) => o.id === obraLida.data) ? obraLida.data : null;

  await connection();
  const dados = await obterAcompanhamento({ obraId: obraId ?? undefined });

  const pedidosDe = (resumo: ResumoObraDto) =>
    resumo.pendentes.quantidade + resumo.aprovados.quantidade + resumo.rejeitados.quantidade;
  const semPedidos = dados.porObra.every((resumo) => pedidosDe(resumo) === 0);
  const obraSelecionada = dados.obraSelecionada;
  const resumoDaObra = obraSelecionada
    ? dados.porObra.find((resumo) => resumo.obraId === obraSelecionada.id)
    : undefined;
  const obraSemPedidos = resumoDaObra !== undefined && pedidosDe(resumoDaObra) === 0;

  const paradoCents = dados.fila.reduce((soma, fila) => soma + fila.totalCents, 0);
  const paradoPedidos = dados.fila.reduce((soma, fila) => soma + fila.quantidade, 0);

  const orcamento = resumoDaObra ? resumoDaObra.orcamento : orcamentoConsolidado(dados.porObra);
  const obrasComOrcamento = dados.porObra.filter((r) => r.orcamento.orcamentoCents > 0).length;
  const tituloComprometido = obraSelecionada
    ? obraSelecionada.nome
    : obrasComOrcamento === dados.porObra.length
      ? "Todas as obras somadas."
      : `Soma das ${obrasComOrcamento} obras com orçamento cadastrado.`;

  return (
    <>
      <CabecalhoPagina
        titulo="Acompanhamento"
        descricao="Orçamento, compras aprovadas e onde o dinheiro está parado."
        destaque={
          semPedidos
            ? undefined
            : {
                valor: formatarCentavos(paradoCents),
                rotulo:
                  paradoPedidos === 0
                    ? "nada parado"
                    : paradoPedidos === 1
                      ? "parado em 1 pedido"
                      : `parados em ${paradoPedidos} pedidos`,
              }
        }
        acoes={
          semPedidos ? undefined : (
            <SeletorObra obras={obras} obraId={obraId} rota="/acompanhamento" permiteTodas />
          )
        }
      />

      {semPedidos ? (
        <div className="flex flex-col items-start gap-2 rounded-sm border bg-card p-6">
          <p className="font-medium">Nenhum pedido cadastrado.</p>
          <Link href="/pedidos/novo" className="font-medium underline underline-offset-4">
            Criar o primeiro pedido
          </Link>
        </div>
      ) : obraSemPedidos ? (
        <div className="flex flex-col items-start gap-2 rounded-sm border bg-card p-6">
          <p className="font-medium">Nenhum pedido na obra {obraSelecionada?.nome}.</p>
          <Link href="/acompanhamento" className="font-medium underline underline-offset-4">
            Ver todas as obras
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <OrcamentoDasObras porObra={dados.porObra} obraSelecionadaId={obraId} />
          </div>
          <div className="lg:col-span-5">
            <Comprometido orcamento={orcamento} titulo={tituloComprometido} />
          </div>
          <div className="lg:col-span-7">
            <ComprasPorMes comprasPorMes={dados.comprasPorMes} />
          </div>
          <div className="lg:col-span-5">
            <FornecedoresMaisComprados fornecedores={dados.fornecedores} />
          </div>
          <div className="lg:col-span-6">
            <FilaAprovadores
              fila={dados.fila}
              usuarioAtualId={usuarioId}
              geradoEm={dados.geradoEm}
            />
          </div>
          <div className="lg:col-span-6">
            <TemposDecisao porAprovador={dados.temposPorAprovador} porObra={dados.temposPorObra} />
          </div>
          <div className="lg:col-span-12">
            <UltimasMovimentacoes movimentacoes={dados.movimentacoes} geradoEm={dados.geradoEm} />
          </div>
        </div>
      )}
    </>
  );
}
