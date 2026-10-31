import { ActingUserPicker } from "@/components/domain/ActingUserPicker";
import { useOrders } from "@/hooks/queries";
import { currentApprover } from "@/lib/chain";
import { cn } from "@/lib/utils";
import { useActingUser } from "@/providers/ActingUserProvider";
import {
  ClipboardCheck,
  HardHat,
  PlusCircle,
  SlidersHorizontal,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

const nav = [
  { to: "/aprovacoes", label: "Aprovações", icon: ClipboardCheck, badge: true },
  { to: "/pedidos/novo", label: "Novo pedido", icon: PlusCircle, badge: false },
  {
    to: "/regras",
    label: "Regras de alçada",
    icon: SlidersHorizontal,
    badge: false,
  },
];

function useMyPendingCount() {
  const { actingUserId } = useActingUser();
  const { data: orders } = useOrders({});
  if (!actingUserId || !orders) return 0;
  return orders.filter((o) => currentApprover(o)?.userId === actingUserId)
    .length;
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
        <HardHat className="size-4" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">ObraFlow</span>
        <span className="block text-2xs text-subtle-foreground">
          Dokimos · Alçadas
        </span>
      </span>
    </div>
  );
}

export function AppShell() {
  const pending = useMyPendingCount();

  const navLink = (mobile: boolean) =>
    nav.map(({ to, label, icon: Icon, badge }) => (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) =>
          cn(
            mobile
              ? "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-2xs font-medium"
              : "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
            isActive
              ? mobile
                ? "text-primary"
                : "bg-primary-soft text-primary-text"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )
        }
      >
        <span className="relative">
          <Icon className={mobile ? "size-5" : "size-4"} />
          {badge && pending > 0 && (
            <span className="num absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-2xs font-semibold text-warning-foreground">
              {pending}
            </span>
          )}
        </span>
        {label}
      </NavLink>
    ));

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-sidebar shrink-0 flex-col gap-1 border-r bg-sidebar p-3 lg:flex">
        <div className="px-1 py-2">
          <Brand />
        </div>
        <nav className="mt-2 flex flex-col gap-0.5">{navLink(false)}</nav>
        <div className="mt-auto flex flex-col gap-2">
          <ActingUserPicker />
          <div className="flex items-center justify-between px-1">
            <span className="text-2xs text-subtle-foreground">Tema</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile */}
        <header className="sticky top-0 z-30 flex h-13 items-center justify-between gap-2 border-b bg-card/90 px-3 backdrop-blur lg:hidden">
          <Brand />
          <div className="flex items-center gap-1">
            <div className="w-40">
              <ActingUserPicker />
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-24 pt-5 lg:px-7 lg:pb-8 lg:pt-6">
          <Outlet />
        </main>

        {/* Tab bar mobile */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card/95 backdrop-blur lg:hidden">
          {navLink(true)}
        </nav>
      </div>
    </div>
  );
}
