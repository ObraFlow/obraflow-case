"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAprovarEmLote } from "@/components/aprovacoes/use-aprovar-em-lote";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatarCentavos } from "@/lib/money";

type PedidoMarcavel = { id: number; fornecedorNome: string; totalCents: number };

type Selecao = {
  marcados: ReadonlyMap<number, PedidoMarcavel>;
  marcar: (pedido: PedidoMarcavel, marcado: boolean) => void;
  desmarcar: (pedidoId: number) => void;
  desmarcarTodos: () => void;
};

const SelecaoContext = createContext<Selecao | null>(null);

function useSelecao(): Selecao {
  const selecao = useContext(SelecaoContext);
  if (!selecao) throw new Error("useSelecao precisa estar dentro de <SelecaoPedidos>.");
  return selecao;
}

/**
 * Estado dos pedidos marcados na lista. Vive aqui, e não na tabela (Server Component), para
 * a caixa de cada linha, a caixa "marcar todos" e a barra de ação lerem o mesmo conjunto. A
 * lista some e volta revalidada depois de aprovar, então nada aqui precisa adivinhar o
 * resultado: a caixa de uma linha que deixou de ser "sua vez" desmonta e se desmarca.
 */
export function SelecaoPedidos({ children }: { children: React.ReactNode }) {
  const [marcados, setMarcados] = useState<Map<number, PedidoMarcavel>>(new Map());

  // As funções não dependem do estado (usam a forma funcional do setState) e ficam estáveis:
  // o efeito de limpeza de cada caixa depende delas e não pode rodar a cada marcação.
  const marcar = useCallback((pedido: PedidoMarcavel, marcado: boolean) => {
    setMarcados((atual) => {
      if (marcado === atual.has(pedido.id)) return atual;
      const proximo = new Map(atual);
      if (marcado) proximo.set(pedido.id, pedido);
      else proximo.delete(pedido.id);
      return proximo;
    });
  }, []);
  const desmarcar = useCallback((pedidoId: number) => {
    setMarcados((atual) => {
      if (!atual.has(pedidoId)) return atual;
      const proximo = new Map(atual);
      proximo.delete(pedidoId);
      return proximo;
    });
  }, []);
  const desmarcarTodos = useCallback(() => setMarcados(new Map()), []);

  const selecao = useMemo<Selecao>(
    () => ({ marcados, marcar, desmarcar, desmarcarTodos }),
    [marcados, marcar, desmarcar, desmarcarTodos],
  );

  return <SelecaoContext.Provider value={selecao}>{children}</SelecaoContext.Provider>;
}

const CLASSE_CAIXA =
  "relative size-4 shrink-0 cursor-pointer rounded-[2px] border-foreground accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none";

/** Caixa de uma linha. Só existe nas linhas em que é a vez do usuário atual. */
export function CaixaMarcar({ pedido }: { pedido: PedidoMarcavel }) {
  const { marcados, marcar, desmarcar } = useSelecao();
  const marcado = marcados.has(pedido.id);

  // Linha saiu da lista (foi decidida, mudou o filtro ou a pessoa): sai da seleção também.
  const { id } = pedido;
  useEffect(() => () => desmarcar(id), [id, desmarcar]);

  // A caixa continua 16px; o rótulo em volta dá os 40px de alvo de toque no celular.
  return (
    <label className="-m-3 flex size-10 cursor-pointer items-center justify-center md:m-0 md:size-auto">
      <input
        type="checkbox"
        className={CLASSE_CAIXA}
        checked={marcado}
        aria-label={`Marcar pedido #${pedido.id}`}
        onChange={(evento) => marcar(pedido, evento.target.checked)}
      />
    </label>
  );
}

