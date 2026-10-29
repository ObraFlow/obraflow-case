"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { listarPedidos } from "@/lib/api/pedidos";
import type { PedidoResumo } from "@/lib/dto";
import { formatarCentavos } from "@/lib/money";
import { rotuloPendencias } from "@/lib/pendencias";
import { cn } from "@/lib/utils";

const INTERVALO_MS = 30_000;

/** Evento disparado por quem decide um pedido na tela, para o sino recarregar na hora. */
const EVENTO_PENDENCIAS = "obraflow:pendencias-mudaram";

export function avisarPendenciasMudaram() {
  window.dispatchEvent(new Event(EVENTO_PENDENCIAS));
}

type PermissaoNavegador = "indisponivel" | "default" | "granted" | "denied";

function permissaoAtual(): PermissaoNavegador {
  if (typeof window === "undefined" || !("Notification" in window)) return "indisponivel";
  return Notification.permission;
}

/**
 * Sino do header: quais pedidos aguardam a decisão de quem está agindo. Consulta
 * GET /api/pedidos?pendentesPara= por ky (terceiro canal da arquitetura) ao montar, a cada
 * 30 s e quando a aba volta ao foco. Quando aparece um pedido que não estava na lista
 * anterior, avisa com toast e, se a pessoa permitiu, com notificação do navegador.
 * Na primeira carga não avisa: o que já estava lá não é novidade.
 *
 * Sem servidor de eventos por escopo; em produção isso viraria push ou fila.
 */
export function SinoPendencias({ usuarioAtualId }: { usuarioAtualId: number }) {
  const router = useRouter();
  const [pendentes, setPendentes] = useState<PedidoResumo[] | null>(null);
  const [falhou, setFalhou] = useState(false);
  const conhecidos = useRef<Set<number> | null>(null);
  // Intervalo, foco e decisão podem disparar consultas ao mesmo tempo; só a última vale.
  // Sem isso uma resposta atrasada reescreveria a lista com dados velhos e o poll seguinte
  // avisaria de novo o mesmo pedido.
  const ultimaConsulta = useRef(0);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const consulta = ++ultimaConsulta.current;
      try {
        const lista = await listarPedidos({ pendentesPara: usuarioAtualId });
        if (!ativo || consulta !== ultimaConsulta.current) return;
        setPendentes(lista);
        setFalhou(false);

        if (conhecidos.current !== null) {
          const novos = lista.filter((pedido) => !conhecidos.current?.has(pedido.id));
          for (const pedido of novos) avisar(pedido, router.push);
          if (novos.length > 0) router.refresh();
        }
        conhecidos.current = new Set(lista.map((pedido) => pedido.id));
      } catch {
        if (ativo && consulta === ultimaConsulta.current) setFalhou(true);
      }
    }

    void carregar();
    // Aba em segundo plano não consulta; o `visibilitychange` abaixo atualiza ao voltar.
    const temporizador = setInterval(() => {
      if (!document.hidden) void carregar();
    }, INTERVALO_MS);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void carregar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    const aoDecidir = () => void carregar();
    window.addEventListener(EVENTO_PENDENCIAS, aoDecidir);
    return () => {
      ativo = false;
      clearInterval(temporizador);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener(EVENTO_PENDENCIAS, aoDecidir);
    };
  }, [usuarioAtualId, router]);

  const total = pendentes?.length ?? 0;
  // O rótulo vale para o leitor de tela (botão) e para o subtítulo do popover: quando a
  // consulta falha, dizer "nenhum pedido" seria mentira; a lista anterior continua visível.
  const rotulo = falhou
    ? "Não foi possível consultar as suas pendências"
    : pendentes === null
      ? "Consultando as suas pendências"
      : rotuloPendencias(total);

  return (
    <Popover>
      {/* Quando a consulta falha, o sino apaga e o `title` diz por quê: a falha precisa
          ser visível também para quem enxerga, não só no rótulo do leitor de tela. */}
      <PopoverTrigger
        aria-label={rotulo}
        title={falhou ? rotulo : undefined}
        className={cn(
          "relative flex size-10 items-center justify-center rounded-sm transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:size-8",
          falhou ? "text-white/45" : "text-white/85",
        )}
      >
        <Bell className="size-5" aria-hidden="true" />
        {total > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-[18px] rounded-sm bg-sinalizacao px-1 text-center text-[11px] leading-[18px] font-bold text-foreground tabular-nums"
          >
            {total}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-linha px-4 py-3">
          <p className="font-bold">Aguardando a sua decisão</p>
          <p className="text-xs text-muted-foreground">{rotulo}</p>
        </div>

        {pendentes === null ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">Carregando…</p>
        ) : pendentes.length > 0 ? (
          <ul className="max-h-72 overflow-y-auto">
            {pendentes.map((pedido) => (
              <li key={pedido.id} className="border-b border-linha last:border-b-0">
                <Link
                  href={`/aprovacoes/${pedido.id}`}
                  className="flex items-baseline justify-between gap-3 px-4 py-2.5 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <span className="min-w-0">
                    <span className="font-semibold tabular-nums">#{pedido.id}</span>{" "}
                    <span className="block truncate text-xs text-muted-foreground sm:inline">
                      {pedido.obraNome}
                    </span>
                  </span>
                  <span className="font-semibold whitespace-nowrap tabular-nums">
                    {formatarCentavos(pedido.totalCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div
          className={cn(
            "flex flex-col gap-2 px-4 py-3",
            pendentes?.length ? "border-t border-linha" : "",
          )}
        >
          {total > 0 && (
            <Link
              href="/aprovacoes?filtro=minhas"
              className="text-sm font-medium underline underline-offset-4"
            >
              Ver todos na lista
            </Link>
          )}
          <AvisosDoNavegador />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Só existe dentro do popover, que monta depois da hidratação: por isso pode ler
 * `Notification.permission` direto na renderização sem diferença entre server e client.
 * O estado serve apenas para re-renderizar depois que a pessoa responde ao pedido.
 */
function AvisosDoNavegador() {
  const [, setRespondido] = useState(0);
  const permissao = permissaoAtual();

  if (permissao === "default") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-fit"
        onClick={async () => {
          const resposta = await Notification.requestPermission();
          setRespondido((n) => n + 1);
          if (resposta === "granted") toast.success("Avisos do navegador ativados.");
        }}
      >
        Ativar avisos do navegador
      </Button>
    );
  }
  if (permissao === "granted") {
    return (
      <p className="text-xs text-muted-foreground">
        Avisos do navegador ativados: você é avisado mesmo em outra aba.
      </p>
    );
  }
  if (permissao === "denied") {
    return (
      <p className="text-xs text-muted-foreground">
        Avisos do navegador bloqueados nas permissões do site.
      </p>
    );
  }
  return null;
}

function avisar(pedido: PedidoResumo, navegar: (url: string) => void) {
  const texto = `Pedido #${pedido.id} de ${formatarCentavos(pedido.totalCents)} aguarda a sua decisão.`;
  const url = `/aprovacoes/${pedido.id}`;

  toast(texto, {
    description: pedido.obraNome,
    duration: 10_000,
    action: { label: "Abrir", onClick: () => navegar(url) },
  });

  if (permissaoAtual() === "granted" && document.visibilityState !== "visible") {
    const aviso = new Notification("ObraFlow", { body: `${texto} ${pedido.obraNome}.`, tag: url });
    aviso.onclick = () => {
      window.focus();
      navegar(url);
      aviso.close();
    };
  }
}
