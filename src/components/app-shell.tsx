"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_USER, useEntities } from "@/lib/client-api";
import { Icon } from "./ui";

type Session = { actor: string; setActorGuard: (guard: (() => boolean) | null) => void };
const SessionContext = createContext<Session>({ actor: DEFAULT_USER, setActorGuard: () => {} });
export function useSession() {
  return useContext(SessionContext);
}
export function useUnsaved(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const click = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (
        target?.hash &&
        target.origin === location.origin &&
        target.pathname === location.pathname &&
        target.search === location.search
      )
        return;
      if (!target) return;
      const next = new URL(target.href);
      if (
        next.origin === location.origin &&
        next.pathname === location.pathname &&
        next.search === location.search
      )
        return;
      if (
        target.href !== location.href &&
        !window.confirm("Há alterações não salvas. Deseja sair e descartar o preenchimento?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
}
export function AppShell({ children }: { children: ReactNode }) {
  const [actor, setActor] = useState(DEFAULT_USER);
  const [menu, setMenu] = useState(false);
  const guard = useRef<(() => boolean) | null>(null);
  const setActorGuard = useCallback((value: (() => boolean) | null) => {
    guard.current = value;
  }, []);
  useEffect(() => {
    if (!menu) return;
    document.querySelector<HTMLAnchorElement>("#workspace-sidebar nav a[href]")?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", escape);
      document.querySelector<HTMLButtonElement>(".mobile-menu")?.focus();
    };
  }, [menu]);
  const users = useEntities("/users", actor);
  const path = usePathname();
  useEffect(() => {
    Promise.resolve().then(() => {
      const stored = localStorage.getItem("obraflow-user");
      if (stored && /^[0-9a-f-]{36}$/i.test(stored)) setActor(stored);
    });
  }, []);
  const current = users.data?.find((user) => user.id === actor);
  const nav = [
    { href: "/", label: "Aprovações", icon: "grid" },
    { href: "/orders/new", label: "Novo pedido", icon: "plus" },
    { href: "/approval-rules", label: "Regras de alçada", icon: "rules" },
  ];
  const section =
    path === "/"
      ? "Aprovações"
      : path === "/orders/new"
        ? "Novo pedido"
        : path.startsWith("/orders/")
          ? "Detalhes do pedido"
          : "Regras de alçada";
  return (
    <SessionContext.Provider value={{ actor, setActorGuard }}>
      <div className="app-layout">
        {menu && (
          <button
            className="sidebar-scrim"
            aria-label="Fechar navegação"
            onClick={() => setMenu(false)}
          />
        )}
        <aside id="workspace-sidebar" className={`sidebar ${menu ? "is-open" : ""}`}>
          <Link href="/" className="brand" onClick={() => setMenu(false)}>
            <span className="brand-mark">
              <Icon name="building" size={25} />
            </span>
            <span>
              obra<span className="brand-light">flow</span>
              <small>GESTÃO QUE CONSTRÓI</small>
            </span>
          </Link>
          <span className="nav-eyebrow">ESPAÇO DE TRABALHO</span>
          <nav aria-label="Navegação principal">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenu(false)}
                className={`nav-link ${path === item.href || (item.href === "/" && path.startsWith("/orders/") && path !== "/orders/new") ? "active" : ""}`}
                aria-current={path === item.href ? "page" : undefined}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <span className="small-shield">
              <Icon name="shield" />
            </span>
            <strong>Decisões com confiança</strong>
            <p>
              Cada compra no caminho certo.
              <br />
              Cada decisão registrada.
            </p>
            <div className="sidebar-footer">
              ObraFlow <span>•</span> Dokimos
            </div>
          </div>
        </aside>
        <div className="workspace">
          <a className="skip-link" href="#main-content">
            Pular para o conteúdo
          </a>
          <header className="topbar">
            <div className="breadcrumbs">
              <button
                className="icon-button mobile-menu"
                aria-label="Abrir navegação"
                aria-expanded={menu}
                aria-controls="workspace-sidebar"
                onClick={() => setMenu(!menu)}
              >
                <Icon name="menu" />
              </button>
              <span className="breadcrumb-root">Workspace</span>
              <Icon name="arrow" size={13} />
              <strong>{section}</strong>
            </div>
            <div className="user-control">
              <span className="avatar">{current?.name.slice(0, 1) ?? "L"}</span>
              <div>
                <label htmlFor="demo-user">USUÁRIO DE DEMONSTRAÇÃO</label>
                <select
                  id="demo-user"
                  value={actor}
                  disabled={users.loading || !users.data?.length}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (guard.current && !guard.current()) return;
                    setActor(value);
                    localStorage.setItem("obraflow-user", value);
                  }}
                >
                  {!users.data?.some((user) => user.id === actor) && (
                    <option value={actor}>
                      {users.loading ? "Carregando…" : "Selecionar usuário"}
                    </option>
                  )}
                  {users.data?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </header>
          {users.error && (
            <div className="session-error" role="alert">
              Não foi possível carregar os usuários.{" "}
              <button onClick={users.reload}>Tentar novamente</button>
              <button
                onClick={() => {
                  if (guard.current && !guard.current()) return;
                  setActor(DEFAULT_USER);
                  localStorage.setItem("obraflow-user", DEFAULT_USER);
                  users.reload();
                }}
              >
                Restaurar usuário de demonstração
              </button>
            </div>
          )}
          {!users.loading && users.data?.length === 0 && (
            <div className="session-error">
              Nenhum usuário disponível. Carregue os dados de demonstração conforme o README.
            </div>
          )}
          <main id="main-content" className="main-content">
            {children}
          </main>
          <footer className="workspace-footer">
            <span>ObraFlow · Gestão de compras e aprovações</span>
            <span>
              <span className="green-dot" /> Ambiente de demonstração
            </span>
          </footer>
        </div>
      </div>
    </SessionContext.Provider>
  );
}
