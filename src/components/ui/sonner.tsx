"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

// Tema fixo: o produto não tem modo escuro (docs/design.md). Sem isso o sonner seguiria o
// sistema operacional e mostraria toasts escuros em uma tela clara.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          // Sem sombra (docs/design.md); erro se distingue por borda e texto, não só pelo ícone.
          toast: "cn-toast shadow-none!",
          error: "border-rejeitado text-rejeitado-texto-escuro",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
