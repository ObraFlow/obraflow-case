import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { DemoPersona } from "@dokimos/shared";
import { AlertCard } from "@/components/ui/AlertCard";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { errorMessage } from "@/lib/api";
import { useAuth } from "./AuthContext";
import { demoPassword } from "./demo-login";
import { PersonaPicker } from "./PersonaPicker";

/**
 * Demonstration only: switch to another seeded profile through the normal login. A failed switch keeps the
 * current session. The caller owns when the dialog is open.
 */
export function PersonaSwitchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  // Every opening starts without the previous failure.
  useEffect(() => {
    if (open) setError("");
  }, [open]);
  if (!user) return null;
  async function select(persona: DemoPersona) {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      await signIn(persona.username, demoPassword(persona));
      navigate("/purchase-orders", { replace: true });
    } catch (failure) {
      setError(`${errorMessage(failure)} Você continua como ${user!.displayName}.`);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent finalFocus={false} showCloseButton={!pending} className="max-h-[90dvh] overflow-y-auto">
        <DialogTitle>Trocar perfil</DialogTitle>
        <DialogDescription>Escolha o perfil de demonstração.</DialogDescription>
        {error && <AlertCard variant="error">{error}</AlertCard>}
        <PersonaPicker currentUsername={user.username} pending={pending} onSelect={(persona) => void select(persona)} />
      </DialogContent>
    </Dialog>
  );
}
