import { useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/api";
import { deactivateSupplier } from "@/features/suppliers/api";
import type { SupplierSummary } from "@dokimos/shared";
import { useToast } from "@/components/ToastProvider";
import { Loading } from "@/components/Loading";
import { ErrorState } from "@/components/Feedback";
import { AlertCard } from "@/components/ui/AlertCard";
import { DialogDescription } from "@/components/ui/dialog";
import { DeactivationDialog } from "@/components/directory/DeactivationDialog";

/** Confirmed logical deactivation of one supplier. The page owns the list; this owns the dialog and its write. */
export function SupplierDeactivationDialog({
  id,
  suppliers,
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
  suppliers: SupplierSummary[] | null;
  ready: boolean;
  loading: boolean;
  readError: unknown;
  pending: boolean;
  onClose: () => void;
  onPending: (pending: boolean) => void;
  onRefresh: () => void;
  onConfirmed: (id: string) => void;
}) {
  const supplier = suppliers?.find((value) => value.id === id);
  const [error, setError] = useState("");
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
  // Another supplier starts clean.
  useEffect(() => {
    setError("");
    setBlocked(false);
    awaitingRefresh.current = false;
  }, [id]);
  // A refresh asked from this dialog lifts the block once its result arrives.
  useEffect(() => {
    if (!awaitingRefresh.current) return;
    awaitingRefresh.current = false;
    setBlocked(false);
    setError("");
  }, [suppliers]);
  async function deactivate() {
    if (!supplier || blocked || !supplier.isActive || !ready || busy.current || pending) return;
    busy.current = true;
    onPending(true);
    setError("");
    try {
      await deactivateSupplier(supplier.id);
      if (!live.current) return;
      onConfirmed(supplier.id);
      toast({
        id: `suppliers:deactivated:${supplier.id}`,
        title: "Fornecedor desativado",
        description: supplier.name,
      });
      onClose();
    } catch (failure) {
      if (!live.current) return;
      setBlocked(true);
      setError(`${errorMessage(failure)} Consulte o estado atualizado antes de confirmar novamente.`);
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
      title="Desativar fornecedor"
      pending={pending}
      loading={loading}
      blocked={blocked}
      canConfirm={ready && !blocked && !!supplier?.isActive}
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
          </AlertCard>
        )
      }
    >
      {!!supplier?.isActive && (
        <>
          <DialogDescription>
            Deseja desativar o fornecedor: <strong>{supplier.name}</strong>?
          </DialogDescription>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>Novos pedidos não poderão usar este fornecedor.</li>
            <li>Pedidos anteriores, inclusive os em andamento, não serão afetados.</li>
          </ul>
          <AlertCard variant="warning" title="Ação irreversível:">
            a reativação de fornecedores não é suportada no momento.
          </AlertCard>
        </>
      )}
      {supplier?.isActive && suppliers?.filter((entry) => entry.isActive).length === 1 && (
        <AlertCard variant="error" title="Único fornecedor ativo.">
          Desativá-lo impedirá a criação de novos pedidos até que outro fornecedor ativo seja cadastrado.
        </AlertCard>
      )}
      {loading && !suppliers && <Loading message="Consultando estado atual…" />}
      {!!readError && !suppliers && <ErrorState error={readError} retry={onRefresh} />}
      {ready && !supplier && !!id && (
        <AlertCard variant="warning" role="status">
          Cadastro não encontrado. Feche esta janela e confira a lista atualizada.
        </AlertCard>
      )}
      {supplier && !supplier.isActive && (
        <AlertCard variant="info" role="status">
          O cadastro já está inativo. Nenhum novo envio é necessário.
        </AlertCard>
      )}
    </DeactivationDialog>
  );
}
