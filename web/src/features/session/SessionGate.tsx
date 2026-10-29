import { Building2, Loader2, Users } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { ListSkeleton } from '@/components/states/ListSkeleton'
import { UserAvatar } from '@/components/UserAvatar'
import { useUsers } from '@/features/catalog/api'
import { ApiError } from '@/lib/api'
import { useLogin, useSession } from './api'

interface SessionGateProps {
  children: ReactNode
  /** Called when the user leaves (logout or expired cookie), to reset the page. */
  onSignOut?: () => void
}

/** Renders the app only after a user is selected; otherwise asks who is using it. */
export function SessionGate({ children, onSignOut }: SessionGateProps) {
  const session = useSession()
  const userId = session.data?.user?.id

  // The next user starts on the orders list, never on the page the previous one left open.
  const previousUserId = useRef(userId)
  useEffect(() => {
    if (previousUserId.current && !userId) onSignOut?.()
    previousUserId.current = userId
  }, [userId, onSignOut])

  if (session.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Carregando" />
      </div>
    )
  }
  if (session.isError) {
    return (
      <div className="mx-auto flex min-h-svh max-w-lg items-center px-4">
        <ErrorState
          className="w-full"
          error={session.error}
          onRetry={() => session.refetch()}
          retrying={session.isFetching}
        />
      </div>
    )
  }
  if (!session.data.user) {
    return <UserPicker />
  }
  return children
}

function UserPicker() {
  const users = useUsers()
  const login = useLogin()

  function select(userId: string) {
    login.mutate(userId, {
      onError: (error) =>
        toast.error(error instanceof ApiError ? error.message : 'Não foi possível entrar.'),
    })
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center px-4 py-10">
      <div className="mb-8 space-y-3 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Building2 className="size-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Quem está usando o ObraFlow?</h1>
        <p className="text-sm text-muted-foreground">
          Escolha um usuário para continuar. Não há senha: a escolha só identifica quem cria e
          aprova os pedidos, e pode ser trocada a qualquer momento.
        </p>
      </div>

      {users.isPending ? (
        <ListSkeleton rows={4} />
      ) : users.isError ? (
        <ErrorState
          error={users.error}
          onRetry={() => users.refetch()}
          retrying={users.isFetching}
        />
      ) : users.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário cadastrado"
          description={
            <>
              Carregue os dados de demonstração com <code className="font-mono">pnpm db:seed</code>{' '}
              na pasta <code className="font-mono">api</code>.
            </>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {users.data.map((user) => {
            const selecting = login.isPending && login.variables === user.id
            return (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => select(user.id)}
                  disabled={login.isPending}
                  className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
                >
                  <UserAvatar name={user.name} className="size-10" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{user.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {user.role ?? user.email}
                    </span>
                  </span>
                  {selecting && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