/** Caixa do cabeçalho: marca ou desmarca todas as linhas da vez do usuário nesta página. */
export function CaixaMarcarTodos({ pedidos }: { pedidos: PedidoMarcavel[] }) {
  const { marcados, marcar, desmarcarTodos } = useSelecao();
  const quantosMarcados = pedidos.filter((pedido) => marcados.has(pedido.id)).length;
  const todos = pedidos.length > 0 && quantosMarcados === pedidos.length;
  const alguns = quantosMarcados > 0 && !todos;

  if (pedidos.length === 0) return null;

  return (
    <input
      type="checkbox"
      className={CLASSE_CAIXA}
      checked={todos}
      ref={(elemento) => {
        if (elemento) elemento.indeterminate = alguns;
      }}
      aria-label={
        todos ? "Desmarcar todos os pedidos da minha vez" : "Marcar todos os pedidos da minha vez"
      }
      onChange={(evento) => {
        if (!evento.target.checked) return desmarcarTodos();
        for (const pedido of pedidos) marcar(pedido, true);
      }}
    />
  );
}

/**
 * Aparece só com algo marcado: quantos, o total e o botão que abre a confirmação. A
 * rejeição não entra aqui de propósito: cada rejeição pede um motivo próprio.
 */
export function BarraSelecao() {
  const { marcados, desmarcarTodos } = useSelecao();
  const [confirmando, setConfirmando] = useState(false);
  const { aprovar, enviando } = useAprovarEmLote({
    aoConcluir: () => {
      setConfirmando(false);
      desmarcarTodos();
    },
  });

  const lista = [...marcados.values()].sort((a, b) => a.id - b.id);
  if (lista.length === 0) return null;
  const totalCents = lista.reduce((soma, pedido) => soma + pedido.totalCents, 0);
  const quantos = lista.length === 1 ? "1 pedido marcado" : `${lista.length} pedidos marcados`;

  return (
    <section
      role="region"
      aria-label="Pedidos marcados"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-sm bg-sinalizacao px-4 py-2 text-sm text-sinalizacao-foreground"
    >
      <span className="font-semibold tabular-nums">
        {quantos}, {formatarCentavos(totalCents)}
      </span>
      <span className="text-sinalizacao-foreground/80">Rejeição é uma por pedido, com motivo.</span>
      <span className="ml-auto flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 border-sinalizacao-foreground/40 bg-transparent text-sinalizacao-foreground hover:bg-sinalizacao-foreground/10 sm:h-8"
          onClick={desmarcarTodos}
          disabled={enviando}
        >
          Desmarcar
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-10 sm:h-8"
          onClick={() => setConfirmando(true)}
        >
          Aprovar marcados
        </Button>
      </span>

      {confirmando && (
        <Dialog
          open
          onOpenChange={(abrir) => {
            if (!abrir && !enviando) setConfirmando(false);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold tabular-nums">
                Aprovar {lista.length === 1 ? "1 pedido" : `${lista.length} pedidos`} de uma vez
              </DialogTitle>
              <DialogDescription>
                Você aprova o seu nível em cada um. Os que tiverem próximo nível seguem para o
                aprovador seguinte; os demais ficam aprovados.
              </DialogDescription>
            </DialogHeader>
            <ul className="flex flex-col divide-y divide-linha border-y border-linha text-sm">
              {lista.map((pedido) => (
                <li key={pedido.id} className="flex items-center gap-3 py-1.5">
                  <span className="font-semibold font-stretch-[112%] tabular-nums">
                    #{pedido.id}
                  </span>
                  <span className="truncate text-muted-foreground">{pedido.fornecedorNome}</span>
                  <span className="ml-auto font-medium tabular-nums">
                    {formatarCentavos(pedido.totalCents)}
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between py-1.5 font-semibold tabular-nums">
                <span>Total</span>
                <span>{formatarCentavos(totalCents)}</span>
              </li>
            </ul>
            <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmando(false)}
                disabled={enviando}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => aprovar(lista.map((pedido) => pedido.id))}
                disabled={enviando}
              >
                {enviando ? "Aprovando…" : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
