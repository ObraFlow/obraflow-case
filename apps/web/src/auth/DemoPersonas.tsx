import type { Ref } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { DEMO_PERSONAS, type DemoPersona } from "@dokimos/shared";
import { AlertCard } from "@/components/ui/AlertCard";
import { UserAvatar } from "@/components/UserAvatar";
import { personaScope } from "./demo-login";
import styles from "./Login.module.css";

// `area` places the group in the two-column grid of the wide layout: requesters and the administrator on the
// left, the three approvers on the right.
const demoScenarios = [
  {
    title: "Solicitante",
    area: "requester",
    description: "Crie pedidos e acompanhe o andamento na sua obra.",
    usernames: ["carlos", "beatriz"],
  },
  {
    title: "Aprovador",
    area: "approver",
    description: "Decida os pedidos na ordem da alçada de cada obra.",
    usernames: ["joao", "amanda", "ricardo"],
  },
  {
    title: "Administrador",
    area: "admin",
    description: "Gerencie usuários, fornecedores, obras e alçadas.",
    usernames: ["admin"],
  },
];

/** The demo accounts grouped by what the reviewer wants to try: request, approve or administer. */
export function DemoPersonas({
  pending,
  signingInAs,
  error,
  errorRef,
  headingRef,
  onSelect,
  onBack,
}: {
  pending: boolean;
  /** Username of the persona being signed in, while a sign-in runs. */
  signingInAs: string;
  error: string;
  errorRef: Ref<HTMLDivElement>;
  /** Receives focus when this view opens. */
  headingRef: Ref<HTMLHeadingElement>;
  onSelect: (persona: DemoPersona) => void;
  onBack: () => void;
}) {
  return (
    <div id="login-demo" className={styles.demoContent}>
      <button type="button" className={styles.backLink} disabled={pending} onClick={onBack}>
        <ArrowLeft aria-hidden="true" size={16} />
        Entrar com usuário e senha
      </button>
      <h2 id="demo-title" className={styles.title} ref={headingRef} tabIndex={-1}>
        Escolha uma persona
      </h2>
      {pending && (
        <p role="status" className={styles.demoNote}>
          Entrando na conta…
        </p>
      )}
      {error && (
        <AlertCard ref={errorRef} tabIndex={-1} variant="error" className="mt-3">
          {error}
        </AlertCard>
      )}
      <div role="group" aria-label="Personas de demonstração" className={styles.scenarios}>
        {demoScenarios.map((scenario) => (
          <section
            key={scenario.title}
            aria-label={scenario.title}
            className={styles.scenario}
            data-area={scenario.area}
          >
            <h3>{scenario.title}</h3>
            <p>{scenario.description}</p>
            <ul className="persona-list">
              {scenario.usernames.map((username) => {
                const persona = DEMO_PERSONAS.find((candidate) => candidate.username === username)!;
                return (
                  <li key={username}>
                    <PersonaOption
                      persona={persona}
                      pending={pending}
                      signingIn={pending && signingInAs === username}
                      onSelect={onSelect}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <p className={styles.demoNote}>Estes são cenários de demonstração, não perfis do sistema.</p>
    </div>
  );
}

/** One demo account to sign in as. While its sign-in runs the arrow becomes a spinner. */
function PersonaOption({
  persona,
  pending,
  signingIn,
  onSelect,
}: {
  persona: DemoPersona;
  /** Any sign-in is running: every option is disabled. */
  pending: boolean;
  /** The running sign-in is this option's. */
  signingIn: boolean;
  onSelect: (persona: DemoPersona) => void;
}) {
  return (
    <button
      type="button"
      className="persona-option"
      disabled={pending}
      onClick={() => onSelect(persona)}
      aria-label={`Entrar como ${persona.displayName}: ${personaScope(persona)}`}
      aria-busy={signingIn || undefined}
    >
      <UserAvatar username={persona.username} displayName={persona.displayName} size={32} />
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-semibold">{persona.displayName}</span>{" "}
        <span className={styles.personaDetail}>{personaScope(persona)}</span>
      </span>
      {signingIn ? (
        <LoaderCircle aria-hidden="true" size={16} className="motion-safe:animate-spin" />
      ) : (
        <ArrowRight aria-hidden="true" size={16} />
      )}
    </button>
  );
}
