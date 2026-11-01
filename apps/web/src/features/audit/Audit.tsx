import { useRefreshFailure } from "@/components/ToastProvider";
import { Loading } from "@/components/Loading";
import { RefreshButton } from "@/components/RefreshButton";
import { Pagination, isPageUnavailable } from "@/components/Pagination";
import { ListShell } from "@/components/ListShell";
import { PageHeader } from "@/components/PageHeader";
import { useDialogQuery } from "@/lib/useDialogQuery";
import { AuditEventDrawer } from "./AuditEventDrawer";
import { SingleSelect } from "@/components/ui/Select";
import { DateRangeSelector, type DateRange } from "@/components/ui/date/DateRangeSelector";
import { auditDateBounds, auditDateRange } from "./auditDateRange";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { auditEventTypes, type AuditPage, type ProjectSummary } from "@dokimos/shared";
import { getAuditEvents } from "@/features/audit/api";
import { getProjects } from "@/features/projects/api";
import { plural } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/Feedback";
import styles from "./Audit.module.css";
import { normalizeAuditQuery } from "./auditQuery";
import { AuditEmptyState, AuditEventList } from "./AuditEventList";
import { eventLabels, resourceLink } from "./eventTypes";

export function Audit() {
  const notifyRefreshFailure = useRefreshFailure();
  const [params, setParams] = useSearchParams();
  const [eventId, setEventId] = useDialogQuery("event");
  const apiParams = normalizeAuditQuery(params);
  const query = apiParams.toString();
  const [data, setData] = useState<AuditPage | null>(null);
  const hasEventData = useRef(false);
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [projectError, setProjectError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const refresh = () => setAttempt((value) => value + 1);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getAuditEvents(query, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          hasEventData.current = true;
          setData(result);
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(failure);
          // A refresh that fails is announced; a first load that fails is shown inline.
          if (attempt > 0 || hasEventData.current) notifyRefreshFailure();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, attempt, notifyRefreshFailure]);
  useEffect(() => {
    const controller = new AbortController();
    setProjectError(null);
    setProjectsLoading(true);
    getProjects(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setProjects(result.data);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setProjectError(failure);
          if (attempt > 0) notifyRefreshFailure();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setProjectsLoading(false);
      });
    return () => controller.abort();
  }, [attempt, notifyRefreshFailure]);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.delete("page");
    next.delete("event");
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }
  function page(value: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(value));
    next.delete("event");
    setParams(next);
  }
  function dateRange(value: DateRange) {
    const next = new URLSearchParams(params);
    next.delete("page");
    next.delete("event");
    const bounds = auditDateBounds(value);
    for (const key of ["from", "to"] as const) {
      if (bounds[key]) next.set(key, bounds[key]);
      else next.delete(key);
    }
    setParams(next);
  }
  function clearFilters() {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const key of ["eventType", "projectId", "from", "to", "page", "event"]) next.delete(key);
      return next;
    });
  }
  const hasFilters = ["eventType", "projectId", "from", "to"].some((key) => params.has(key));
  // The date range counts once; a page size other than the default counts too.
  const activeFilters =
    Number(params.has("eventType")) +
    Number(params.has("projectId")) +
    Number(params.has("from") || params.has("to")) +
    Number(!!apiParams.get("pageSize") && apiParams.get("pageSize") !== "20");
  const unavailable = !!data && isPageUnavailable(data.pagination);
  const selected = data?.data.find((event) => event.id === eventId);
  return (
    <>
      <ListShell
        header={
          <PageHeader
            title="Auditoria"
            description="Histórico de pedidos, decisões, alçadas, obras, membros, usuários e fornecedores, do mais recente ao mais antigo."
            actions={
              <RefreshButton refreshing={loading || projectsLoading} onClick={refresh}>
                Atualizar histórico
              </RefreshButton>
            }
          />
        }
        filters={
          <section className={`panel ${styles.filterPanel}`} aria-label="Filtros de auditoria">
            <button
              type="button"
              className={styles.filterToggle}
              aria-expanded={filtersOpen}
              aria-controls="audit-filter-body"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              <span>Filtros</span>
              {activeFilters > 0 && (
                <span className={styles.filterCount}>
                  {activeFilters}
                  <span className="sr-only"> {plural(activeFilters, "filtro ativo", "filtros ativos")}</span>
                </span>
              )}
              <ChevronDown className={styles.filterChevron} size={16} aria-hidden="true" />
            </button>
            <div id="audit-filter-body" className={styles.filterBody} data-open={filtersOpen}>
              <div className={styles.filterInner}>
                <div className={styles.filters}>
                  <div>
                    <label htmlFor="audit-type">Tipo de evento</label>
                    <SingleSelect
                      id="audit-type"
                      value={apiParams.get("eventType") ?? ""}
                      onValueChange={(value) => filter("eventType", value)}
                      options={[
                        { value: "", label: "Todos os tipos" },
                        ...(auditEventTypes.map((type) => ({ value: type, label: eventLabels[type] })) ?? []),
                      ]}
                    />
                  </div>
                  <div>
                    <label htmlFor="audit-project">Obra</label>
                    <SingleSelect
                      id="audit-project"
                      disabled={!projects}
                      value={apiParams.get("projectId") ?? ""}
                      onValueChange={(value) => filter("projectId", value)}
                      options={[
                        { value: "", label: projects ? "Todas as obras e eventos globais" : "Carregando obras…" },
                        ...(projects?.map((project) => ({ value: project.id, label: project.name })) ?? []),
                      ]}
                    />
                  </div>
                  <DateRangeSelector value={auditDateRange(apiParams)} onValueChange={dateRange} />
                  <div>
                    <label htmlFor="audit-page-size">Eventos por página</label>
                    <SingleSelect
                      id="audit-page-size"
                      value={apiParams.get("pageSize") ?? "20"}
                      onValueChange={(value) => filter("pageSize", value)}
                      options={[
                        ...([10, 20, 50, 100].map((size) => ({ value: String(size), label: String(size) })) ?? []),
                      ]}
                    />
                  </div>
                </div>
                <div className={styles.filterHelp}>
                  {hasFilters && data?.data.length !== 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>
        }
        footer={
          data ? (
            <Pagination
              label="Paginação da auditoria"
              pagination={data.pagination}
              count={data.data.length}
              singular="evento"
              plural="eventos"
              onPageChange={page}
            />
          ) : undefined
        }
      >
        {!!projectError && !projects && !error && (
          <ErrorState title="Não foi possível carregar as obras" error={projectError} retry={refresh} />
        )}
        {!data &&
          (loading ? (
            <Loading message="Carregando histórico…" />
          ) : (
            !!error && <ErrorState title="Não foi possível carregar o histórico" error={error} retry={refresh} />
          ))}
        {data && !data.data.length && (
          <AuditEmptyState
            unavailable={unavailable}
            hasFilters={hasFilters}
            onFirstPage={() => page(1)}
            onClearFilters={clearFilters}
          />
        )}
        {data && !!data.data.length && <AuditEventList page={data} />}
      </ListShell>
      <AuditEventDrawer
        event={selected}
        label={selected ? eventLabels[selected.type] : "Detalhes do evento"}
        href={selected ? resourceLink(selected) : "/admin/audit"}
        open={!!eventId}
        onOpenChange={(open) => {
          if (!open) setEventId(null);
        }}
        loading={loading}
      />
    </>
  );
}
