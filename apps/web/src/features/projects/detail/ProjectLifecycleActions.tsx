import { AlertCard } from "@/components/ui/AlertCard";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, errorMessage, isUncertainOutcome, fieldMessages } from "@/lib/api";
import { getProjects, renameProject, setProjectActive } from "@/features/projects/api";
import { type ProjectSummary, ErrorCode, projectNameSchema } from "@dokimos/shared";
import { Button } from "@/components/ui/button";
import { CreationDialog } from "@/components/ui/CreationDialog";
import { DialogFooter } from "@/components/ui/dialog";
import { FieldFeedback } from "@/components/ui/FieldFeedback";
import { useToast } from "@/components/ToastProvider";
import { focusFirstInvalid } from "@/lib/formValidation";
import { useFormErrors } from "@/lib/useFormErrors";

type LifecycleAction = "rename" | "archive" | "reactivate";

/** The wording of each action: dialog title and explanation, confirm button, and the toast once it is done. */
const actionText: Record<LifecycleAction, { title: string; description: string; confirm: string; done: string }> = {
  rename: {
    title: "Renomear obra",
    description: "Altere o nome da obra.",
    confirm: "Salvar nome",
    done: "Obra renomeada",
  },
  archive: {
    title: "Arquivar obra",
    description:
      "O arquivamento impede novos pedidos e alterações nos membros e na alçada. Pedidos e versões anteriores continuam disponíveis para consulta. Conclua todos os pedidos pendentes antes de arquivar.",
    confirm: "Confirmar arquivamento",
    done: "Obra arquivada",
  },
  reactivate: {
    title: "Reativar obra",
    description: "A obra voltará a aceitar pedidos e alterações na configuração.",
    confirm: "Confirmar reativação",
    done: "Obra reativada",
  },
};

export function ProjectLifecycleActions({
  project,
  disabled,
  onChanged,
  onPending,
}: {
  project: ProjectSummary;
  disabled: boolean;
  onChanged: (project: ProjectSummary) => void;
  onPending: (pending: boolean) => void;
}) {
  const [action, setAction] = useState<LifecycleAction | null>(null);
  const [name, setName] = useState(project.name);
  const [failure, setFailure] = useState("");
  const [uncertain, setUncertain] = useState(false);
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
  const parsed = projectNameSchema.safeParse(name);
  const formErrors = useFormErrors(parsed.success ? {} : { name: parsed.error.issues[0].message }, "rename-project");
  // A closed dialog renders nothing, so which text it holds then does not matter.
  const text = actionText[action ?? "reactivate"];
  function start(next: typeof action) {
    if (next === "rename" && !project.isActive) return;
    setAction(next);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (action === "rename" && (!parsed.success || formErrors.hasServerErrors)) {
      formErrors.touchAll(["name"]);
      focusFirstInvalid(event.currentTarget);
      return;
    }
    if (!action || busy.current || disabled || uncertain || (action === "rename" && !project.isActive)) return;
    busy.current = true;
    setPending(true);
    onPending(true);
    setFailure("");
    try {
      const result =
        action === "rename"
          ? await renameProject(project.id, parsed.data!)
          : await setProjectActive(project.id, action === "reactivate");
      if (live.current) {
        onChanged(result);
        setName(result.name);
        setAction(null);
        formErrors.reset();
        toast({
          id: `project:${project.id}:${action}:${Date.now()}`,
          title: text.done,
          description: result.name,
        });
      }
    } catch (error) {
      if (!live.current) return;
      setFailure(errorMessage(error));
      if (error instanceof ApiError && error.status === 400) formErrors.setServerErrors(fieldMessages(error));
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
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    onPending(true);
    try {
      const result = (await getProjects()).data.find((value) => value.id === project.id);
      if (!result) throw new ApiError(404, ErrorCode.NOT_FOUND, "Obra não encontrada.");
      if (live.current) {
        onChanged(result);
        setUncertain(false);
        setFailure("");
        setAction(null);
      }
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
    <div className="flex flex-wrap gap-2">
      {project.isActive && (
        <Button variant="outline" disabled={disabled || pending} onClick={() => start("rename")}>
          Renomear obra
        </Button>
      )}
      <Button
        variant="outline"
        disabled={disabled || pending}
        onClick={() => start(project.isActive ? "archive" : "reactivate")}
      >
        {project.isActive ? "Arquivar obra" : "Reativar obra"}
      </Button>
      <CreationDialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        title={text.title}
        pending={pending}
        description={text.description}
      >
        <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
          {action === "rename" ? (
            <div>
              <label htmlFor="rename-project-name">Nome da obra</label>
              <input
                id="rename-project-name"
                value={name}
                disabled={pending || uncertain || !project.isActive}
                {...formErrors.fieldProps("name")}
                onChange={(event) => {
                  setName(event.target.value);
                  formErrors.edit("name");
                }}
              />
              <FieldFeedback id={formErrors.errorId("name")} message={formErrors.message("name")} />
            </div>
          ) : (
            <p className="break-words font-medium">{project.name}</p>
          )}
          {action === "rename" && !project.isActive && (
            <AlertCard variant="info">
              Obras arquivadas não podem ser renomeadas. Reative a obra para alterar seu nome.
            </AlertCard>
          )}
          {failure && <AlertCard variant="error">{failure}</AlertCard>}
          {uncertain && (
            <AlertCard variant="warning">
              <p>
                Resultado incerto. Consulte o estado atual da obra antes de realizar outra alteração. O nome digitado
                foi preservado.
              </p>
              <Button type="button" variant="outline" disabled={pending} onClick={() => void reconcile()}>
                Consultar estado atual da obra
              </Button>
            </AlertCard>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setAction(null)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={action === "archive" ? "destructive" : "save"}
              disabled={pending || disabled || uncertain || (action === "rename" && !project.isActive)}
            >
              {pending ? "Salvando…" : text.confirm}
            </Button>
          </DialogFooter>
        </form>
      </CreationDialog>
    </div>
  );
}
