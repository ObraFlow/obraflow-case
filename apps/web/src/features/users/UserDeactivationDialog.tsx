import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ApiError, errorMessage } from "@/lib/api";
import { ErrorCode } from "@dokimos/shared";
import { deactivateUser } from "@/features/users/api";
import { useToast } from "@/components/ToastProvider";
import { Loading } from "@/components/Loading";
import { ErrorState } from "@/components/Feedback";
import { AlertCard } from "@/components/ui/AlertCard";
import { DialogDescription } from "@/components/ui/dialog";
import { DeactivationDialog } from "@/components/directory/DeactivationDialog";
import type { DirectoryEntry } from "@/components/directory/DirectoryCard";

/** Confirmed logical deactivation of one user. The page owns the list; this owns the dialog and its write. */
export function UserDeactivationDialog({
  id,
  users,
  ready,
  loading,
  readError,
  pending,
  onClose,
  onPending,
  onRefresh,
  onConfirmed,
}: {
  id: string | null;
  users: DirectoryEntry[] | null;
  ready: boolean;
  loading: boolean;
  readError: unknown;
  pending: boolean;
  onClose: () => void;
  onPending: (pending: boolean) => void;
  onRefresh: () => void;
  onConfirmed: (id: string) => void;
}) {
  const user = users?.find((value) => value.id === id);
  const isAdmin = user?.role === "ADMIN";
  const [error, setError] = useState("");
  const [conflictCode, setConflictCode] = useState("");
  const [blocked, setBlocked] = useState(false);
  const awaitingRefresh = useRef(false);
  const busy = useRef(false),
    live = useRef(true);
  const { success: toast } = useToast();
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  // Another user starts clean.
  useEffect(() => {
    setError("");
    setConflictCode("");
    setBlocked(false);
    awaitingRefresh.current = false;
  }, [id]);
  // A refresh asked from this dialog lifts the block once its result arrives.
  useEffect(() => {
    if (!awaitingRefresh.current) return;
    awaitingRefresh.current = false;
    setBlocked(false);
    setError("");
    setConflictCode("");
  }, [users]);
  async function deactivate() {
    if (!user || blocked || !user.isActive || !ready || busy.current || pending || isAdmin) return;
    busy.current = true;
    onPending(true);
    setError("");
    setConflictCode("");
    try {
      await deactivateUser(user.id);
      if (!live.current) return;
      onConfirmed(user.id);
      toast({
        id: `users:deactivated:${user.id}`,
        title: "Usuário desativado",
        description: user.name,
      });
      onClose();
    } catch (failure) {
      if (!live.current) return;
      const code = failure instanceof ApiError ? failure.code : "";
      setConflictCode(code);
      setBlocked(true);
      setError(
        code === ErrorCode.USER_ASSIGNED_TO_ACTIVE_COA
          ? "Este usuário participa de uma alçada publicada. Publique uma alçada sem este aprovador antes de desativá-lo. Pedidos existentes continuam usando suas etapas originais."
          : code === ErrorCode.USER_HAS_PENDING_APPROVALS
            ? "Este usuário tem etapas ainda não decididas em pedidos pendentes, inclusive etapas futuras. Aguarde a conclusão desses fluxos. As decisões não podem ser puladas ou transferidas."
            : `${errorMessage(failure)} Consulte o estado atualizado antes de confirmar novamente.`,
      );
    } finally {
      busy.current = false;
      if (live.current) {
        onPending(false);
        onRefresh();
      }
    }
  }
  return (
    <DeactivationDialog
      open={!!id}
      title="Desativar usuário"
      pending={pending}
      loading={loading}
      blocked={blocked}
      canConfirm={ready && !blocked && !!user?.isActive}
      showConfirm={!isAdmin}
      closeLabel={isAdmin ? "Fechar" : "Cancelar"}
      onClose={onClose}
      onRefresh={() => {
        awaitingRefresh.current = true;
        onRefresh();
      }}
      onConfirm={() => void deactivate()}
      error={
        error && (
          <AlertCard variant="error" className="mt-auto" title="Não foi possível desativar.">
            {error}
            {conflictCode === ErrorCode.USER_ASSIGNED_TO_ACTIVE_COA && (
              <Link className="mt-2 block underline" to="/admin/projects">
                Revisar alçadas nas obras
              </Link>
            )}
            {conflictCode === ErrorCode.USER_HAS_PENDING_APPROVALS && (
              <Link className="mt-2 block underline" to="/purchase-orders?status=PENDING">
                Consultar pedidos pendentes
              </Link>
            )}
          </AlertCard>
        )
      }
    >
      {!!user?.isActive && !isAdmin && (
        <>
          <DialogDescription>
            Deseja desativar o usuário: <strong>{user.name}</strong>?
          </DialogDescription>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>O acesso à conta será bloqueado.</li>
            <li>A conta, os pedidos e as decisões anteriores serão preservados.</li>
          </ul>
          <AlertCard variant="warning" title="Ação irreversível:">
            a reativação de usuários não é suportada no momento.
          </AlertCard>
        </>
      )}
      {isAdmin && (
        <DialogDescription>A desativação desta conta de administrador não está disponível.</DialogDescription>
      )}
      {loading && !users && <Loading message="Consultando estado atual…" />}
      {!!readError && !users && <ErrorState error={readError} retry={onRefresh} />}
      {ready && !user && !!id && (
        <AlertCard variant="warning" role="status">
          Cadastro não encontrado. Feche esta janela e confira a lista atualizada.
        </AlertCard>
      )}
      {isAdmin && (
        <AlertCard variant="info" role="status">
          A conta de administrador é protegida e não pode ser desativada.
        </AlertCard>
      )}
      {user && !user.isActive && (
        <AlertCard variant="info" role="status">
          O cadastro já está inativo. Nenhum novo envio é necessário.
        </AlertCard>
      )}
    </DeactivationDialog>
  );
}
