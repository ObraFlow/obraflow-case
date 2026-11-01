import { matchesSearch } from "@/lib/search";
import { plural } from "@/lib/format";
import { Loading } from "@/components/Loading";
import { RefreshButton } from "@/components/RefreshButton";
import { useRefreshFailure, useToast } from "@/components/ToastProvider";
import { useDialogQuery } from "@/lib/useDialogQuery";
import { SingleSelect } from "@/components/ui/Select";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import type { UserSummary } from "@dokimos/shared";
import { getUsers } from "./api";
import { NewUserDialog } from "./NewUserDialog";
import { UserDeactivationDialog } from "./UserDeactivationDialog";
import { Button } from "@/components/ui/button";
import { ErrorState, EmptyState } from "@/components/Feedback";
import { FilterBar } from "@/components/FilterBar";
import { ListShell } from "@/components/ListShell";
import { PageHeader } from "@/components/PageHeader";
import { DirectoryCard, type DirectoryEntry } from "@/components/directory/DirectoryCard";
import styles from "@/components/directory/DirectoryCard.module.css";

type Entry = DirectoryEntry;
const userEntry = (user: UserSummary): Entry => ({
  id: user.id,
  name: user.displayName,
  username: user.username,
  role: user.role,
  isActive: user.isActive,
});

export function Users() {
  const { success: successToast } = useToast();
  const notifyRefreshFailure = useRefreshFailure();
  const kind = "users";
  const title = "Usuários";
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
  const status = params.get("status") ?? "";
  function setStatus(value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set("status", value);
      else next.delete("status");
      return next;
    });
  }
  const [deactivateId, setDeactivateId] = useDialogQuery("deactivate", pending);
  const listRead = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    listRead.current = controller;
    setLoading(true);
    setReadError(null);
    async function load() {
      const data: Entry[] = (await getUsers(controller.signal)).data.map(userEntry);
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
  function confirmDeactivated(id: string) {
    // A list read still in flight predates this confirmed write; its snapshot must not replace the result.
    listRead.current?.abort();
    setEntries(
      (previous) => previous?.map((entry) => (entry.id === id ? { ...entry, isActive: false } : entry)) ?? null,
    );
  }
  const ready = !loading && !readError;
  const filtered = entries?.filter(
    (entry) =>
      (!status || status === "all" || entry.isActive === (status === "active")) &&
      matchesSearch(`${entry.name} ${entry.username ?? ""}`, search),
  );
  function confirmCreated(user: UserSummary) {
    // A list read still in flight predates this confirmed write; its snapshot must not replace the result.
    listRead.current?.abort();
    const created = userEntry(user);
    setEntries((previous) => [...(previous ?? []), created]);
    successToast({ id: `${kind}:created:${created.id}`, title: "Usuário criado", description: created.name });
    setSearch("", true);
  }
  return (
    <>
      <ListShell
        header={
          <PageHeader
            title={title}
            description="Crie usuários comuns e gerencie o acesso."
            actions={
              <>
                <RefreshButton refreshing={loading} disabled={pending} onClick={() => setAttempt((value) => value + 1)}>
                  Atualizar usuários
                </RefreshButton>
                <Button disabled={pending} onClick={() => setCreateOpen(true)}>
                  <Plus aria-hidden="true" />
                  <span className="action-label">Adicionar usuário</span>
                </Button>
              </>
            }
          />
        }
        filters={
          <FilterBar
            label="Filtros de usuários"
            activeCount={Number(status !== "")}
            note={
              entries && filtered && filtered.length < entries.length
                ? `${entries.length - filtered.length} ${plural(entries.length - filtered.length, "oculto", "ocultos")} pelos filtros`
                : undefined
            }
            search={
              <div>
                <label htmlFor="directory-search">Buscar usuários</label>
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
                  { value: "", label: "Todos" },
                  { value: "active", label: "Ativos" },
                  { value: "inactive", label: "Inativos" },
                ]}
              />
            </div>
          </FilterBar>
        }
      >
        {!!readError && !entries && <ErrorState error={readError} retry={() => setAttempt((value) => value + 1)} />}
        {loading && !entries && <Loading message="Carregando usuários…" />}
        {entries &&
          (!filtered?.length ? (
            <EmptyState
              title={entries.length ? "Nenhum resultado para estes filtros" : "Nenhum usuário cadastrado"}
              description={
                entries.length
                  ? "Ajuste a busca ou a situação do cadastro."
                  : "Crie o primeiro usuário para que ele possa atuar nos pedidos."
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
                  : { label: "Criar primeiro usuário", onClick: () => setCreateOpen(true), disabled: pending }
              }
            />
          ) : (
            <div className="catalog-viewport" role="region" aria-label="Lista de usuários" tabIndex={0}>
              <ul className={styles.list} aria-label={title}>
                {filtered?.map((entry) => (
                  <DirectoryCard
                    key={entry.id}
                    entry={entry}
                    kind={kind}
                    disabled={pending || !ready}
                    onDeactivate={() => setDeactivateId(entry.id)}
                  />
                ))}
              </ul>
            </div>
          ))}
      </ListShell>
      <NewUserDialog
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
      <UserDeactivationDialog
        id={deactivateId}
        users={entries}
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
