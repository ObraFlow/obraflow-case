"use client";

import { useState } from "react";
import { CadeiaAlcada } from "@/components/alcada/cadeia-alcada";
import { usePreviewAlcada } from "@/components/pedidos/use-preview-alcada";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { niveisDaFaixa } from "@/lib/cadeia";
import { centavosDeTexto, formatarCentavos, formatarFaixa, textoDeCentavos } from "@/lib/money";

/**
 * "Testar um valor": terceiro canal da arquitetura (client → ky → GET /api/regras/aplicavel),
 * pelo mesmo hook que o formulário de pedido usa no preview (`usePreviewAlcada`: espera o
 * usuário parar de digitar e descarta resposta atrasada). Só o texto digitado é estado aqui.
 */
export function SimuladorAlcada({ obraId }: { obraId: number }) {
  const [texto, setTexto] = useState("");

  const vazio = texto.trim() === "";
  const valorCents = vazio ? null : centavosDeTexto(texto);
  const valorInvalido = !vazio && (valorCents === null || valorCents < 0);
  const { preview, tentarDeNovo } = usePreviewAlcada(obraId, valorInvalido ? null : valorCents);

  return (
    <section
      className="flex flex-col gap-3 rounded-sm border bg-card p-5"
      aria-labelledby="simulador-titulo"
    >
      <div>
        <h2 id="simulador-titulo" className="text-lg font-bold">
          Testar um valor
        </h2>
        <p className="text-muted-foreground">
          Digite o total de um pedido para ver em qual faixa ele cai e quem aprova.
        </p>
      </div>

      <label className="flex max-w-xs flex-col gap-1.5 text-sm font-medium">
        Valor do pedido (R$)
        <Input
          inputMode="decimal"
          placeholder="Ex.: 12.500,00"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          // Ao sair, o campo mostra como o valor foi lido ("1500" → "1.500,00").
          onBlur={() => {
            if (valorCents !== null && valorCents >= 0) setTexto(textoDeCentavos(valorCents));
          }}
          aria-invalid={valorInvalido || undefined}
          className="h-[38px] rounded-sm tabular-nums"
        />
      </label>

      <div aria-live="polite" className="min-h-6 text-sm">
        {valorInvalido && (
          <p className="text-rejeitado">Valor inválido. Use números, como 12.500,00.</p>
        )}
        {preview.estado === "carregando" && valorCents !== null && (
          <p className="text-muted-foreground">Consultando {formatarCentavos(valorCents)}…</p>
        )}
        {preview.estado === "erro" && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-rejeitado">{preview.mensagem}</p>
            <Button type="button" variant="outline" size="sm" onClick={tentarDeNovo}>
              Tentar novamente
            </Button>
          </div>
        )}
        {preview.estado === "pronto" && preview.resultado.faixa === null && (
          <p>
            Nenhuma faixa cobre {formatarCentavos(preview.resultado.valorCents)} na obra{" "}
            {preview.resultado.obraNome}. Um pedido nesse valor seria bloqueado.
          </p>
        )}
        {preview.estado === "pronto" && preview.resultado.faixa !== null && (
          <div className="flex flex-col gap-2">
            <p>
              {formatarCentavos(preview.resultado.valorCents)} cai na faixa{" "}
              <strong>
                {formatarFaixa(preview.resultado.faixa.minCents, preview.resultado.faixa.maxCents)}
              </strong>
              . Quem aprova, nesta ordem:
            </p>
            <CadeiaAlcada niveis={niveisDaFaixa(preview.resultado.cadeia)} />
          </div>
        )}
      </div>
    </section>
  );
}
