import { useEffect, useRef, useState, type FormEvent } from "react";
import { type DemoPersona } from "@dokimos/shared";
import { Navigate, useLocation } from "react-router";
import { z } from "zod";
import { useAuth } from "./AuthContext";
import { ApiError, errorMessage, fieldMessages } from "@/lib/api";
import { demoPassword } from "./demo-login";
import { Brand } from "@/components/Brand";
import { useTheme } from "@/lib/theme";
import { focusFirstInvalid } from "@/lib/formValidation";
import { internalPath } from "@/lib/paths";
import { useFormErrors } from "@/lib/useFormErrors";
import { withViewTransition } from "@/lib/viewTransition";
import { CredentialsForm } from "./CredentialsForm";
import { DemoPersonas } from "./DemoPersonas";
import styles from "./Login.module.css";

const credentials = z.object({
  username: z.string().trim().min(1, "Informe seu usuário.").max(64, "Use no máximo 64 caracteres."),
  password: z.string().min(1, "Informe sua senha."),
});

/** The sign-in screen: the credentials form, or the demo accounts, which take over the whole panel. */
export function Login() {
  // Applies the saved theme before anyone has signed in.
  useTheme();
  const auth = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const loginErrors = useFormErrors({}, "login");
  const [demo, setDemo] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const usernameInput = useRef<HTMLInputElement>(null);
  const errorCard = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  // Back from the demo accounts, focus returns to the username once the form is on screen again.
  const returning = useRef(false);
  useEffect(() => {
    if (demo) heading.current?.focus();
    else if (returning.current) usernameInput.current?.focus();
    returning.current = false;
  }, [demo]);
  useEffect(() => {
    if (error) errorCard.current?.focus();
  }, [error]);
  const next = internalPath(location.state?.from, "/purchase-orders");
  if (auth.user) return <Navigate to={next} replace />;
  /** One sign-in at a time: locks the screen while it runs and shows why it failed. */
  async function attempt(signIn: () => Promise<void>, onFailure?: (failure: unknown) => void) {
    submitting.current = true;
    setPending(true);
    try {
      await signIn();
    } catch (failure) {
      setError(errorMessage(failure));
      onFailure?.(failure);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const result = credentials.safeParse({ username, password });
    setError("");
    loginErrors.reset();
    if (!result.success) {
      loginErrors.setServerErrors(
        Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message])),
      );
      // After the errors have rendered, so the invalid field is marked when it takes focus.
      requestAnimationFrame(() => focusFirstInvalid(form.current));
      return;
    }
    await attempt(
      () => auth.signIn(result.data.username, result.data.password),
      (failure) => {
        if (failure instanceof ApiError && failure.status === 400) loginErrors.setServerErrors(fieldMessages(failure));
      },
    );
  }
  /** Switches between the sign-in form and the demo accounts; the panel morphs where the browser can animate it. */
  function showDemo(visible: boolean) {
    setError("");
    withViewTransition(() => setDemo(visible));
  }
  async function selectPersona(persona: DemoPersona) {
    if (submitting.current) return;
    setError("");
    loginErrors.reset();
    setUsername(persona.username);
    await attempt(() => auth.signIn(persona.username, demoPassword(persona)));
  }
  return (
    <main className={styles.page}>
      <div className={styles.background} aria-hidden="true">
        <span />
      </div>
      <div className={styles.layout} data-demo={demo || undefined}>
        <section className={styles.intro} aria-labelledby="product-title">
          <Brand large />
          <p className={styles.tagline}>Gestão de pedidos e aprovações por alçada</p>
          <h1 id="product-title" className={styles.headline}>
            Pedidos sob controle.<span>Aprovações na ordem certa.</span>
          </h1>
          <p className={styles.description}>
            Cadastre pedidos de compra, acompanhe cada etapa da aprovação e saiba quem decidiu.
          </p>
        </section>
        <section className={styles.panel} aria-labelledby={demo ? "demo-title" : "login-title"}>
          {!demo ? (
            <CredentialsForm
              username={username}
              password={password}
              onUsernameChange={setUsername}
              onPasswordChange={setPassword}
              pending={pending}
              error={error}
              errors={loginErrors}
              formRef={form}
              usernameRef={usernameInput}
              errorRef={errorCard}
              onSubmit={(event) => void submit(event)}
              onOpenDemo={() => showDemo(true)}
            />
          ) : (
            <DemoPersonas
              pending={pending}
              signingInAs={username}
              error={error}
              errorRef={errorCard}
              headingRef={heading}
              onSelect={(persona) => void selectPersona(persona)}
              onBack={() => {
                returning.current = true;
                showDemo(false);
              }}
            />
          )}
          <p className={styles.footer}>
            Dokimos by ObraFlow · Acesso restrito · by{" "}
            <a href="https://vitor.mattediworks.com" target="_blank" rel="noopener noreferrer">
              Vítor Mattedi
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
