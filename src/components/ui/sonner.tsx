"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTemaResolvido } from "@/components/layout/tema";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

// O sonner segue o tema do app, não o do sistema operacional: quem escolheu "Claro" no header
// com o sistema escuro veria toasts escuros em uma tela clara.
const Toaster = ({ ...props }: ToasterProps) => {
  const tema = useTemaResolvido();
  return (
    <Sonner
      theme={tema}
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
          error: "border-rejeitado text-rejeitado-texto",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
