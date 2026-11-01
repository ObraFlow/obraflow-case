import { useRefreshFailure } from "@/components/ToastProvider";
import { Loading } from "@/components/Loading";
import { RefreshButton } from "@/components/RefreshButton";
import { SingleSelect } from "@/components/ui/Select";
import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { getCoaRevisions } from "@/features/coa/api";
import { type CoaRevision } from "@dokimos/shared";
import { timestamp } from "@/lib/format";
import { Disclosure } from "@/components/ui/Disclosure";
import { ErrorState } from "@/components/Feedback";
import { CoaView } from "./CoaView";
import { cents } from "../thresholds";
import styles from "./CoaHistory.module.css";

type HistoryProps = { id: string; nameOf: (id: string) => string };

export function CoaHistory({ id, nameOf }: HistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = () => {
    if (!refreshing) setAttempt((value) => value + 1);
  };
  return (
    <section className={styles.history} aria-label="Versões da alçada">
      <Disclosure title="Versões da alçada" icon={<History size={18} />} open={expanded} onOpenChange={setExpanded}>
        {expanded && (
          <>
            <div className={styles.header}>
              <p>Consulte as versões publicadas. A seleção não altera a alçada publicada.</p>
              <div className={styles.refreshControl}>
                <span className={styles.refreshLabel} role={refreshing ? "status" : undefined}>
                  {refreshing ? "Atualizando..." : ""}
                </span>
                <RefreshButton
                  variant="ghost"
                  size="icon"
                  iconOnly
                  aria-label="Atualizar versões da alçada"
                  refreshing={refreshing}
                  onClick={refresh}
                />
              </div>
            </div>
            <HistoryContents
              key={id}
              id={id}
              nameOf={nameOf}
              attempt={attempt}
              refresh={refresh}
              onRefreshingChange={setRefreshing}
            />
          </>
        )}
      </Disclosure>
    </section>
  );
}

function HistoryContents({
  id,
  nameOf,
  attempt,
  refresh,
  onRefreshingChange,
}: HistoryProps & { attempt: number; refresh: () => void; onRefreshingChange: (value: boolean) => void }) {
  const [revisions, setRevisions] = useState<CoaRevision[] | null>(null);
  const notifyRefreshFailure = useRefreshFailure();
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    onRefreshingChange(true);
    getCoaRevisions(id, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setError(null);
          setRevisions(result.data);
          setVersion((previous) =>
            result.data.some((revision) => revision.version === previous) ? previous : (result.data[0]?.version ?? 0),
          );
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(failure);
          if (attempt > 0) notifyRefreshFailure();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) onRefreshingChange(false);
      });
    return () => {
      controller.abort();
      onRefreshingChange(false);
    };
  }, [id, attempt, onRefreshingChange, notifyRefreshFailure]);
  const errorNotice = error && !revisions ? <ErrorState error={error} retry={refresh} /> : null;
  if (error && !revisions) return <div className={styles.revision}>{errorNotice}</div>;
  if (!revisions)
    return (
      <div className={styles.revision}>
        <Loading message="Carregando versões…" />
      </div>
    );
  if (!revisions.length)
    return (
      <div className={styles.revision}>
        <p className="text-muted-foreground">Nenhuma versão publicada. Configure e publique a primeira alçada.</p>
        {errorNotice}
      </div>
    );
  const selected = revisions.find((revision) => revision.version === version) ?? revisions[0];
  const currentVersion = revisions[0].version;
  const historical = selected.version !== currentVersion;
  const thresholds = selected.bands.filter((band) => band.upperLimit !== null).map((band) => cents(band.upperLimit!)!);
  const last = thresholds.at(-1) ?? 0n;
  const headroom = (last * 110n + 99n) / 100n;
  return (
    <div>
      <section aria-label={`Versão ${selected.version}`}>
        <div className={styles.toolbar}>
          <div className={styles.selector}>
            <label htmlFor="coa-history-version">Versão da alçada</label>
            <SingleSelect
              id="coa-history-version"
              value={String(selected.version)}
              onValueChange={(value) => setVersion(Number(value))}
              options={revisions.map((revision) => ({
                value: String(revision.version),
                label: `Versão ${revision.version} · ${revision.version === currentVersion ? "Publicada" : "Anterior"}`,
              }))}
            />
          </div>
          <p className={styles.publication}>
            Publicado por <strong>{nameOf(selected.changedById)}</strong>
            <time dateTime={selected.changedAt}>{timestamp(selected.changedAt)}</time>
          </p>
          <div className={styles.versionState} data-historical={historical} role="status">
            {historical ? (
              <>
                <History size={17} aria-hidden="true" />
                <div>
                  <strong>Anterior · não é usada em novos pedidos</strong>
                  <p>A versão publicada é a {currentVersion}. Pedidos existentes mantêm a alçada usada na criação.</p>
                </div>
              </>
            ) : (
              <div>
                <strong>Publicada · usada em novos pedidos</strong>
                <p>Pedidos existentes mantêm a alçada usada na criação.</p>
              </div>
            )}
          </div>
        </div>
        <CoaView
          key={selected.version}
          className={styles.viewer}
          data-testid="coa-history-view"
          version={selected.version}
          approvers={selected.bands.map((band) => nameOf(band.approverId))}
          thresholds={thresholds}
          visualMaximum={headroom > 1000000n ? headroom : 1000000n}
          allowSimulation={false}
        />
      </section>
      {errorNotice}
    </div>
  );
}
