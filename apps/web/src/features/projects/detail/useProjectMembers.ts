import { useEffect, useRef, useState } from "react";
import type { ProjectMember, UserSummary } from "@dokimos/shared";
import { ApiError, errorMessage } from "@/lib/api";
import { useRefreshFailure } from "@/components/ToastProvider";
import { addProjectMember, getProjectMembers, removeProjectMember } from "@/features/projects/api";
import { getUsers } from "@/features/users/api";

export type MemberFailure = { message: string; code?: string };

/**
 * The members of one project and the people who could join them: both reads, and the add and remove writes
 * with their rules. The dialog around it keeps what is on screen.
 *
 * A write is never replayed. After one, the list is read again and edits stay locked until that read ends.
 * `writingId` (the id being written) lives in the caller because the dialog's URL state must stay locked while
 * a write runs.
 */
export function useProjectMembers({
  id,
  open,
  readOnly,
  writingId,
  setWritingId,
  onLoaded,
  onLoadError,
  fadeOut,
  onRemoved,
  onWriteSettled,
}: {
  id: string;
  /** The people directory is read only while the dialog is open. */
  open: boolean;
  readOnly: boolean;
  writingId: string | null;
  setWritingId: (userId: string | null) => void;
  onLoaded: (members: ProjectMember[]) => void;
  onLoadError: (error: unknown) => void;
  /** Plays after a confirmed removal, before the row leaves the list. */
  fadeOut: (userId: string) => Promise<void>;
  onRemoved: () => void;
  /** A write finished and the page is still here; `restoreFocus` tells whether focus should return to the search. */
  onWriteSettled: (restoreFocus: boolean) => void;
}) {
  const notifyRefreshFailure = useRefreshFailure();
  const [members, setMembers] = useState<ProjectMember[] | null>(null);
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [mustRefresh, setMustRefresh] = useState(false);
  const [attempt, setAttempt] = useState(0),
    [refreshing, setRefreshing] = useState(true);
  const [directoryAttempt, setDirectoryAttempt] = useState(0),
    [directoryLoading, setDirectoryLoading] = useState(false);
  const [error, setError] = useState<unknown>(null),
    [directoryError, setDirectoryError] = useState<unknown>(null);
  const [failure, setFailure] = useState<MemberFailure | null>(null),
    [notice, setNotice] = useState<string | null>(null);
  const busy = useRef(false),
    live = useRef(true);
  const membersRead = useRef<AbortController | null>(null);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    membersRead.current = controller;
    setRefreshing(true);
    setError(null);
    void getProjectMembers(id, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setMembers(result.data);
        onLoaded(result.data);
        setMustRefresh(false);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(failure);
          onLoadError(failure);
          if (attempt > 0) notifyRefreshFailure();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefreshing(false);
      });
    return () => controller.abort();
  }, [id, attempt, onLoaded, onLoadError, notifyRefreshFailure]);
  // Directory availability must never hide existing membership or the saved CoA.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setDirectoryLoading(true);
    setDirectoryError(null);
    void getUsers(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setUsers(result.data);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setDirectoryError(failure);
          if (directoryAttempt > 0) notifyRefreshFailure();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setDirectoryLoading(false);
      });
    return () => controller.abort();
  }, [id, open, directoryAttempt, notifyRefreshFailure]);
  /** Active people who are not members yet. */
  const available =
    users?.filter((user) => user.isActive && !members?.some((member) => member.userId === user.id)) ?? [];
  const locked = readOnly || !!writingId || refreshing || mustRefresh;
  const addLocked = locked || directoryLoading || !!directoryError || !users;
  function refresh() {
    setAttempt((value) => value + 1);
    setDirectoryAttempt((value) => value + 1);
  }
  async function write(
    userId: string,
    request: () => Promise<unknown>,
    afterConfirmed: () => Promise<void> | void,
    restoreFocus: (confirmed: boolean) => boolean,
  ) {
    let confirmed = false;
    busy.current = true;
    setWritingId(userId);
    setFailure(null);
    setNotice(null);
    try {
      await request();
      confirmed = true;
      await afterConfirmed();
    } catch (failure) {
      if (live.current)
        setFailure({ message: errorMessage(failure), code: failure instanceof ApiError ? failure.code : undefined });
    } finally {
      busy.current = false;
      if (live.current) {
        onWriteSettled(restoreFocus(confirmed));
        setWritingId(null);
        setMustRefresh(true);
        refresh();
      }
    }
  }
  async function add(userId: string) {
    const person = available.find((user) => user.id === userId);
    if (busy.current || locked || addLocked || !person) return;
    await write(
      userId,
      () => addProjectMember(id, userId),
      () => {
        if (live.current) setNotice(`${person.displayName} adicionado à obra.`);
      },
      () => true,
    );
  }
  /** `blocked`: the caller knows this member cannot be removed (assigned to the ladder, or awaited in an order). */
  async function remove(userId: string, blocked: boolean) {
    if (busy.current || locked || blocked || !members?.some((member) => member.userId === userId)) return;
    await write(
      userId,
      () => removeProjectMember(id, userId),
      async () => {
        await fadeOut(userId);
        if (!live.current) return;
        // A list read still in flight predates this confirmed write; its snapshot must not replace the result.
        membersRead.current?.abort();
        setMembers((previous) => previous?.filter((member) => member.userId !== userId) ?? null);
        onRemoved();
      },
      (confirmed) => confirmed,
    );
  }
  return {
    members,
    users,
    available,
    refreshing,
    directoryLoading,
    error,
    directoryError,
    failure,
    notice,
    locked,
    addLocked,
    refresh,
    retryMembers: () => setAttempt((value) => value + 1),
    retryDirectory: () => setDirectoryAttempt((value) => value + 1),
    /** A new removal starts clean; cancelling one drops only its failure. */
    clearFeedback: () => {
      setFailure(null);
      setNotice(null);
    },
    clearFailure: () => setFailure(null),
    add,
    remove,
  };
}
