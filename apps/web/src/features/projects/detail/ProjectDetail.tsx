import { plural } from "@/lib/format";
import { AlertCard } from "@/components/ui/AlertCard";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getProjects } from "@/features/projects/api";
import { type ProjectSummary, type ProjectMember, ErrorCode, type CoaConfiguration } from "@dokimos/shared";
import { getCoa } from "@/features/coa/api";
import { ErrorState } from "@/components/Feedback";
import { Loading } from "@/components/Loading";
import { ProjectLifecycleActions } from "./ProjectLifecycleActions";
import { ProjectMembers } from "./ProjectMembers";
import { CoaWorkspace } from "@/features/coa/editor/CoaWorkspace";

export function ProjectDetail() {
  const { id = "" } = useParams();
  return <ProjectWorkspace key={id} id={id} />;
}
function ProjectWorkspace({ id }: { id: string }) {
  const [data, setData] = useState<{ project: ProjectSummary; coa: CoaConfiguration } | null>(null);
  const [lifecyclePending, setLifecyclePending] = useState(false);
  const [membersBusy, setMembersBusy] = useState(false);
  const [coaBusy, setCoaBusy] = useState(false);
  const onProjectChanged = useCallback(
    (project: ProjectSummary) => setData((previous) => (previous ? { ...previous, project } : previous)),
    [],
  );
  const [references, setReferences] = useState<ProjectMember[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [memberError, setMemberError] = useState<unknown>(null);
  const onReferences = useCallback((value: ProjectMember[]) => {
    setReferences(value);
    setMemberError(null);
  }, []);
  const onMemberError = useCallback((failure: unknown) => setMemberError(failure), []);
  const onConfirmed = useCallback(
    (coa: CoaConfiguration) => setData((previous) => (previous ? { ...previous, coa } : previous)),
    [],
  );
  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setLoading(true);
    void Promise.all([getProjects(controller.signal), getCoa(id, controller.signal)])
      .then(([projects, coa]) => {
        const project = projects.data.find((project) => project.id === id);
        if (!project) throw new ApiError(404, ErrorCode.NOT_FOUND, "Obra não encontrada.");
        if (!controller.signal.aborted) setData({ project, coa });
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(failure);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, attempt]);
  return (
    <div className="page-width space-y-6">
      <Link className="text-link inline-flex items-center gap-2 text-sm" to="/admin/projects">
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar às obras
      </Link>
      {!!error && <ErrorState error={error} retry={() => setAttempt((value) => value + 1)} />}
      {!data ? (
        !error && <Loading message="Carregando configuração da obra…" />
      ) : (
        <>
          <section className="panel space-y-4 p-5" aria-labelledby="project-title">
            <div>
              <p className="eyebrow">CONFIGURAÇÃO DA OBRA</p>
              <h1 id="project-title" className="page-heading mt-2">
                {data.project.name}
              </h1>
              <p className="mt-2 text-sm font-medium">{data.project.isActive ? "Ativa" : "Arquivada"}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {data.coa.coaVersion === 0
                  ? "Alçada não configurada"
                  : `Alçada publicada · versão ${data.coa.coaVersion} · ${data.coa.bands.length} ${plural(data.coa.bands.length, "nível", "níveis")}`}
                {references ? ` · ${references.length} ${plural(references.length, "membro", "membros")}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Para criar pedidos, você também precisa ser membro da obra.
              </p>
            </div>
            <ProjectLifecycleActions
              project={data.project}
              disabled={loading || membersBusy || coaBusy}
              onChanged={onProjectChanged}
              onPending={setLifecyclePending}
            />
          </section>
          {!data.project.isActive && (
            <AlertCard variant="info" role="status">
              Obra arquivada · Consulta histórica disponível. Reative a obra para criar pedidos ou alterar membros e
              alçada.
            </AlertCard>
          )}
          <ProjectMembers
            readOnly={!data.project.isActive || lifecyclePending}
            onBusyChange={setMembersBusy}
            id={id}
            projectName={data.project.name}
            publishedBands={data.coa.bands}
            onLoaded={onReferences}
            onLoadError={onMemberError}
          />
          <div className="space-y-6" aria-label="Configuração da alçada">
            {references && (
              <CoaWorkspace
                readOnly={!data.project.isActive || lifecyclePending}
                onBusyChange={setCoaBusy}
                id={id}
                projectName={data.project.name}
                initial={data.coa}
                members={references}
                onConfirmed={onConfirmed}
                loading={loading}
              />
            )}
            {!references &&
              (memberError ? (
                <AlertCard variant="warning">
                  A alçada depende da consulta dos membros. Tente novamente na seção Membros da obra.
                </AlertCard>
              ) : (
                <Loading message="Carregando membros para a alçada…" />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
