import { useId } from "react";
import { Monitor, Moon, Palette, Sun } from "lucide-react";
import type { useTheme } from "@/lib/theme";

const options = [
  ["light", "Claro", Sun],
  ["dark", "Escuro", Moon],
  ["system", "Sistema", Monitor],
] as const;

/** The light, dark or system choice in the account panel. The theme itself lives in `useTheme`. */
export function ThemeControl({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const id = useId();
  return (
    <fieldset className="account-theme" aria-label="Aparência">
      <legend className="sr-only">Aparência</legend>
      <span className="account-theme-label" aria-hidden="true">
        <Palette size={16} />
        Aparência
      </span>
      <div className="account-theme-options">
        {options.map(([mode, label, Icon]) => (
          <label key={mode} title={label}>
            <input
              type="radio"
              aria-label={label}
              name={id}
              value={mode}
              checked={theme.mode === mode}
              onChange={() => theme.changeMode(mode)}
            />
            <span>
              <Icon size={16} aria-hidden="true" />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
