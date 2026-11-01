import { matchesSearch } from "@/lib/search";
import { projectPath } from "@/lib/paths";
import { plural } from "@/lib/format";
import { Loading } from "@/components/Loading";
import { RefreshButton } from "@/components/RefreshButton";
import { useAuth } from "@/auth/AuthContext";
import { useProjectFavorites } from "@/features/projects/list/useProjectFavorites";
import { SingleSelect } from "@/components/ui/Select";
import { useRefreshFailure, useToast } from "@/components/ToastProvider";
import { useDialogQuery } from "@/lib/useDialogQuery";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import { getProjects } from "@/features/projects/api";
import type { ProjectListItem, ProjectSummary } from "@dokimos/shared";
import { Button } from "@/components/ui/button";
import { AlertCard } from "@/components/ui/AlertCard";
import { ErrorState, EmptyState } from "@/components/Feedback";
import { NewProjectDialog } from "./NewProjectDialog";
import { ProjectCard } from "./ProjectCard";
import { FilterBar } from "@/components/FilterBar";
import { ListShell } from "@/components/ListShell";
import { PageHeader } from "@/components/PageHeader";
import styles from "./ProjectCard.module.css";

/** The "Alçada" filter: projects with a published ladder, without one, or all. */
function matchesCoaFilter(project: ProjectListItem, coa: string) {
  if (coa === "configured") return project.coaVersion > 0;
  if (coa === "unconfigured") return project.coaVersion === 0;
  return true;
}

export function Projects() {
  const { success: successToast } = useToast();
  const notifyRefreshFailure = useRefreshFailure("projects");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { favorites, toggleFavorite, storageUnavailable } = useProjectFavorites(user?.id ?? "anonymous");
  const search = params.get("q") ?? "";
  const coa = params.get("coa") ?? "";
  const status = params.get("status") ?? "active";
  function filter(key: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: key === "q" },
    );
  }
  function clearFilters() {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const key of ["q", "coa", "status"]) next.delete(key);
      return next;
    });
  }

  const [projects, setProjects] = useState<ProjectListItem[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useDialogQuery("mode", pending);
  const createOpen = mode === "create";
  const setCreateOpen = (open: boolean) => setMode(open ? "create" : null);
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setLoading(true);
    getProjects(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setProjects(result.data);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(failure);
          if (attempt > 0) notifyRefreshFailure();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt, notifyRefreshFailure]);
  const filtered = projects
    ?.filter(
      (project) =>
        matchesSearch(project.name, search) &&
        (status === "all" || (status === "archived" ? !project.isActive : project.isActive)) &&
        matchesCoaFilter(project, coa),
    )
    .sort(
      (a, b) =>
        Number(b.isActive) - Number(a.isActive) || Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)),
    );
  function confirmCreated(project: ProjectSummary) {
    successToast({ id: `project:created:${project.id}`, title: "Obra criada", description: project.name });
    navigate(projectPath(project.id));
  }
  return (
    <>
      <ListShell
        header={
          <PageHeader
            title="Obras"
            description="Organize os membros e configure as alçadas de cada obra."
            actions={
              <>
                <RefreshButton refreshing={loading} onClick={() => setAttempt((value) => value + 1)}>
                  Atualizar obras
                </RefreshButton>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus aria-hidden="true" />
                  <span className="action-label">Adicionar obra</span>
                </Button>
              </>
            }
          />
        }
        notices={
          storageUnavailable ? (
            <AlertCard variant="warning" role="status">
              Não foi possível acessar o armazenamento local. As alterações nos favoritos podem não ser mantidas ao sair
              desta página.
            </AlertCard>
          ) : undefined
        }
        filters={
          <FilterBar
            label="Filtros de obras"
            activeCount={Number(!!coa) + Number(status !== "active")}
            note={
              projects && filtered && filtered.length < projects.length
                ? `${projects.length - filtered.length} ${plural(projects.length - filtered.length, "oculta", "ocultas")} pelos filtros`
                : undefined
            }
            search={
              <div>
                <label htmlFor="projects-search">Buscar obras</label>
                <input
                  id="projects-search"
                  placeholder="Buscar por nome"
                  value={search}
                  onChange={(event) => filter("q", event.target.value)}
                />
              </div>
            }
          >
            <div className={styles.filter}>
              <label htmlFor="projects-coa">Alçada</label>
              <SingleSelect
                id="projects-coa"
                value={coa}
                onValueChange={(value) => filter("coa", value)}
                options={[
                  { value: "", label: "Todas" },
                  { value: "configured", label: "Configuradas" },
                  { value: "unconfigured", label: "Não configuradas" },
                ]}
              />
            </div>
            <div className={styles.filter}>
              <label htmlFor="projects-status">Situação</label>
              <SingleSelect
                id="projects-status"
                value={status}
                onValueChange={(value) => filter("status", value)}
                options={[
                  { value: "active", label: "Ativas" },
                  { value: "archived", label: "Arquivadas" },
                  { value: "all", label: "Todas" },
                ]}
              />
            </div>
          </FilterBar>
        }
      >
        {!projects &&
          (error ? (
            <ErrorState error={error} retry={() => setAttempt((value) => value + 1)} />
          ) : (
            <Loading message="Carregando obras…" />
          ))}
        {projects && !projects.length && (
          <EmptyState
            title="Nenhuma obra cadastrada"
            description="Crie a primeira obra. Depois, adicione membros e publique uma alçada."
            action={{ label: "Criar primeira obra", onClick: () => setCreateOpen(true), disabled: pending }}
          />
        )}
        {!!projects?.length && !filtered?.length && (
          <EmptyState
            title="Nenhuma obra encontrada"
            description="Ajuste a busca, a situação ou o filtro de alçada."
            action={{ label: "Limpar filtros", onClick: clearFilters }}
          />
        )}
        {!!filtered?.length && (
          <div className="catalog-viewport" role="region" aria-label="Lista de obras" tabIndex={0}>
            <ul className={styles.grid} aria-label="Obras cadastradas">
              {filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  favorite={favorites.includes(project.id)}
                  onToggleFavorite={() => toggleFavorite(project.id)}
                />
              ))}
            </ul>
          </div>
        )}
      </ListShell>
      <NewProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pending={pending}
        onPending={setPending}
        listLoaded={!!projects}
        onUncertain={() => setAttempt((value) => value + 1)}
        onCreated={confirmCreated}
      />
    </>
  );
}
