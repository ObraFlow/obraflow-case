import { useState, type ReactNode } from "react";
import { Copy, Dices, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** The initial-password input with its three helpers: generate a random one, copy it, show or hide it. */
export function PasswordField({
  value,
  onChange,
  invalidProps,
  errorId,
  feedback,
}: {
  value: string;
  /** Called with the new text; the caller clears the field's error. */
  onChange: (password: string) => void;
  /** Validity attributes from useFormErrors, spread onto the input. */
  invalidProps: object;
  errorId: string;
  feedback: ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  function generate() {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    onChange(Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join(""));
    setShown(true);
    setCopied(false);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="sm:col-span-2">
      <label htmlFor="directory-password">Senha inicial</label>
      <div className="relative">
        <input
          className="pr-28"
          id="directory-password"
          type={shown ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          {...invalidProps}
          aria-describedby={`password-hint ${errorId}`}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Gerar senha aleatória"
            title="Gerar senha aleatória"
            onClick={generate}
          >
            <Dices aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={copied ? "Senha copiada" : "Copiar senha"}
            title={copied ? "Copiada" : "Copiar senha"}
            disabled={!value}
            onClick={() => void copy()}
          >
            <Copy aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={shown ? "Ocultar senha inicial" : "Mostrar senha inicial"}
            aria-pressed={shown}
            onClick={() => setShown((current) => !current)}
          >
            {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        </div>
      </div>
      <p id="password-hint" className="mt-1 text-xs text-muted-foreground">
        De 8 a 256 caracteres.
      </p>
      {feedback}
    </div>
  );
}
