import { Building2 } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { cn } from '@/lib/utils'
import { UserMenu } from './UserMenu'

const links = [
  { to: '/pedidos', label: 'Pedidos', end: true },
  { to: '/pedidos/novo', label: 'Novo pedido', end: true },
  { to: '/regras-de-alcada', label: 'Regras de alçada', end: false },
]

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  )
}

export function AppLayout() {
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link to="/pedidos" className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="size-4" aria-hidden />
            </span>
            ObraFlow
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </div>
        {/* On small screens the navigation becomes a scrollable row. */}
        <nav
          className="flex gap-1 overflow-x-auto border-t px-3 py-2 md:hidden"
          aria-label="Principal"
        >
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <Outlet />
      </main>
    </div>
  )
}
