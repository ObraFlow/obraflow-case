import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { createUserSchema, ErrorCode, type UserSummary } from "@dokimos/shared";
import { ApiError, errorMessage, fieldMessages, isUncertainOutcome } from "@/lib/api";
import { focusFirstInvalid } from "@/lib/formValidation";
import { useFormErrors } from "@/lib/useFormErrors";
import { CreationStatus } from "@/components/directory/CreationStatus";
import { AlertCard } from "@/components/ui/AlertCard";
import { Button } from "@/components/ui/button";
import { CreationDialog } from "@/components/ui/CreationDialog";
import { DialogFooter } from "@/components/ui/dialog";
import { FieldFeedback } from "@/components/ui/FieldFeedback";
import { createUser } from "./api";
import { PasswordField } from "./PasswordField";

/**
 * Creation of a user, in a dialog. It owns the form, its validation and the recovery from a failed or unknown
 * write; the page owns the list. An unknown outcome blocks another send until the person has checked the list.
 */
export function NewUserDialog({
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
  /** The list is loaded, so a duplicate can be told from a new user. */
  ready: boolean;
  loading: boolean;
  readError: unknown;
  onRetryRead: () => void;
  /** Called with the created user once the server confirmed it. */
  onCreated: (user: UserSummary) => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
  const parsed = createUserSchema.safeParse({ displayName: name, username, password });
  const errors: Record<string, string> = parsed.success
    ? {}
    : Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), issue.message]));
  const formErrors = useFormErrors(errors, "user");
  const feedback = (field: string) => (
    <FieldFeedback id={formErrors.errorId(field)} message={formErrors.message(field)} compact />
  );
  function clearForm() {
    setName("");
    setUsername("");
    setPassword("");
    formErrors.reset();
    setFailure("");
    setUncertain(false);
  }
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!parsed.success || formErrors.hasServerErrors) {
      formErrors.touchAll(["displayName", "username", "password"]);
      focusFirstInvalid(form.current);
      return;
    }
    if (!ready || busy.current || uncertain) return;
    busy.current = true;
    onPending(true);
    setFailure("");
    try {
      const created = await createUser(createUserSchema.parse(parsed.data));
      if (!live.current) return;
      clearForm();
      onOpenChange(false);
      onCreated(created);
    } catch (failure) {
      if (!live.current) return;
      setFailure(errorMessage(failure));
      if (failure instanceof ApiError && failure.status === 400) formErrors.setServerErrors(fieldMessages(failure));
      if (failure instanceof ApiError && failure.code === ErrorCode.USERNAME_ALREADY_EXISTS)
        formErrors.setServerErrors({ username: "Este usuário já existe. Escolha outro." });
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
      title="Novo usuário"
      description={
        <>
          Crie um usuário com o perfil <strong>Usuário</strong>.
        </>
      }
      pending={pending}
    >
      <form ref={form} noValidate onSubmit={(event) => void submit(event)} className="space-y-2">
        <fieldset disabled={pending} className="grid min-w-0 gap-3 border-0 p-0 sm:grid-cols-2">
          <div>
            <label htmlFor="directory-name">Nome de exibição</label>
            <input
              id="directory-name"
              value={name}
              {...formErrors.fieldProps("displayName")}
              onChange={(event) => {
                setName(event.target.value);
                formErrors.edit("displayName");
              }}
            />
            {feedback("displayName")}
          </div>
          <div>
            <label htmlFor="directory-username">Usuário</label>
            <input
              id="directory-username"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              {...formErrors.fieldProps("username")}
              onChange={(event) => {
                setUsername(event.target.value);
                formErrors.edit("username");
              }}
            />
            {feedback("username")}
          </div>
          <PasswordField
            value={password}
            invalidProps={formErrors.fieldProps("password")}
            errorId={formErrors.errorId("password")}
            feedback={feedback("password")}
            onChange={(next) => {
              setPassword(next);
              formErrors.edit("password");
            }}
          />
        </fieldset>
        <div className="grid gap-2">
          <AlertCard variant="warning">
            Depois de criar o usuário, é necessário dar acesso a cada obra em que ele deva atuar, na administração de
            obras.
          </AlertCard>
          <AlertCard variant="error" title="Atenção:">
            neste sistema de demonstração a senha não pode ser recuperada. Guarde-a em local seguro.
          </AlertCard>
        </div>
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
            {creating ? "Criando…" : "Criar usuário"}
          </Button>
        </DialogFooter>
      </form>
    </CreationDialog>
  );
}
