import { Component, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";

class RenderBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    // Never render the exception or retry a write. Reload is an explicit choice;
    // the feature's sessionStorage submission marker survives the remount.
    return (
      <section role="alert" className="panel space-y-4 p-6">
        <h1 className="page-heading">Não foi possível exibir esta página</h1>
        <p>Volte aos pedidos ou recarregue a página. Alterações locais não salvas podem ser perdidas.</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/purchase-orders" className="text-link">
            Voltar aos pedidos
          </Link>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Recarregar página
          </Button>
        </div>
      </section>
    );
  }
}

export function PageErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  // A different page or identity gets a fresh boundary. Query changes alone
  // cannot repeatedly remount a broken page or discard its recovery state.
  return <RenderBoundary key={`${user?.id}:${pathname}`}>{children}</RenderBoundary>;
}
