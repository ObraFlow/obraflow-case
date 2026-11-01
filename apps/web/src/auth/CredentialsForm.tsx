import { useState, type FormEvent, type Ref } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { AlertCard } from "@/components/ui/AlertCard";
import { Button } from "@/components/ui/button";
import type { useFormErrors } from "@/lib/useFormErrors";
import styles from "./Login.module.css";

/** The username and password form, with the entry to the demo accounts beneath it. */
export function CredentialsForm({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  pending,
  error,
  errors,
  formRef,
  usernameRef,
  errorRef,
  onSubmit,
  onOpenDemo,
}: {
  username: string;
  password: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  pending: boolean;
  /** The message of a rejected sign-in, or empty. */
  error: string;
  errors: ReturnType<typeof useFormErrors>;
  formRef: Ref<HTMLFormElement>;
  usernameRef: Ref<HTMLInputElement>;
  errorRef: Ref<HTMLDivElement>;
  onSubmit: (event: FormEvent) => void;
  onOpenDemo: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <>
      <h2 id="login-title" className={styles.title}>
        Acesse sua conta
      </h2>
      <p className={styles.subtitle}>Entre com seu usuário e senha para continuar no Dokimos.</p>
      <form ref={formRef} onSubmit={onSubmit} className={styles.form} noValidate aria-label="Acessar Dokimos">
        <fieldset disabled={pending} className={styles.fields}>
          <legend className="sr-only">Credenciais de acesso</legend>
          <div>
            <label htmlFor="username">Usuário</label>
            <div className={styles.input}>
              <UserRound aria-hidden="true" />
              <input
                ref={usernameRef}
                id="username"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Seu usuário"
                value={username}
                onChange={(event) => onUsernameChange(event.target.value)}
                {...errors.fieldProps("username")}
              />
            </div>
            {errors.message("username") && (
              <p id={errors.errorId("username")} className="field-error">
                {errors.message("username")}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="password">Senha</label>
            <div className={`${styles.input} ${styles.password}`}>
              <LockKeyhole aria-hidden="true" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Sua senha"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                {...errors.fieldProps("password")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </Button>
            </div>
            {errors.message("password") && (
              <p id={errors.errorId("password")} className="field-error">
                {errors.message("password")}
              </p>
            )}
          </div>
        </fieldset>
        {error && (
          <AlertCard ref={errorRef} tabIndex={-1} variant="error">
            {error}
          </AlertCard>
        )}
        <Button type="submit" disabled={pending} className={styles.submit} size="lg">
          {pending ? "Entrando…" : "Entrar"}
          <ArrowRight aria-hidden="true" />
        </Button>
      </form>
      <button
        type="button"
        className={styles.demo}
        disabled={pending}
        aria-labelledby="demo-entry-title demo-entry-description"
        onClick={onOpenDemo}
      >
        <span>
          <span id="demo-entry-title" className={styles.demoTitle}>
            Explore o fluxo de aprovação
          </span>{" "}
          <span id="demo-entry-description" className={styles.demoDescription}>
            Acesse com as contas de demonstração do ambiente.
          </span>
        </span>
        <ArrowRight aria-hidden="true" size={16} />
      </button>
    </>
  );
}
