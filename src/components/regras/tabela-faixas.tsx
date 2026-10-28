import { CadeiaAlcada } from "@/components/alcada/cadeia-alcada";
import { AcoesFaixa } from "@/components/regras/acoes-faixa";
import { BotaoNovaFaixa } from "@/components/regras/botao-nova-faixa";
import { encontrarLacunas, type Lacuna } from "@/domain/alcada/encontrarLacunas";
import { cadeiaAcumulada } from "@/lib/cadeia";
import type { RegraDto, UsuarioDto } from "@/lib/dto";
import { formatarCentavos, formatarFaixa } from "@/lib/money";

function descreverLacuna(lacuna: Lacuna): string {
  if (lacuna.ateCents === null) {
    return `Sem regra acima de ${formatarCentavos(lacuna.deCents - 1)}.`;
  }
  if (lacuna.deCents === 0) {
    return `Sem regra até ${formatarCentavos(lacuna.ateCents)}.`;
  }
  return `Sem regra entre ${formatarCentavos(lacuna.deCents)} e ${formatarCentavos(lacuna.ateCents)}.`;
}

type Linha = { tipo: "faixa"; faixa: RegraDto } | { tipo: "lacuna"; lacuna: Lacuna };

/** Intercala faixas e lacunas pelo valor em que cada uma começa. */
function montarLinhas(faixas: RegraDto[]): Linha[] {
  const lacunas = encontrarLacunas(faixas);
  const tudo: Array<{ inicio: number; linha: Linha }> = [
    ...faixas.map((faixa) => ({
      inicio: faixa.minCents,
      linha: { tipo: "faixa", faixa } as Linha,
    })),
    ...lacunas.map((lacuna) => ({
      inicio: lacuna.deCents,
      linha: { tipo: "lacuna", lacuna } as Linha,
    })),
  ];
  tudo.sort((a, b) => a.inicio - b.inicio);
  return tudo.map((item) => item.linha);
}

/** Cadeia efetiva da faixa: herdados das faixas abaixo (cinza) e os próprios. */
function cadeiaDe(faixas: RegraDto[], faixa: RegraDto) {
  return cadeiaAcumulada(faixas, faixa).map((nivel) => ({
    nome: nivel.usuarioNome,
    estado: nivel.herdado ? ("herdado" as const) : ("proximo" as const),
  }));
}

/**
 * Faixas da obra (RSC). No desktop é tabela; no celular cada faixa vira um bloco empilhado
 * (valor, cadeia, ações), para as ações não ficarem fora da tela. As lacunas aparecem entre
 * as faixas em fundo neutro, com um botão que abre o dialog já preenchido com o buraco:
 * amarelo é só "é a sua vez" (docs/design.md).
 */
export function TabelaFaixas({
  faixas,
  usuarios,
  obraId,
}: {
  faixas: RegraDto[];
  usuarios: UsuarioDto[];
  obraId: number;
}) {
  if (faixas.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-sm border bg-card p-6">
        <p className="font-medium">Nenhuma faixa de alçada para esta obra.</p>
        <p className="text-muted-foreground">
          Enquanto não houver faixa, todo pedido desta obra será bloqueado na criação.
        </p>
        <BotaoNovaFaixa
          obraId={obraId}
          faixas={faixas}
          usuarios={usuarios}
          rotulo="Criar primeira faixa"
        />
      </div>
    );
  }

  const linhas = montarLinhas(faixas);

  const blocoLacuna = (lacuna: Lacuna) => (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-muted px-3 py-2.5 text-sm">
      <p>
        {descreverLacuna(lacuna)}{" "}
        <span className="text-muted-foreground">Pedidos nesse valor serão bloqueados.</span>
      </p>
      <BotaoNovaFaixa
        obraId={obraId}
        faixas={faixas}
        usuarios={usuarios}
        rotulo="Criar faixa para esse intervalo"
        variante="outline"
        sugestao={{ minCents: lacuna.deCents, maxCents: lacuna.ateCents }}
      />
    </div>
  );

  return (
    <>
      {/* Celular: blocos empilhados. */}
      <div className="flex flex-col divide-y divide-linha rounded-sm border bg-card md:hidden">
        {linhas.map((linha) =>
          linha.tipo === "faixa" ? (
            <div key={`faixa-${linha.faixa.id}`} className="flex flex-col gap-2 px-3 py-3">
              <p className="font-medium tabular-nums">
                {formatarFaixa(linha.faixa.minCents, linha.faixa.maxCents)}
              </p>
              <CadeiaAlcada niveis={cadeiaDe(faixas, linha.faixa)} />
              <AcoesFaixa faixa={linha.faixa} faixas={faixas} usuarios={usuarios} />
            </div>
          ) : (
            <div key={`lacuna-${linha.lacuna.deCents}`}>{blocoLacuna(linha.lacuna)}</div>
          ),
        )}
      </div>

      {/* Desktop: tabela. `relative` segura os textos sr-only dentro do container com rolagem. */}
      <div className="relative hidden overflow-x-auto rounded-sm border bg-card md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-foreground text-left text-xs font-semibold text-muted-foreground">
              <th className="px-3 py-2.5 whitespace-nowrap">Faixa</th>
              <th className="px-3 py-2.5">Quem aprova, nesta ordem (inclui as faixas abaixo)</th>
              <th className="px-3 py-2.5" aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) =>
              linha.tipo === "faixa" ? (
                <tr
                  key={`faixa-${linha.faixa.id}`}
                  className="border-b border-linha last:border-b-0"
                >
                  <td className="px-3 py-3 font-medium whitespace-nowrap tabular-nums">
                    {formatarFaixa(linha.faixa.minCents, linha.faixa.maxCents)}
                  </td>
                  <td className="px-3 py-3">
                    <CadeiaAlcada niveis={cadeiaDe(faixas, linha.faixa)} />
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <AcoesFaixa faixa={linha.faixa} faixas={faixas} usuarios={usuarios} />
                  </td>
                </tr>
              ) : (
                <tr
                  key={`lacuna-${linha.lacuna.deCents}`}
                  className="border-b border-linha last:border-b-0"
                >
                  <td colSpan={3} className="p-0">
                    {blocoLacuna(linha.lacuna)}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
