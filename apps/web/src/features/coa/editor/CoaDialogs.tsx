import type { CoaBand } from "@dokimos/shared";
import { Button } from "@/components/ui/button";
import { SaveConfirmation } from "@/components/ui/SaveConfirmation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { brl } from "@/lib/format";

/** The review before publishing: the complete ladder and the version it replaces. The page owns the write. */
export function PublishConfirmation({
  open,
  onOpenChange,
  baseVersion,
  bands,
  nameOf,
  pending,
  disabled,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseVersion: number;
  bands: CoaBand[];
  nameOf: (id: string) => string;
  pending: boolean;
  disabled: boolean;
  onConfirm: () => void;
}) {
  return (
    <SaveConfirmation
      open={open}
      onOpenChange={onOpenChange}
      title="Publicar alçada"
      confirmLabel={`Publicar versão ${baseVersion + 1}`}
      pendingLabel="Publicando…"
      pending={pending}
      disabled={disabled}
      onConfirm={onConfirm}
      description={`A versão ${baseVersion + 1} substituirá a versão ${baseVersion} como alçada publicada para novos pedidos desta obra.`}
    >
      <p>
        Todos os níveis serão publicados juntos, em ordem cumulativa. Pedidos existentes mantêm a versão e os
        aprovadores originais.
      </p>
      <ol className="list-decimal space-y-2 pl-5">
        {bands.map((band, index) => (
          <li key={band.approverId}>
            <strong>{nameOf(band.approverId)}</strong> ·{" "}
            {band.upperLimit === null ? "Sem limite superior" : `Até ${brl(band.upperLimit)}`}
            <p className="text-xs text-muted-foreground">
              Cadeia:{" "}
              {bands
                .slice(0, index + 1)
                .map((earlier) => nameOf(earlier.approverId))
                .join(" → ")}
            </p>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">
        A publicação exige que a versão {baseVersion} continue atual. Em caso de conflito, seu rascunho será preservado
        para reconciliação.
      </p>
    </SaveConfirmation>
  );
}

export function DiscardDraftDialog({
  open,
  onOpenChange,
  locked,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locked: boolean;
  onDiscard: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!locked) onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={!locked}>
        <DialogTitle>Descartar alterações?</DialogTitle>
        <DialogDescription>
          O rascunho será descartado e a configuração publicada será consultada novamente. Nenhuma alteração será
          enviada.
        </DialogDescription>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={locked} onClick={() => onOpenChange(false)}>
            Continuar editando
          </Button>
          <Button type="button" variant="destructive" disabled={locked} onClick={onDiscard}>
            Descartar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
