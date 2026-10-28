"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RegraDto } from "@/lib/dto";
import { formatarFaixa } from "@/lib/money";
import { removerFaixaAction } from "@/server/actions/regras";

export function DialogRemoverFaixa({
  faixa,
  aberto,
  aoFechar,
}: {
  faixa: RegraDto;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const { execute, isPending } = useAction(removerFaixaAction, {
    onSuccess() {
      toast.success("Faixa removida.");
      aoFechar();
    },
    onError({ error }) {
      toast.error(error.serverError ?? "Não foi possível remover a faixa.");
    },
  });

  return (
    <Dialog
      open={aberto}
      onOpenChange={(abrir) => {
        if (!abrir) aoFechar();
      }}
    >
      <DialogContent className="rounded-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Remover a faixa {formatarFaixa(faixa.minCents, faixa.maxCents)}?
          </DialogTitle>
          <DialogDescription>
            Novos pedidos nesse valor ficarão sem faixa e serão bloqueados até existir outra.
            Pedidos já criados mantêm a cadeia que copiaram.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={aoFechar} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={() => execute({ id: faixa.id })}
          >
            {isPending ? "Removendo…" : "Remover faixa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
