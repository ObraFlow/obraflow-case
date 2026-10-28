"use client";

import { useEffect, useState } from "react";
import { CadeiaAlcada } from "@/components/alcada/cadeia-alcada";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mensagemDeErro } from "@/lib/api/client";
import { previewAlcada } from "@/lib/api/regras";
import type { FaixaAplicavelDto } from "@/lib/dto";
import { centavosDeTexto, formatarCentavos, formatarFaixa } from "@/lib/money";

/** Última resposta da API, amarrada ao valor consultado para saber se ainda vale. */
type Resposta =
  { valorCents: number; resultado: FaixaAplicavelDto } | { valorCents: number; erro: string };

/**
 * "Testar um valor": terceiro canal da arquitetura (client → ky → GET /api/regras/aplicavel).
 * Reusa `resolverRegra` pelo mesmo endpoint que o formulário de pedido usa no preview.
 * Só a resposta da rede é estado; vazio, inválido e carregando são derivados do texto.
 */
export function SimuladorAlcada({ obraId }: { obraId: number }) {
  const [texto, setTexto] = useState("");
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const vazio = texto.trim() === "";
  const valorCents = vazio ? null : centavosDeTexto(texto);
  const valorInvalido = !vazio && (valorCents === null || valorCents < 0);
  const respostaAtual = resposta !== null && resposta.valorCents === valorCents ? resposta : null;
  const carregando = valorCents !== null && !valorInvalido && respostaAtual === null;

  useEffect(() => {
    if (valorCents === null || valorCents < 0) return;

    // Espera o usuário parar de digitar; descarta a resposta se o valor mudou no meio.
    let cancelado = false;
    const timer = setTimeout(async () => {
      try {
        const resultado = await previewAlcada(obraId, valorCents);
        if (!cancelado) setResposta({ valorCents, resultado });
      } catch (causa) {
        const erro = await mensagemDeErro(causa);
        if (!cancelado) setResposta({ valorCents, erro });
      }
    }, 300);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [obraId, valorCents, tentativa]);

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
          aria-invalid={valorInvalido || undefined}
          className="h-[38px] rounded-sm tabular-nums"
        />
      </label>

      <div aria-live="polite" className="min-h-6 text-sm">
        {valorInvalido && (
          <p className="text-rejeitado">Valor inválido. Use números, como 12.500,00.</p>
        )}
        {carregando && valorCents !== null && (
          <p className="text-muted-foreground">Consultando {formatarCentavos(valorCents)}…</p>
        )}
        {respostaAtual !== null && "erro" in respostaAtual && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-rejeitado">{respostaAtual.erro}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setResposta(null);
                setTentativa((atual) => atual + 1);
              }}
            >
              Tentar novamente
            </Button>
          </div>
        )}
        {respostaAtual !== null &&
          "resultado" in respostaAtual &&
          respostaAtual.resultado.faixa === null && (
            <p>
              Nenhuma faixa cobre {formatarCentavos(respostaAtual.resultado.valorCents)} na obra{" "}
              {respostaAtual.resultado.obraNome}. Um pedido nesse valor seria bloqueado.
            </p>
          )}
        {respostaAtual !== null &&
          "resultado" in respostaAtual &&
          respostaAtual.resultado.faixa !== null && (
            <div className="flex flex-col gap-2">
              <p>
                {formatarCentavos(respostaAtual.resultado.valorCents)} cai na faixa{" "}
                <strong>
                  {formatarFaixa(
                    respostaAtual.resultado.faixa.minCents,
                    respostaAtual.resultado.faixa.maxCents,
                  )}
                </strong>
                . Quem aprova, nesta ordem:
              </p>
              <CadeiaAlcada
                niveis={respostaAtual.resultado.cadeia.map((nivel) => ({
                  nome: nivel.usuarioNome,
                  estado: nivel.herdado ? "herdado" : "proximo",
                }))}
              />
            </div>
          )}
      </div>
    </section>
  );
}
