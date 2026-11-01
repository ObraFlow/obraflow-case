import { plural } from "@/lib/format";
import { matchesSearch } from "@/lib/search";
import { AlertCard } from "@/components/ui/AlertCard";
import { Loading } from "@/components/Loading";
import { useDialogQuery } from "@/lib/useDialogQuery";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { type ProjectMember, ErrorCode, type CoaConfiguration } from "@dokimos/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { ErrorState, EmptyState } from "@/components/Feedback";
import { AddMembersView } from "./AddMembersView";
import { MemberRow } from "./MemberRow";
import { MembersHeader, type MembersView } from "./MembersHeader";
import { MembersSummary } from "./MembersSummary";
import { useProjectMembers } from "./useProjectMembers";
import { useRemovalAnimation } from "./useRemovalAnimation";
import styles from "./ProjectMembers.module.css";

/**
 * The members of a project: a summary card and the dialog to add and remove people. Removal asks first and is
 * refused for anyone in the published ladder or with undecided approvals. Reads, writes and their rules are in
 * `useProjectMembers`; this keeps what is on screen, focus and the dialog.
 */
export function ProjectMembers({
  id,
  projectName,
  publishedBands,
  onLoaded,
  onLoadError,
  readOnly = false,
  onBusyChange,
}: {
  id: string;
  projectName: string;
  publishedBands: CoaConfiguration["bands"];
  readOnly?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onLoaded: (members: ProjectMember[]) => void;
  onLoadError: (error: unknown) => void;
}) {
  const [writingId, setWritingId] = useState<string | null>(null);
  const [dialog, setDialog] = useDialogQuery("dialog", !!writingId);
  const open = dialog === "members";
  const setOpen = (next: boolean) => setDialog(next ? "members" : null);
  const [view, setView] = useState<MembersView>("members");
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<ProjectMember | null>(null);
  const cancelRemoval = useRef<HTMLButtonElement>(null),
    removalId = useRef<string | null>(null);
  const restoreRemovalFocus = useRef(false),
    restoreWriteFocus = useRef(false);
  const search = useRef<HTMLInputElement>(null);
  const memberList = useRef<HTMLUListElement>(null);
  const data = useProjectMembers({
    id,
    open,
    readOnly,
    writingId,
    setWritingId,
    onLoaded,
    onLoadError,
    fadeOut: useRemovalAnimation(memberList),
    onRemoved: () => setTarget(null),
    onWriteSettled: (restoreFocus) => {
      restoreWriteFocus.current = restoreFocus;
    },
  });
  const { members, users, available, failure } = data;
  useEffect(() => {
    if (!open) {
      setTarget(null);
      setView("members");
      setQuery("");
    }
  }, [open]);
  useLayoutEffect(() => {
    if (target) cancelRemoval.current?.focus();
    else if (restoreRemovalFocus.current) {
      restoreRemovalFocus.current = false;
      const button = memberList.current?.querySelector<HTMLButtonElement>(
        `[data-remove-member="${removalId.current}"]`,
      );
      (button ?? search.current)?.focus();
    }
  }, [target, failure?.code]);
  useLayoutEffect(() => {
    if (!writingId && restoreWriteFocus.current) {
      restoreWriteFocus.current = false;
      search.current?.focus();
    }
  }, [writingId]);
  useLayoutEffect(() => {
    if (open) search.current?.focus();
  }, [view, open]);
  useEffect(() => {
    onBusyChange?.(open || !!writingId);
    return () => onBusyChange?.(false);
  }, [open, writingId, onBusyChange]);
  const refreshedTarget = members?.find((member) => member.userId === target?.userId);
  const identity = (member: ProjectMember) => users?.find((user) => user.id === member.userId);
  const matches = (name: string, handle = "") => matchesSearch(`${name} ${handle}`, query);
  // Retain an uncertain removal's row until dismissed, even if reconciliation finds no membership.
  const listedMembers = target && members && !refreshedTarget ? [...members, target] : members;
  const shownMembers = listedMembers?.filter((member) => matches(member.displayName, identity(member)?.username)) ?? [];
  const candidates = available.filter((user) => matches(user.displayName, user.username));
  const level = (userId: string) => publishedBands.findIndex((band) => band.approverId === userId);
  const coaBlocked =
    !!target && (level(target.userId) >= 0 || failure?.code === ErrorCode.MEMBER_ASSIGNED_TO_ACTIVE_COA);
  const pendingBlocked = failure?.code === ErrorCode.MEMBER_HAS_PENDING_APPROVALS;
  const controlsLocked = !!writingId || !!target;
  function clearQuery() {
    setQuery("");
    search.current?.focus();
  }
  function cancelRemovalRequest() {
    restoreRemovalFocus.current = true;
    setTarget(null);
    data.clearFailure();
  }
  function askRemoval(member: ProjectMember) {
    removalId.current = member.userId;
    setTarget(member);
    data.clearFeedback();
  }
  return (
    <section className="panel p-5" aria-labelledby="members-title">
      <Dialog
        open={open}
        onOpenChange={(next, details) => {
          if (writingId) return;
          if (!next && target && details.reason === "escape-key") {
            details.cancel();
            cancelRemovalRequest();
            return;
          }
          setOpen(next);
        }}
      >
        <MembersSummary members={members} usernameOf={(member) => identity(member)?.username} readOnly={readOnly} />
        {data.refreshing && !members && !open && <Loading message="Carregando membros…" />}
        {!!data.error && !members && !open && <ErrorState compact error={data.error} retry={data.retryMembers} />}
        <DialogContent className={`${styles.dialog} sm:max-w-2xl`} showCloseButton={false}>
          <MembersHeader
            projectName={projectName}
            view={view}
            onViewChange={setView}
            readOnly={readOnly}
            controlsLocked={controlsLocked}
            writing={!!writingId}
            query={query}
            onQueryChange={setQuery}
            searchRef={search}
            refreshing={data.refreshing || data.directoryLoading}
            onRefresh={data.refresh}
          />
          <div className={styles.content} aria-busy={data.refreshing || !!writingId}>
            {writingId && (
              <p role="status" className="sr-only">
                {target ? "Removendo membro…" : "Adicionando membro…"}
              </p>
            )}
            {data.refreshing && !members && <Loading message="Carregando membros…" />}
            {!!data.error && !members && <ErrorState error={data.error} retry={data.retryMembers} />}
            {failure && !target && (
              <AlertCard variant="error">{failure.message} Confira a lista atualizada antes de outro envio.</AlertCard>
            )}
            {view === "members" && members && (
              <>
                <p className={styles.count}>
                  {shownMembers.filter((member) => members.some((current) => current.userId === member.userId)).length}{" "}
                  de {members.length} {plural(members.length, "membro", "membros")}
                </p>
                {!shownMembers.length ? (
                  <EmptyState
                    compact
                    title={query ? "Nenhum membro corresponde à busca." : "A obra ainda não tem membros."}
                    action={
                      query
                        ? { label: "Limpar busca", onClick: clearQuery, disabled: controlsLocked }
                        : {
                            label: "Adicionar primeiro membro",
                            onClick: () => setView("add"),
                            disabled: readOnly || controlsLocked,
                          }
                    }
                  />
                ) : (
                  <ul ref={memberList} className={styles.list} aria-label="Membros da obra">
                    {shownMembers.map((member) => (
                      <MemberRow
                        key={member.userId}
                        member={member}
                        user={identity(member)}
                        level={level(member.userId)}
                        removal={
                          target?.userId === member.userId
                            ? {
                                failure,
                                coaBlocked,
                                pendingBlocked,
                                gone: !refreshedTarget && !data.refreshing,
                              }
                            : undefined
                        }
                        locked={data.locked}
                        writing={!!writingId}
                        removalOpen={!!target}
                        cancelRef={cancelRemoval}
                        onAskRemoval={askRemoval}
                        onConfirmRemoval={(userId) => void data.remove(userId, coaBlocked || pendingBlocked)}
                        onCancelRemoval={cancelRemovalRequest}
                      />
                    ))}
                  </ul>
                )}
              </>
            )}
            {view === "add" && (
              <AddMembersView
                users={users}
                available={available}
                candidates={candidates}
                query={query}
                loading={data.directoryLoading}
                error={data.directoryError}
                addLocked={data.addLocked}
                clearDisabled={controlsLocked}
                onClearQuery={clearQuery}
                onRetry={data.retryDirectory}
                onAdd={(userId) => void data.add(userId)}
              />
            )}
          </div>
          <footer className={styles.footer}>
            <div>
              {data.notice && (
                <p role="status" className="sr-only">
                  {data.notice}
                </p>
              )}
              <DialogDescription className={styles.info}>
                <Info size={15} aria-hidden="true" />
                <span>A inclusão de usuários não altera os aprovadores.</span>
              </DialogDescription>
            </div>
            <Button variant="outline" disabled={!!writingId} onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </footer>
        </DialogContent>
      </Dialog>
    </section>
  );
}
