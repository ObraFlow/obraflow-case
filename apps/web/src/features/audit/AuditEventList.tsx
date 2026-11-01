import { Link } from "react-router";
import type { AuditPage } from "@dokimos/shared";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/Feedback";
import { useDialogQuery } from "@/lib/useDialogQuery";
import { timestamp } from "@/lib/format";
import styles from "./Audit.module.css";
import { eventIcons, eventLabels, resourceLink, resourceNoun } from "./eventTypes";

function EventDetails({ eventId }: { eventId: string }) {
  const [, setEvent] = useDialogQuery("event");
  return (
    <Button type="button" variant="ghost" size="sm" aria-haspopup="dialog" onClick={() => setEvent(eventId)}>
      Ver detalhes
    </Button>
  );
}

/** One page of the history, newest first, numbered across pages. */
export function AuditEventList({ page }: { page: AuditPage }) {
  return (
    <section className="catalog-viewport" role="region" aria-label="Histórico de auditoria" tabIndex={0}>
      <ol
        className={styles.events}
        aria-label="Eventos de auditoria"
        start={(page.pagination.page - 1) * page.pagination.pageSize + 1}
      >
        {page.data.map((event) => {
          const Icon = eventIcons[event.type];
          return (
            <li className={styles.event} key={event.id}>
              <span className={styles.marker} data-type={event.type} aria-hidden="true">
                <Icon size={15} />
              </span>
              <article className={styles.card} aria-label={`${eventLabels[event.type]} · ${event.resource.name}`}>
                <header className={styles.header}>
                  <h2>{eventLabels[event.type]}</h2>
                  <time dateTime={event.occurredAt}>{timestamp(event.occurredAt)}</time>
                </header>
                <p className={styles.context}>
                  {event.actor.displayName}
                  {event.actor.kind === "SYSTEM" ? " · Sistema" : ""} · {event.project?.name ?? "Global"}
                </p>
                <Link
                  className={`text-link ${styles.resource}`}
                  to={resourceLink(event)}
                  aria-label={`Abrir ${resourceNoun(event.resource.kind)} ${event.resource.name}`}
                >
                  {event.resource.name}
                </Link>
                <div className={styles.actions}>
                  <EventDetails eventId={event.id} />
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Nothing to list: either the requested page does not exist or the query matched no events. */
export function AuditEmptyState({
  unavailable,
  hasFilters,
  onFirstPage,
  onClearFilters,
}: {
  unavailable: boolean;
  hasFilters: boolean;
  onFirstPage: () => void;
  onClearFilters: () => void;
}) {
  if (unavailable)
    return (
      <EmptyState
        title="Página indisponível"
        description="Esta página não está disponível na consulta atual. Volte à primeira página mantendo seus filtros."
        action={{ label: "Voltar à primeira página", onClick: onFirstPage }}
      />
    );
  return (
    <EmptyState
      title="Nenhum evento encontrado"
      description="Não há eventos para esta consulta. Ajuste os filtros ou atualize após uma nova operação."
      action={hasFilters ? { label: "Limpar filtros", onClick: onClearFilters } : undefined}
    />
  );
}
