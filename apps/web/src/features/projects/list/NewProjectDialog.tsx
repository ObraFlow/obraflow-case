import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { projectNameSchema, type ProjectSummary } from "@dokimos/shared";
import { ApiError, errorMessage, fieldMessages, isUncertainOutcome } from "@/lib/api";
import { focusFirstInvalid } from "@/lib/formValidation";
import { useFormErrors } from "@/lib/useFormErrors";
import { AlertCard } from "@/components/ui/AlertCard";
import { Button } from "@/components/ui/button";
import { CreationDialog } from "@/components/ui/CreationDialog";
import { DialogFooter } from "@/components/ui/dialog";
import { FieldFeedback } from "@/components/ui/FieldFeedback";
import { createProject } from "../api";

/**
 * Creation of a project, in a dialog. It owns the form, its validation and the recovery from a failed or unknown
 * write; the page owns the list. An unknown outcome blocks another send until the person has checked the list.
 */
export function NewProjectDialog({
  open,
  onOpenChange,
  onPending,
  pending,
  listLoaded,
  onUncertain,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reports a running write, so the page can lock itself and the dialog cannot be dismissed. */
  onPending: (pending: boolean) => void;
  pending: boolean;
  /** The list has been read, so the person can check an uncertain creation against it. */
  listLoaded: boolean;
  /** After an unknown outcome the page reads the list again. */
  onUncertain: () => void;
  /** Called with the created project once the server confirmed it. */
  onCreated: (project: ProjectSummary) => void;
}) {
  const [name, setName] = useState("");
  const [failure, setFailure] = useState("");
  const [uncertain, setUncertain] = useState(false);
  // busy blocks a second submit before the re-render disables the button; live drops responses after unmount.
  const busy = useRef(false);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const parsed = projectNameSchema.safeParse(name);
  const formErrors = useFormErrors(parsed.success ? {} : { name: parsed.error.issues[0].message }, "project");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parsed.success || formErrors.hasServerErrors) {
      formErrors.touchAll(["name"]);
      focusFirstInvalid(event.currentTarget);
      return;
    }
    if (busy.current || uncertain) return;
    busy.current = true;
    onPending(true);
    setFailure("");
    formErrors.setServerErrors({});
    try {
      const created = await createProject(parsed.data);
      if (live.current) onCreated(created);
    } catch (failure) {
      if (!live.current) return;
      setFailure(errorMessage(failure));
      if (failure instanceof ApiError && failure.status === 400) formErrors.setServerErrors(fieldMessages(failure));
      if (isUncertainOutcome(failure)) {
        setUncertain(true);
        onUncertain();
      }
    } finally {
      busy.current = false;
      if (live.current) onPending(false);
    }
  }
  return (
    <CreationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nova obra"
      description="Crie a obra; depois adicione membros e publique a alçada."
      pending={pending}
    >
      <form noValidate onSubmit={(event) => void submit(event)}>
        <div className="min-w-48 flex-1">
          <label htmlFor="project-name">Nome da obra</label>
          <input
            id="project-name"
            value={name}
            disabled={pending}
            {...formErrors.fieldProps("name")}
            onChange={(event) => {
              setName(event.target.value);
              formErrors.edit("name");
            }}
          />
          <FieldFeedback id={formErrors.errorId("name")} message={formErrors.message("name")} compact />
        </div>
        <div className="mt-2 flex h-32 flex-col overflow-y-auto" aria-live="polite">
          {(failure || uncertain) && (
            <AlertCard
              variant="error"
              className="mt-auto"
              title={uncertain ? "Resultado incerto." : "Não foi possível concluir."}
            >
              {failure}
              {uncertain
                ? " A obra pode ter sido criada. Confira a lista atualizada antes de realizar outro cadastro."
                : " O nome foi preservado."}
              {uncertain && (
                <span className="mt-2 block">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!listLoaded}
                    onClick={() => {
                      setUncertain(false);
                      setFailure("");
                    }}
                  >
                    Liberar novo envio
                  </Button>
                </span>
              )}
            </AlertCard>
          )}
        </div>
        <DialogFooter>
          <Button type="submit" disabled={pending || uncertain}>
            <Plus aria-hidden="true" />
            {pending ? "Criando…" : "Criar obra"}
          </Button>
        </DialogFooter>
      </form>
    </CreationDialog>
  );
}
