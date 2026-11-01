import { matchesSearch } from "@/lib/search";
import { plural } from "@/lib/format";
import { Loading } from "@/components/Loading";
import { RefreshButton } from "@/components/RefreshButton";
import { useRefreshFailure, useToast } from "@/components/ToastProvider";
import { useDialogQuery } from "@/lib/useDialogQuery";
import { AlertCard } from "@/components/ui/AlertCard";
import { SingleSelect } from "@/components/ui/Select";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import type { SupplierSummary } from "@dokimos/shared";
import { getSuppliers } from "./api";
import { Button } from "@/components/ui/button";
import { ErrorState, EmptyState } from "@/components/Feedback";
import { FilterBar } from "@/components/FilterBar";
import { ListShell } from "@/components/ListShell";
import { PageHeader } from "@/components/PageHeader";
import { DirectoryCard } from "@/components/directory/DirectoryCard";
import { NewSupplierDialog } from "./NewSupplierDialog";
import { SupplierRenameDialog } from "./SupplierRenameDialog";
import { SupplierDeactivationDialog } from "./SupplierDeactivationDialog";
import styles from "@/components/directory/DirectoryCard.module.css";

type Entry = SupplierSummary;

export function Suppliers() {
  const { success: successToast } = useToast();
  const notifyRefreshFailure = useRefreshFailure();
  const kind = "suppliers";
  const title = "Fornecedores";
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useDialogQuery("mode", pending);
  const createOpen = mode === "create";
  const setCreateOpen = (open: boolean) => setMode(open ? "create" : null);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [readError, setReadError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  function setSearch(value: string, closeCreation = false) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set("q", value);
        else next.delete("q");
        if (closeCreation) {
          next.delete("mode");
          next.delete("status");
        }
        return next;
      },
      { replace: true },
    );
  }
  const status = params.get("status") ?? "active";
  function setStatus(value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set("status", value);
      else next.delete("status");
      return next;
    });
  }
  const [deactivateId, setDeactivateId] = useDialogQuery("deactivate", pending);
  const [renameId, setRenameId] = useDialogQuery("rename", pending);
  const listRead = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    listRead.current = controller;
    setLoading(true);
    setReadError(null);
    async function load() {
      const data: Entry[] = (await getSuppliers(controller.signal)).data;
      if (!controller.signal.aborted) {
        setEntries(data);
      }
    }
    void load()
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setReadError(failure);
          if (attempt > 0) notifyRefreshFailure();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt, notifyRefreshFailure]);
  function confirmSupplier(supplier: SupplierSummary) {
    // Reconciliation can finish while a page refresh is still in flight. Its
    // older snapshot must not replace the supplier just confirmed by the dialog.
    listRead.current?.abort();
    setLoading(false);
    setReadError(null);
    setEntries((previous) => previous?.map((entry) => (entry.id === supplier.id ? supplier : entry)) ?? null);
  }
  function confirmDeactivated(id: string) {
    // A list read still in flight predates this confirmed write; its snapshot must not replace the result.
    listRead.current?.abort();
    setEntries(
      (previous) => previous?.map((entry) => (entry.id === id ? { ...entry, isActive: false } : entry)) ?? null,
    );
  }
  const ready = !loading && !readError;
  const filtered = entries
    ?.filter(
      (entry) =>
        (!status || status === "all" || entry.isActive === (status === "active")) && matchesSearch(entry.name, search),
    )
    .sort((a, b) => Number(b.isActive) - Number(a.isActive));
  function confirmCreated(supplier: SupplierSummary) {
    setEntries((previous) => [...(previous ?? []), supplier]);
    successToast({ id: `${kind}:created:${supplier.id}`, title: "Fornecedor criado", description: supplier.name });
    setSearch("", true);
  }
  return (
    <>
      <ListShell
        header={
          <PageHeader
            title={title}
            description="Crie fornecedores para os novos pedidos."
            actions={
              <>
                <RefreshButton refreshing={loading} disabled={pending} onClick={() => setAttempt((value) => value + 1)}>
                  Atualizar fornecedores
                </RefreshButton>
                <Button disabled={pending} onClick={() => setCreateOpen(true)}>
                  <Plus aria-hidden="true" />
                  <span className="action-label">Adicionar fornecedor</span>
                </Button>
              </>
            }
          />
        }
        notices={
          ready && !!entries && !entries.some((entry) => entry.isActive) ? (
            <AlertCard variant="warning">
              Novos pedidos não podem ser criados porque não há fornecedores ativos disponíveis.
            </AlertCard>
          ) : undefined
        }
        filters={
          <FilterBar
            label="Filtros de fornecedores"
            activeCount={Number(status !== "active")}
            note={
              entries && filtered && filtered.length < entries.length
                ? `${entries.length - filtered.length} ${plural(entries.length - filtered.length, "oculto", "ocultos")} pelos filtros`
                : undefined
            }
            search={
              <div>
                <label htmlFor="directory-search">Buscar fornecedores</label>
                <input id="directory-search" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
            }
          >
            <div className="min-w-40">
              <label htmlFor="directory-status">Situação do cadastro</label>
              <SingleSelect
                id="directory-status"
                value={status}
                onValueChange={(value) => setStatus(value)}
                options={[
                  { value: "all", label: "Todos" },
                  { value: "active", label: "Ativos" },
                  { value: "inactive", label: "Inativos" },
                ]}
              />
            </div>
          </FilterBar>
        }
      >
        {!!readError && !entries && <ErrorState error={readError} retry={() => setAttempt((value) => value + 1)} />}
        {loading && !entries && <Loading message="Carregando fornecedores…" />}
        {entries &&
          (!filtered?.length ? (
            <EmptyState
              title={entries.length ? "Nenhum resultado para estes filtros" : "Nenhum fornecedor cadastrado"}
              description={
                entries.length
                  ? "Ajuste a busca ou a situação do cadastro."
                  : "Crie o primeiro fornecedor para disponibilizá-lo nos novos pedidos."
              }
              action={
                entries.length
                  ? {
                      label: "Limpar filtros",
                      onClick: () => {
                        setParams((previous) => {
                          const next = new URLSearchParams(previous);
                          next.delete("q");
                          next.delete("status");
                          return next;
                        });
                      },
                    }
                  : { label: "Criar primeiro fornecedor", onClick: () => setCreateOpen(true), disabled: pending }
              }
            />
          ) : (
            <div className="catalog-viewport" role="region" aria-label="Lista de fornecedores" tabIndex={0}>
              <ul className={styles.list} aria-label={title}>
                {filtered?.map((entry) => (
                  <DirectoryCard
                    key={entry.id}
                    entry={entry}
                    kind={kind}
                    disabled={pending || !ready}
                    onRename={() => setRenameId(entry.id)}
                    onDeactivate={() => setDeactivateId(entry.id)}
                  />
                ))}
              </ul>
            </div>
          ))}
      </ListShell>
      <NewSupplierDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pending={pending}
        creating={pending && !deactivateId}
        onPending={setPending}
        ready={ready}
        loading={loading}
        readError={readError}
        onRetryRead={() => setAttempt((value) => value + 1)}
        onCreated={confirmCreated}
      />
      <SupplierRenameDialog
        id={renameId}
        suppliers={entries}
        ready={ready}
        loading={loading}
        onClose={() => setRenameId(null)}
        onPending={setPending}
        onRefresh={() => setAttempt((value) => value + 1)}
        onConfirmed={confirmSupplier}
      />
      <SupplierDeactivationDialog
        id={deactivateId}
        suppliers={entries}
        ready={ready}
        loading={loading}
        readError={readError}
        pending={pending}
        onClose={() => setDeactivateId(null)}
        onPending={setPending}
        onRefresh={() => setAttempt((value) => value + 1)}
        onConfirmed={confirmDeactivated}
      />
    </>
  );
}
