import type { CoaConfiguration } from "@dokimos/shared";
import { AlertCard } from "@/components/ui/AlertCard";
import { Button } from "@/components/ui/button";
import { CoaView } from "../view/CoaView";
import { axisOf, draftOf } from "./coaDraft";
import styles from "./CoaWorkspace.module.css";

/** After a conflict or an unknown outcome: shows the saved ladder and lets the person keep the draft or drop it. */
export function CoaReconciliation({
  failure,
  reading,
  remote,
  locked,
  nameOf,
  onKeepDraft,
  onUseSaved,
  onRetry,
}: {
  failure: string;
  reading: boolean;
  /** The saved ladder once it has been read. */
  remote: CoaConfiguration | null;
  locked: boolean;
  nameOf: (id: string) => string;
  onKeepDraft: () => void;
  onUseSaved: (saved: CoaConfiguration) => void;
  onRetry: () => void;
}) {
  return (
    <AlertCard variant="warning" role="region" className="mt-4" aria-label="Reconciliação da alçada">
      <h3 className="font-semibold">Sua versão / Versão publicada</h3>
      {failure && <p role="alert">{failure}</p>}
      <p>
        Seu rascunho continua intacto. Manter usa a versão publicada como nova base, sem enviar alterações. Usar a
        versão publicada descarta seu rascunho.
      </p>
      {reading && <p role="status">Consultando versão publicada…</p>}
      {!reading && !remote && (
        <Button type="button" variant="outline" disabled={locked} onClick={onRetry}>
          Tentar consultar a versão publicada
        </Button>
      )}
      {!reading && remote && (
        <>
          <p>Versão publicada {remote.coaVersion}</p>
          <CoaView
            allowSimulation={false}
            version={remote.coaVersion}
            approvers={remote.bands.map((band) => nameOf(band.approverId))}
            thresholds={draftOf(remote).thresholds}
            visualMaximum={axisOf(remote)}
          />
          <div className={styles.reconciliationActions}>
            <Button type="button" variant="outline" disabled={locked} onClick={onKeepDraft}>
              Manter rascunho
            </Button>
            <Button type="button" variant="outline" disabled={locked} onClick={() => onUseSaved(remote)}>
              Usar versão publicada (descartar rascunho)
            </Button>
          </div>
        </>
      )}
    </AlertCard>
  );
}
