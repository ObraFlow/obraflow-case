"use client";

import Link from "next/link";
import { CadeiaAlcada } from "@/components/alcada/cadeia-alcada";
import type { EstadoPreview } from "@/components/pedidos/use-preview-alcada";
import { Button } from "@/components/ui/button";
import { formatarCentavos, formatarFaixa } from "@/lib/money";

/** Bloco abaixo do total: qual faixa e cadeia o pedido vai seguir, ou por que será bloqueado. */
export function PreviewAlcada({
  preview,
  obraId,
  tentarDeNovo,
}: {
  preview: EstadoPreview;
  obraId: number | null;
  tentarDeNovo: () => void;
}) {
  return (
    <div aria-live="polite" className="flex min-h-10 flex-col gap-2 text-sm">
      {preview.estado === "aguardando" && (
        <p className="text-muted-foreground">
          {obraId === null
            ? "Escolha a obra e preencha os itens para ver quem vai aprovar."
            : "Preencha todos os itens para ver quem vai aprovar."}
        </p>
      )}
      {preview.estado === "carregando" && (
        <p className="text-muted-foreground">Verificando a alçada…</p>
      )}
      {preview.estado === "erro" && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-rejeitado">Não foi possível verificar a alçada: {preview.mensagem}</p>
          <Button type="button" variant="outline" size="sm" onClick={tentarDeNovo}>
            Tentar novamente
          </Button>
        </div>
      )}
      {preview.estado === "pronto" && preview.resultado.faixa === null && (
        <p className="text-rejeitado">
          A obra {preview.resultado.obraNome} não tem faixa de alçada para{" "}
          {formatarCentavos(preview.resultado.valorCents)}. Ajuste os itens ou{" "}
          <Link
            href={obraId === null ? "/regras" : `/regras?obra=${obraId}`}
            className="font-medium underline underline-offset-4"
          >
            cadastre uma faixa em Regras
          </Link>
          .
        </p>
      )}
      {preview.estado === "pronto" && preview.resultado.faixa !== null && (
        <>
          <p>
            Faixa:{" "}
            <strong>
              {formatarFaixa(preview.resultado.faixa.minCents, preview.resultado.faixa.maxCents)}
            </strong>
            . Quem aprova, nesta ordem:
          </p>
          <CadeiaAlcada
            niveis={preview.resultado.cadeia.map((nivel) => ({
              nome: nivel.usuarioNome,
              estado: nivel.herdado ? "herdado" : "proximo",
            }))}
          />
        </>
      )}
    </div>
  );
}
