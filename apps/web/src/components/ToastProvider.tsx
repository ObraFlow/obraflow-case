import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { getToken, isCurrentToken } from "@/lib/session";
import type { ThemeMode } from "@/lib/theme";
import styles from "./ToastProvider.module.css";

type ToastVariant = "success" | "error" | "warning" | "info";
type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  action?: { label: ReactNode; onClick: () => void };
  onClick?: () => void;
  onDismiss?: () => void;
};
type ToastApi = Record<ToastVariant, (message: ToastMessage) => void>;
const ToastContext = createContext<ToastApi | null>(null);

// Mounted only in the authenticated shell. Callers capture this session's
// methods before awaiting a write; they stay usable across route changes only.
export function ToastProvider({ theme, children }: { theme: ThemeMode; children: ReactNode }) {
  const toasterId = useId();
  const token = getToken();
  const active = useRef(true);
  const ids = useRef(new Set<string>());
  const current = useCallback(() => active.current && isCurrentToken(token), [token]);
  useEffect(() => {
    active.current = true;
    const shown = ids.current;
    return () => {
      active.current = false;
      shown.forEach((id) => toast.dismiss(id));
    };
  }, []);
  const notify = useCallback(
    (variant: ToastVariant, { id, title, description, action, onClick, onDismiss }: ToastMessage) => {
      if (!current()) return;
      const scopedId = `${toasterId}:${variant}:${id}`;
      // Successful writes notify once; repeated read failures may notify again.
      if (variant === "success" && ids.current.has(scopedId)) return;
      ids.current.add(scopedId);
      const activate = () => {
        if (!current()) return;
        onClick?.();
        toast.dismiss(scopedId);
      };
      toast[variant](
        onClick ? (
          <button type="button" className={styles.toastTrigger} onClick={activate}>
            {title}
          </button>
        ) : (
          title
        ),
        {
          id: scopedId,
          toasterId,
          description,
          className: onClick ? styles.clickable : undefined,
          onDismiss: onDismiss
            ? () => {
                if (current()) onDismiss();
              }
            : undefined,
          ...(action
            ? {
                duration: 10000,
                action: {
                  label: action.label,
                  onClick: () => {
                    if (current()) action.onClick();
                  },
                },
              }
            : {}),
        },
      );
    },
    [current, toasterId],
  );
  const notifications = useMemo<ToastApi>(
    () => ({
      success: (message) => notify("success", message),
      error: (message) => notify("error", message),
      warning: (message) => notify("warning", message),
      info: (message) => notify("info", message),
    }),
    [notify],
  );
  return (
    <ToastContext.Provider value={notifications}>
      {children}
      <Toaster
        id={toasterId}
        theme={theme}
        position="top-right"
        richColors
        visibleToasts={3}
        duration={5000}
        closeButton
        customAriaLabel="Notificações"
        hotkey={["altKey", "KeyT"]}
        className={styles.toaster}
        offset={24}
        mobileOffset={{ left: 16, right: 16, top: "max(16px, env(safe-area-inset-top))" }}
        toastOptions={{ closeButtonAriaLabel: "Fechar notificação", classNames: { toast: styles.toast } }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const notifications = useContext(ToastContext);
  if (!notifications) throw new Error("Missing authenticated ToastProvider");
  return notifications;
}

export function useRefreshFailure(scope?: string) {
  const notifications = useContext(ToastContext);
  const id = useId();
  return useCallback(() => {
    if (!notifications) throw new Error("Missing authenticated ToastProvider");
    notifications.error({ id: `refresh:${scope ?? id}`, title: "Não foi possível atualizar." });
  }, [notifications, scope, id]);
}
