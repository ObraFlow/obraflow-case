import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, errorMessage, isUncertainOutcome, fieldMessages } from "@/lib/api";
import { getSuppliers, renameSupplier } from "@/features/suppliers/api";
import { renameSupplierSchema, type SupplierSummary, ErrorCode } from "@dokimos/shared";
import { focusFirstInvalid } from "@/lib/formValidation";
import { useFormErrors } from "@/lib/useFormErrors";
import { useToast } from "@/components/ToastProvider";
import { AlertCard } from "@/components/ui/AlertCard";
import { Button } from "@/components/ui/button";
import { CreationDialog } from "@/components/ui/CreationDialog";
import { DialogFooter } from "@/components/ui/dialog";
import { FieldFeedback } from "@/components/ui/FieldFeedback";

export function SupplierRenameDialog({
  id,
  suppliers,
  ready,
  loading,
  onClose,
  onPending,
  onConfirmed,
  onRefresh,
}: {
  id: string | null;
  suppliers: SupplierSummary[] | null;
  ready: boolean;
  loading: boolean;
  onClose: () => void;
  onPending: (pending: boolean) => void;
  onConfirmed: (supplier: SupplierSummary) => void;
  onRefresh: () => void;
}) {
  const supplier = suppliers?.find((value) => value.id === id);
  const [draft, setDraft] = useState({ id: "", name: "" });
  const [failure, setFailure] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [pending, setPending] = useState(false);
  const busy = useRef(false),
    live = useRef(true);
  const { success: toast } = useToast();
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const parsed = renameSupplierSchema.safeParse({ name: draft.name });
  const formErrors = useFormErrors(parsed.success ? {} : { name: parsed.error.issues[0].message }, "rename-supplier");
  const resetErrors = formErrors.reset;
  // A refresh or dismissal must not replace this supplier's unsaved name.
  useEffect(() => {
    if (!supplier || supplier.id === draft.id) return;
    setDraft({ id: supplier.id, name: supplier.name });
    resetErrors();
    setFailure("");
    setUncertain(false);
    setBlocked(false);
  }, [supplier, draft.id, resetErrors]);
  const eligible = ready && !!supplier?.isActive && draft.id === id;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parsed.success || formErrors.hasServerErrors) {
      formErrors.touchAll(["name"]);
      focusFirstInvalid(event.currentTarget);
      return;
    }
    if (!eligible || busy.current || uncertain || blocked || !id) return;
    busy.current = true;
    setPending(true);
    onPending(true);
    setFailure("");
    try {
      const result = await renameSupplier(id, parsed.data.name);
      if (!live.current) return;
      onConfirmed(result);
      onClose();
      setDraft({ id: result.id, name: result.name });
      formErrors.reset();
      toast({
        id: `supplier:renamed:${result.id}:${Date.now()}`,
        title: "Fornecedor renomeado",
        description: result.name,
      });
    } catch (error) {
      if (!live.current) return;
      setFailure(errorMessage(error));
      if (error instanceof ApiError && error.status === 400) formErrors.setServerErrors(fieldMessages(error));
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) setBlocked(true);
      if (isUncertainOutcome(error)) setUncertain(true);
    } finally {
      busy.current = false;
      if (live.current) {
        setPending(false);
        onPending(false);
      }
    }
  }
  async function reconcile() {
    if (!id || busy.current) return;
    busy.current = true;
    setPending(true);
    onPending(true);
    try {
      const result = (await getSuppliers()).data.find((value) => value.id === id);
      if (!result) throw new ApiError(404, ErrorCode.NOT_FOUND, "Fornecedor não encontrado.");
      if (!live.current) return;
      onConfirmed(result);
      setUncertain(false);
      setBlocked(false);
      setFailure("");
      if (result.name === parsed.data?.name) onClose();
    } catch (error) {
      if (live.current) setFailure(errorMessage(error));
    } finally {
      busy.current = false;
      if (live.current) {
        setPending(false);
        onPending(false);
      }
    }
  }
  return (
    <CreationDialog
      open={!!id}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      title="Renomear fornecedor"
      description="Altere o nome de um fornecedor ativo."
      pending={pending}
    >
      <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
        <SupplierStatusNotice loading={loading} ready={ready} supplier={supplier} onRefresh={onRefresh} />
        <div>
          <label htmlFor="rename-supplier-name">Nome do fornecedor</label>
          <input
            id="rename-supplier-name"
            value={draft.name}
            disabled={!eligible || pending || uncertain || blocked}
            {...formErrors.fieldProps("name")}
            onChange={(event) => {
              setDraft((previous) => ({ ...previous, name: event.target.value }));
              formErrors.edit("name");
            }}
          />
          <FieldFeedback id={formErrors.errorId("name")} message={formErrors.message("name")} />
        </div>
        {failure && <AlertCard variant="error">{failure}</AlertCard>}
        {(uncertain || blocked) && (
          <AlertCard variant="warning">
            <p>
              {uncertain
                ? "Resultado incerto. Consulte o estado atual antes de realizar outra alteração. O nome digitado foi preservado."
                : "O cadastro pode ter mudado. Consulte o estado atual antes de tentar novamente."}
            </p>
            <Button type="button" variant="outline" disabled={pending} onClick={() => void reconcile()}>
              Consultar estado atual do fornecedor
            </Button>
          </AlertCard>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="save" disabled={!eligible || pending || uncertain || blocked}>
            {pending ? "Salvando…" : "Salvar nome"}
          </Button>
        </DialogFooter>
      </form>
    </CreationDialog>
  );
}

/** Why the supplier cannot be renamed right now, if it cannot: still loading, unconfirmed, missing or inactive. */
function SupplierStatusNotice({
  loading,
  ready,
  supplier,
  onRefresh,
}: {
  loading: boolean;
  ready: boolean;
  supplier: SupplierSummary | undefined;
  onRefresh: () => void;
}) {
  if (loading) return <p role="status">Consultando fornecedor…</p>;
  if (!ready)
    return (
      <AlertCard variant="warning">
        Não foi possível confirmar o cadastro. Atualize os fornecedores antes de salvar.
        <span className="mt-2 block">
          <Button type="button" variant="outline" onClick={onRefresh}>
            Consultar fornecedores novamente
          </Button>
        </span>
      </AlertCard>
    );
  if (!supplier)
    return (
      <AlertCard variant="warning">
        Fornecedor não encontrado. Feche esta janela e confira a lista atualizada.
      </AlertCard>
    );
  if (!supplier.isActive)
    return <AlertCard variant="info">Este fornecedor está inativo e não pode ser renomeado.</AlertCard>;
  return null;
}
