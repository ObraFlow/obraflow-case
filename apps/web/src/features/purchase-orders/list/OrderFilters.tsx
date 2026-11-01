import { Building2 } from "lucide-react";
import type { ProjectListItem } from "@dokimos/shared";
import { Button } from "@/components/ui/button";
import { SingleSelect } from "@/components/ui/Select";
import { orderViews, viewCounts, type OrderView } from "./orderViews";
import styles from "./Orders.module.css";

/** The project filter and the view tabs (all, mine, pending, ...) with their counts. Phones get a select. */
export function OrderFilters({
  projects,
  projectId,
  counts,
  activeView,
  loading,
  onProjectChange,
  onViewChange,
}: {
  projects: ProjectListItem[] | null;
  projectId: string;
  /** View sizes of the selected project, or null until they are read. */
  counts: ReturnType<typeof viewCounts> | null;
  activeView: OrderView["key"];
  loading: boolean;
  onProjectChange: (projectId: string) => void;
  onViewChange: (view: OrderView) => void;
}) {
  return (
    <section className={`panel ${styles.filterPanel}`} aria-label="Filtros de pedidos">
      <div className={styles.filterBar}>
        <div className={styles.projectFilter}>
          <Building2 className={styles.projectIcon} size={17} aria-hidden="true" />
          <label className="sr-only" htmlFor="project-filter">
            Obra
          </label>
          <SingleSelect
            className={styles.projectSelect}
            id="project-filter"
            value={projectId}
            onValueChange={onProjectChange}
            disabled={!projects}
            options={[
              { value: "", label: !projects ? "Carregando obras…" : "Todas as obras" },
              ...(projects?.map((project) => ({ value: project.id, label: project.name })) ?? []),
            ]}
          />
        </div>
        <nav
          className={styles.views}
          aria-label="Visões dos pedidos"
          aria-describedby="order-count-scope"
          aria-busy={loading}
        >
          {orderViews.map((view) => (
            <Button
              key={view.key}
              variant="ghost"
              aria-pressed={activeView === view.key}
              title={view.key === "mine" ? "Pedidos cuja etapa atual aguarda a sua decisão" : undefined}
              onClick={() => onViewChange(view)}
            >
              <span className={styles.viewLabel}>{view.label}</span>
              <span className={styles.count}>{counts?.[view.key] ?? "—"}</span>
            </Button>
          ))}
        </nav>
        <div className={styles.compactView}>
          <label className="sr-only" htmlFor="order-view-filter">
            Visualização dos pedidos
          </label>
          <SingleSelect
            className={styles.viewSelect}
            id="order-view-filter"
            value={activeView}
            onValueChange={(key) => {
              const view = orderViews.find((view) => view.key === key);
              if (view) onViewChange(view);
            }}
            aria-describedby="order-count-scope"
            options={orderViews.map((view) => ({
              value: view.key,
              label: `${view.label} (${counts?.[view.key] ?? "—"})`,
            }))}
          />
        </div>
      </div>
      <p className="sr-only" id="order-count-scope">
        Contagens {projectId ? "da obra selecionada" : "dos pedidos disponíveis para sua conta"}. Sua decisão mostra os
        pedidos que aguardam você na etapa atual. A decisão é feita no detalhe do pedido.
      </p>
    </section>
  );
}
