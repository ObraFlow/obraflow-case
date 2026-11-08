import { useEffect } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useOrders, useUsers } from './api/hooks'
import { AuthorCard } from './components/AuthorCard'
import { Icon } from './components/Icon'
import { Logo } from './components/Logo'
import { ThemeToggle } from './components/ThemeToggle'
import { useActor } from './lib/actor'
import { NewOrderPage } from './pages/NewOrder'
import { ApprovalsPage } from './pages/Approvals'
import { RulesPage } from './pages/Rules'
import { DashboardPage } from './pages/Dashboard'

export function App() {
  return (
    <div className="shell">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/painel" replace />} />
          <Route path="/painel" element={<DashboardPage />} />
          <Route path="/pedidos/novo" element={<NewOrderPage />} />
          <Route path="/aprovacoes" element={<ApprovalsPage />} />
          <Route path="/aprovacoes/:id" element={<ApprovalsPage />} />
          <Route path="/regras" element={<RulesPage />} />
          <Route path="*" element={<Navigate to="/painel" replace />} />
        </Routes>
        {/* no celular a barra lateral vira topo; o card do autor desce para o rodapé */}
        <footer className="mobile-footer">
          <AuthorCard />
          <ThemeToggle />
        </footer>
      </main>
    </div>
  )
}

function Sidebar() {
  const { actorId } = useActor()
  const awaiting = useOrders({ awaiting: 'me', actorId })
  const count = actorId ? (awaiting.data?.length ?? 0) : 0

  return (
    <aside className="sidebar">
      <div className="brand">
        <Logo />
        <div>
          <strong>ObraFlow</strong>
          <span>Dokimos · alçadas</span>
        </div>
      </div>

      <nav className="nav" aria-label="Principal">
        <NavLink to="/painel" className="nav-link">
          <Icon name="chart" /> Painel
        </NavLink>
        <NavLink to="/pedidos/novo" className="nav-link">
          <Icon name="plus" /> Novo pedido
        </NavLink>
        <NavLink to="/aprovacoes" className="nav-link">
          <Icon name="file" /> Aprovações
          {count > 0 && (
            <span className="nav-count" aria-label={`${count} aguardando você`}>
              {count}
            </span>
          )}
        </NavLink>
        <NavLink to="/regras" className="nav-link">
          <Icon name="layers" /> Regras de alçada
        </NavLink>
      </nav>

      <div className="sidebar-foot">
        <AuthorCard className="desktop-only" />
        <ActorSwitcher />
        <div className="desktop-only theme-row">
          <span>Tema</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}

function ActorSwitcher() {
  const { actorId, setActorId } = useActor()
  const users = useUsers()

  // primeira visita: começa como o primeiro usuário da lista
  useEffect(() => {
    const list = users.data
    if (list?.length && !list.some((u) => u.id === actorId)) setActorId(list[0].id)
  }, [users.data, actorId, setActorId])

  const actor = users.data?.find((u) => u.id === actorId)

  return (
    <div className="actor">
      <label htmlFor="actor" className="actor-label">
        Atuando como
      </label>
      <select
        id="actor"
        className="select actor-select"
        value={actorId ?? ''}
        disabled={!users.data}
        onChange={(e) => setActorId(Number(e.target.value))}
      >
        {!users.data && <option value="">{users.isError ? 'Indisponível' : 'Carregando…'}</option>}
        {users.data?.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <p className="actor-hint">{actor ? actor.role : ' '}. Troque para simular outra pessoa da alçada.</p>
    </div>
  )
}
