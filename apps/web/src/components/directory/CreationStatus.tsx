import { AlertCard } from "@/components/ui/AlertCard";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";

/**
 * What a directory creation dialog says below its fields, in a fixed-height slot so the dialog does not jump:
 * a failed list read, a list still refreshing, or the outcome of the write. After an unknown outcome another
 * send stays blocked until the person confirms they checked the list.
 */
export function CreationStatus({
  failure,
  uncertain,
  readError,
  loading,
  ready,
  pending,
  onRetryRead,
  onAcknowledge,
}: {
  /** The message of a failed write, or empty. */
  failure: string;
  /** The write may or may not have happened. */
  uncertain: boolean;
  readError: unknown;
  loading: boolean;
  ready: boolean;
  pending: boolean;
  onRetryRead: () => void;
  /** The person checked the list: allow another send. */
  onAcknowledge: () => void;
}) {
  const writeOutcome = !!failure || uncertain;
  return (
    <div className="flex h-32 flex-col overflow-y-auto" aria-live="polite">
      {!writeOutcome && !!readError && (
        <AlertCard variant="error" className="mt-auto" title="Não foi possível atualizar os cadastros.">
          {errorMessage(readError)}
          <span className="mt-2 block">
            <Button type="button" variant="outline" onClick={onRetryRead}>
              Tentar novamente
            </Button>
          </span>
        </AlertCard>
      )}
      {!writeOutcome && !readError && loading && (
        <p role="status" className="mt-auto text-xs text-muted-foreground">
          Atualizando cadastros…
        </p>
      )}
      {writeOutcome && (
        <AlertCard
          variant="error"
          className="mt-auto"
          title={uncertain ? "Resultado incerto." : "Não foi possível concluir."}
        >
          {failure}
          {uncertain
            ? " O cadastro pode ter sido concluído. Confira a lista atualizada antes de outro envio para evitar duplicidade."
            : " Os campos foram preservados."}
          {uncertain && (
            <span className="mt-2 block">
              <Button type="button" variant="outline" disabled={!ready || pending} onClick={onAcknowledge}>
                Liberar novo envio
              </Button>
            </span>
          )}
        </AlertCard>
      )}
    </div>
  );
}
