import { useEffect, useRef, useState } from "react";
import { DESKTOP_QUERY } from "@/lib/media";
import { PageErrorBoundary } from "./PageErrorBoundary";
import { Link, NavLink, Outlet } from "react-router";
import { Building2, ClipboardList, History, Menu, Truck, Users } from "lucide-react";
import { ChevronsRightLeftIcon, type ChevronsRightLeftIconHandle } from "@/components/ui/icons/chevrons-right-left";
import { ChevronsLeftRightIcon } from "@/components/ui/icons/chevrons-left-right";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/lib/theme";
import styles from "./AppShell.module.css";
import { SidebarAccount } from "./SidebarAccount";
import { NotificationProvider } from "@/features/notifications/NotificationProvider";
import { Brand } from "@/components/Brand";
import { ToastProvider } from "@/components/ToastProvider";
import { RealtimeNotifications } from "./RealtimeNotifications";
import { NotificationDialog } from "@/features/notifications/NotificationDialog";

const adminEntries = [
  { label: "Obras", icon: Building2, to: "/admin/projects" },
  { label: "Fornecedores", icon: Truck, to: "/admin/suppliers" },
  { label: "Usuários", icon: Users, to: "/admin/users" },
  { label: "Auditoria", icon: History, to: "/admin/audit" },
];

export function AppShell() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const collapseIcon = useRef<ChevronsRightLeftIconHandle>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  // The drawer exists only on narrow screens: close it when the viewport becomes desktop-sized.
  useEffect(() => {
    const desktop = matchMedia(DESKTOP_QUERY);
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  function navigation(mobile = false) {
    return (
      <nav className={styles.navigation} aria-label={mobile ? "Navegação móvel" : "Navegação principal"}>
        <NavLink
          to="/purchase-orders"
          className={styles.navItem}
          title="Pedidos de compra"
          aria-label="Pedidos de compra"
          onClick={() => setMobileOpen(false)}
        >
          <ClipboardList aria-hidden="true" size={18} />
          <span className={mobile ? undefined : styles.navLabel}>Pedidos de compra</span>
        </NavLink>
        {user?.role === "ADMIN" && (
          <>
            <p className={styles.adminGroup}>Administração</p>
            {adminEntries.map(({ label, icon: Icon, to }) => (
              <NavLink
                key={label}
                to={to}
                className={styles.navItem}
                title={label}
                aria-label={label}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} aria-hidden="true" />
                <span className={mobile ? undefined : styles.navLabel}>{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>
    );
  }
  return (
    <ToastProvider theme={theme.mode}>
      <NotificationProvider>
        <RealtimeNotifications />
        <div className={styles.shell} data-collapsed={collapsed}>
          <a href="#app-main" className="skip-link">
            Pular para o conteúdo
          </a>
          <aside className={styles.sidebar} aria-label="Menu lateral">
            <div className={styles.sidebarContent} id="desktop-sidebar-content">
              <Link
                to="/purchase-orders"
                className={styles.brandLink}
                aria-label="Dokimos by ObraFlow · Pedidos de compra"
              >
                <Brand textClassName={styles.navLabel} />
              </Link>
              {navigation()}
              <div className={styles.sidebarFooter}>
                <div className={styles.accountSection}>
                  <SidebarAccount collapsed={collapsed} theme={theme} />
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={styles.collapseToggle}
              aria-label={collapsed ? "Expandir navegação" : "Recolher navegação"}
              title={collapsed ? "Expandir navegação" : "Recolher navegação"}
              aria-expanded={!collapsed}
              aria-controls="desktop-sidebar-content"
              onMouseEnter={() => collapseIcon.current?.startAnimation()}
              onMouseLeave={() => collapseIcon.current?.stopAnimation()}
              onFocus={() => collapseIcon.current?.startAnimation()}
              onBlur={() => collapseIcon.current?.stopAnimation()}
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? (
                <ChevronsLeftRightIcon ref={collapseIcon} size={20} aria-hidden="true" />
              ) : (
                <ChevronsRightLeftIcon ref={collapseIcon} size={20} aria-hidden="true" />
              )}
            </Button>
          </aside>
          <div className={styles.workspace}>
            <header className={styles.mobileHeader}>
              <Button variant="ghost" size="icon" aria-label="Abrir navegação" onClick={() => setMobileOpen(true)}>
                <Menu aria-hidden="true" />
              </Button>
              <Link
                to="/purchase-orders"
                className={styles.mobileBrand}
                aria-label="Dokimos by ObraFlow · Pedidos de compra"
              >
                <Brand />
              </Link>
              <div className={styles.mobileActions}>{user && <SidebarAccount mobile theme={theme} />}</div>
            </header>
            <main id="app-main" tabIndex={-1} className={styles.main}>
              <PageErrorBoundary>
                <Outlet />
              </PageErrorBoundary>
            </main>
          </div>
          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogContent
              data-mobile-navigation
              className={`${styles.drawer} top-0 left-0 flex h-dvh max-h-dvh w-72 translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-72`}
            >
              <DialogTitle className={styles.drawerBrand}>
                <Brand />
              </DialogTitle>
              <DialogDescription className="sr-only">Navegação da aplicação</DialogDescription>
              <div className={styles.drawerBody}>{navigation(true)}</div>
            </DialogContent>
          </Dialog>
          <NotificationDialog />
        </div>
      </NotificationProvider>
    </ToastProvider>
  );
}
