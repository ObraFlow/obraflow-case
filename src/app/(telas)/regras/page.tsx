import { connection } from "next/server";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { BotaoNovaFaixa } from "@/components/regras/botao-nova-faixa";
import { SeletorObra } from "@/components/layout/seletor-obra";
import { SimuladorAlcada } from "@/components/regras/simulador-alcada";
import { TabelaFaixas } from "@/components/regras/tabela-faixas";
import { encontrarLacunas } from "@/domain/alcada/encontrarLacunas";
import { listarObras, listarUsuarios } from "@/server/services/cadastros";
import { listarRegras } from "@/server/services/regras";

export const metadata = { title: "Regras de alçada" };

/**
 * Regras de alçada por obra. A obra vem da URL (`?obra=1`); sem ela, a primeira.
 * Cadastros vêm do cache; as faixas são lidas na request (`connection()`, ver CLAUDE.md).
 */
export default async function RegrasPage({
  searchParams,
}: {
  searchParams: Promise<{ obra?: string }>;
}) {
  const [obras, usuarios, { obra }] = await Promise.all([
    listarObras(),
    listarUsuarios(),
    searchParams,
  ]);

  if (obras.length === 0) {
    return (
      <>
        <h1 className="text-2xl font-bold tracking-[-0.015em] font-stretch-[112%]">
          Regras de alçada
        </h1>
        <div className="rounded-sm border bg-card p-6">
          <p className="font-medium">Nenhuma obra cadastrada.</p>
          <p className="text-muted-foreground">
            As faixas de alçada são por obra. Obras vêm do cadastro inicial: rode{" "}
            <code>npm run db:seed</code> para começar.
          </p>
        </div>
      </>
    );
  }

  const obraEscolhida = obras.find((candidata) => String(candidata.id) === obra) ?? obras[0];

  await connection();
  const faixas = await listarRegras(obraEscolhida.id);
  const lacunas = encontrarLacunas(faixas).length;

  return (
    <>
      <CabecalhoPagina
        titulo="Regras de alçada"
        descricao="Faixas de valor da obra e quem aprova em cada uma. Compras maiores passam por quem aprova as menores e ainda pelos aprovadores da própria faixa."
        destaque={
          faixas.length > 0
            ? {
                valor: String(faixas.length),
                rotulo: `${faixas.length === 1 ? "faixa" : "faixas"}, ${
                  lacunas === 0 ? "sem lacunas" : lacunas === 1 ? "1 lacuna" : `${lacunas} lacunas`
                }`,
              }
            : undefined
        }
        acoes={
          <div className="flex flex-wrap items-center gap-3">
            <SeletorObra obras={obras} obraId={obraEscolhida.id} rota="/regras" />
            {faixas.length > 0 && (
              <BotaoNovaFaixa obraId={obraEscolhida.id} faixas={faixas} usuarios={usuarios} />
            )}
          </div>
        }
      />

      <TabelaFaixas faixas={faixas} usuarios={usuarios} obraId={obraEscolhida.id} />

      {/* A key inclui as faixas: ao salvar uma, o simulador remonta e não mostra resposta velha. */}
      <SimuladorAlcada
        key={`${obraEscolhida.id}:${faixas.map((f) => `${f.id}-${f.minCents}-${f.maxCents}`).join(",")}`}
        obraId={obraEscolhida.id}
      />
    </>
  );
}
