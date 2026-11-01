import { ErrorCode } from "@dokimos/shared";
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { AppShell } from "@/app/AppShell";
import { ErrorState } from "@/components/Feedback";
import { Loading } from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { Login } from "@/auth/Login";
import { Orders } from "@/features/purchase-orders/list/Orders";
import { NewOrder } from "@/features/purchase-orders/new/NewOrder";
import { OrderDetail } from "@/features/purchase-orders/detail/OrderDetail";
import { Projects } from "@/features/projects/list/Projects";
import { ProjectDetail } from "@/features/projects/detail/ProjectDetail";
import { Users } from "@/features/users/Users";
import { Suppliers } from "@/features/suppliers/Suppliers";
import { Audit } from "@/features/audit/Audit";

function SessionBoundary() {
  const auth = useAuth();
  if (auth.checking) return <Loading message="Verificando sua sessão…" />;
  if (auth.error)
    return (
      <main className="mx-auto max-w-lg space-y-4 p-8">
        <h1 className="text-xl font-semibold">Não foi possível verificar sua sessão</h1>
        <ErrorState error={auth.error} retry={auth.retry} />
        <Button variant="outline" onClick={auth.signOut}>
          Voltar ao login
        </Button>
      </main>
    );
  return <Outlet />;
}
function RequireAuth() {
  const { user, sessionEnded } = useAuth();
  const location = useLocation();
  return user ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={sessionEnded ? null : { from: location.pathname + location.search }} />
  );
}
function RequireAdmin() {
  const { user } = useAuth();
  return user?.role === "ADMIN" ? (
    <Outlet />
  ) : (
    <ErrorState error={new ApiError(403, ErrorCode.FORBIDDEN, "Acesso restrito à administração.")} />
  );
}
function NotFound({ to, label }: { to: string; label: string }) {
  return (
    <div className="panel p-8">
      <h1 className="page-heading">Página não encontrada</h1>
      <Link to={to} className="text-link mt-4 inline-block">
        {label}
      </Link>
    </div>
  );
}
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<SessionBoundary />}>
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/purchase-orders" replace />} />
                <Route path="/purchase-orders" element={<Orders />} />
                <Route path="/purchase-orders/new" element={<NewOrder />} />
                <Route path="/purchase-orders/:id" element={<OrderDetail />} />
                <Route element={<RequireAdmin />}>
                  <Route path="/admin/projects" element={<Projects />} />
                  <Route path="/admin/projects/:id" element={<ProjectDetail />} />
                  <Route path="/admin/users" element={<Users />} />
                  <Route path="/admin/suppliers" element={<Suppliers />} />
                  <Route path="/admin/audit" element={<Audit />} />
                  <Route path="/admin/*" element={<NotFound to="/admin/projects" label="Voltar às obras" />} />
                </Route>
                <Route path="*" element={<NotFound to="/purchase-orders" label="Voltar aos pedidos" />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
