import type { Etapa } from "../tipos";

const ICONE = { aprovada: "✓", rejeitada: "✕", atual: "●", proxima: "○", cancelada: "–" };

const DESCRICAO = {
  aprovada: "aprovou",
  rejeitada: "rejeitou",
  atual: "é a vez de decidir",
  proxima: "próxima etapa",
  cancelada: "não chegou a decidir",
};

function situacaoDaEtapa(etapa: Etapa, etapaAtual: number | null) {
  if (etapa.status === "APROVADO") return "aprovada";
  if (etapa.status === "REJEITADO") return "rejeitada";
  if (etapa.ordem === etapaAtual) return "atual";
  // pedido encerrado e essa pessoa não decidiu: o fluxo parou antes dela
  if (etapaAtual === null) return "cancelada";
  return "proxima";
}

// mostra a fila de aprovação: quem já decidiu, de quem é a vez e quem vem depois
export default function CadeiaAlcada({ etapas, etapaAtual }: { etapas: Etapa[]; etapaAtual: number | null }) {
  return (
    <ol className="cadeia">
      {etapas.map((etapa) => {
        const situacao = situacaoDaEtapa(etapa, etapaAtual);
        return (
          <li key={etapa.idEtapaAprovacao}>
            <span className={`etapa etapa-${situacao}`} title={`${etapa.usuario.nome}: ${DESCRICAO[situacao]}`}>
              {ICONE[situacao]} {etapa.usuario.nome}
            </span>
          </li>
        );
      })}
    </ol>
  );
}