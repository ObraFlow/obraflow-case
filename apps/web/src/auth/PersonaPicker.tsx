import { DEMO_PERSONAS, type DemoPersona } from "@dokimos/shared";
import { ArrowRight, Check } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { personaScope } from "./demo-login";

/** Demo profiles for the account menu's "Trocar perfil" dialog. The current profile is shown as
 * selected (not as an unavailable option) and does nothing when activated. */
export function PersonaPicker({
  currentUsername,
  pending,
  onSelect,
}: {
  currentUsername?: string;
  pending: boolean;
  onSelect: (persona: DemoPersona) => void;
}) {
  return (
    <div className="space-y-4">
      <ul className="persona-list" aria-label="Personas de demonstração">
        {DEMO_PERSONAS.map((persona) => {
          const current = currentUsername === persona.username;
          return (
            <li key={persona.username}>
              <button
                type="button"
                className="persona-option"
                data-current={current || undefined}
                aria-current={current ? "true" : undefined}
                aria-disabled={current || undefined}
                disabled={pending && !current}
                onClick={() => {
                  if (!current) onSelect(persona);
                }}
                aria-label={`Entrar como ${persona.displayName}${current ? " · conta atual" : ""}`}
              >
                <UserAvatar username={persona.username} displayName={persona.displayName} size={44} />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-semibold">{persona.displayName}</span>{" "}
                  <span className="mt-1 block text-xs text-muted-foreground">{personaScope(persona)}</span>
                </span>
                {current ? (
                  <span className="persona-current">
                    <Check aria-hidden="true" size={13} />
                    Conta atual
                  </span>
                ) : (
                  <ArrowRight aria-hidden="true" size={16} />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Entrando na conta…
        </p>
      )}
    </div>
  );
}
