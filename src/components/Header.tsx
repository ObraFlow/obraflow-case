"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useApi, useUid } from "@/lib/ui";

const NAV = [
  ["/pedidos/novo", "Novo pedido"],
  ["/aprovacoes", "Aprovações"],
  ["/regras", "Regras de alçada"],
];

export default function Header() {
  const path = usePathname();
  const uid = useUid();
  const users = useApi<{ id: number; name: string }[]>("/users");

  useEffect(() => {
    if (!uid && users.data?.length) {
      localStorage.setItem("uid", String(users.data[0].id));
      window.dispatchEvent(new Event("uid-change"));
    }
  }, [uid, users.data]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/aprovacoes" className="text-2xl font-semibold tracking-tight text-plum">ObraFlow</Link>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm text-muted md:order-none md:w-auto">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href}
              className={`whitespace-nowrap rounded-md px-3 py-2 hover:text-ink ${path.startsWith(href) ? "font-semibold text-ink" : ""}`}>
              {label}
            </Link>
          ))}
        </nav>
        <label className="flex items-center gap-2 text-sm text-muted">
          Atuando como
          <select
            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-ink"
            value={uid || ""}
            onChange={(e) => { localStorage.setItem("uid", e.target.value); window.dispatchEvent(new Event("uid-change")); }}>
            {users.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
      </div>
    </header>
  );
}
