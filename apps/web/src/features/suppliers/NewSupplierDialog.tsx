import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { createSupplierSchema, type SupplierSummary } from "@dokimos/shared";
import { ApiError, errorMessage, fieldMessages, isUncertainOutcome } from "@/lib/api";
import { focusFirstInvalid } from "@/lib/formValidation";
import { useFormErrors } from "@/lib/useFormErrors";
import { CreationStatus } from "@/components/directory/CreationStatus";
import { Button } from "@/components/ui/button";
import { CreationDialog } from "@/components/ui/CreationDialog";
import { DialogFooter } from "@/components/ui/dialog";
import { FieldFeedback } from "@/components/ui/FieldFeedback";
import { createSupplier } from "./api";

/**
 * Creation of a supplier, in a dialog. It owns the form, its validation and the recovery from a failed or unknown
 * write; the page owns the list. An unknown outcome blocks another send until the person has checked the list.
 */
export function NewSupplierDialog({
  open,
  onOpenChange,
  pending,
  creating,
  onPending,
  ready,
  loading,
  readError,
  onRetryRead,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Any write on the page is running; the form is locked and the dialog cannot be dismissed. */
  pending: boolean;
  /** The running write is this form's. */
  creating: boolean;
  onPending: (pending: boolean) => void;
  /** The list is loaded, so a duplicate can be told from a new supplier. */
  ready: boolean;
  loading: boolean;
  readError: unknown;
  onRetryRead: () => void;
  /** Called with the created supplier once the server confirmed it. */
  onCreated: (supplier: SupplierSummary) => void;
}) {
  const [name, setName] = useState("");
  const [failure, setFailure] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  // busy blocks a second submit before the re-render disables the button; live drops responses after unmount.
  const busy = useRef(false);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const parsed = createSupplierSchema.safeParse({ name });
  const errors: Record<string, string> = parsed.success
    ? {}
    : Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), issue.message]));
  const formErrors = useFormErrors(errors, "supplier");
  function clearForm() {
    setName("");
    formErrors.reset();
    setFailure("");
    setUncertain(false);
  }
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!parsed.success || formErrors.hasServerErrors) {
      formErrors.touchAll(["name"]);
      focusFirstInvalid(form.current);
      return;
    }
    if (!ready || busy.current || uncertain) return;
    busy.current = true;
    onPending(true);
    setFailure("");
    try {
      const created = await createSupplier(createSupplierSchema.parse(parsed.data));
      if (!live.current) return;
      clearForm();
      onOpenChange(false);
      onCreated(created);
    } catch (failure) {
      if (!live.current) return;
      setFailure(errorMessage(failure));
      if (failure instanceof ApiError && failure.status === 400) formErrors.setServerErrors(fieldMessages(failure));
      if (isUncertainOutcome(failure)) setUncertain(true);
    } finally {
      busy.current = false;
      if (live.current) {
        onPending(false);
        onRetryRead();
      }
    }
  }
  return (
    <CreationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Novo fornecedor"
      description="O fornecedor ficará disponível para seleção em novos pedidos."
      pending={pending}
    >
      <form ref={form} noValidate onSubmit={(event) => void submit(event)} className="space-y-2">
        <fieldset disabled={pending} className="grid min-w-0 gap-3 border-0 p-0 ">
          <div>
            <label htmlFor="directory-name">Nome do fornecedor</label>
            <input
              id="directory-name"
              value={name}
              {...formErrors.fieldProps("name")}
              onChange={(event) => {
                setName(event.target.value);
                formErrors.edit("name");
              }}
            />
            <FieldFeedback id={formErrors.errorId("name")} message={formErrors.message("name")} compact />
          </div>
        </fieldset>
        <CreationStatus
          failure={failure}
          uncertain={uncertain}
          readError={readError}
          loading={loading}
          ready={ready}
          pending={pending}
          onRetryRead={onRetryRead}
          onAcknowledge={() => {
            setUncertain(false);
            setFailure("");
          }}
        />
        <DialogFooter>
          <Button type="submit" disabled={!ready || pending || uncertain}>
            <Plus aria-hidden="true" />
            {creating ? "Criando…" : "Criar fornecedor"}
          </Button>
        </DialogFooter>
      </form>
    </CreationDialog>
  );
}
