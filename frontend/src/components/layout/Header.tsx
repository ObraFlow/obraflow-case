'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Menu, Bell, User, LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { api, type PedidoListaResultado } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export function Header({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';
  const toggleLabel = isDark ? 'Modo claro' : 'Modo escuro';

  const usuarioId = session?.user?.id;
  const accessToken = session?.accessToken;

  // Pedidos pendentes em que a pessoa logada e' o aprovador da etapa corrente
  // ("esta na sua vez") - alimenta o sino de notificacoes.
  const { data: notificacoes } = useQuery({
    queryKey: ['pedidos-notificacoes', usuarioId, accessToken],
    queryFn: () =>
      api.getPedidos(
        { situacao: 'PENDENTE', aguardandoDecisaoDe: usuarioId, tamanho: 10 },
        accessToken
      ),
    enabled: !!usuarioId && !!accessToken,
    staleTime: 30_000,
  });

  const pendentes: PedidoListaResultado[] = notificacoes?.conteudo || [];
  const totalPendentes = notificacoes?.totalElementos ?? pendentes.length;

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-neutral-200 bg-white/95 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-900/95">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left - Mobile menu button */}
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden p-2 rounded-md text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Abrir menu"
            onClick={onOpenMenu}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Center - Page title (optional) */}
        <div className="flex-1" />

        {/* Right - Actions */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={toggleLabel}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">{toggleLabel}</span>
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
                <Bell className="h-5 w-5" />
                {totalPendentes > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white"
                    aria-label={`${totalPendentes} pedido(s) aguardando sua aprovação`}
                  >
                    {totalPendentes > 9 ? '9+' : totalPendentes}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 p-2">
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Aguardando sua aprovação
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {totalPendentes === 0
                    ? 'Nenhum pedido na sua vez no momento.'
                    : `${totalPendentes} ${totalPendentes === 1 ? 'pedido está' : 'pedidos estão'} na sua vez`}
                </p>
              </div>
              <DropdownMenuSeparator />
              {pendentes.length === 0 ? (
                <p className="px-2 py-3 text-sm text-neutral-500 dark:text-neutral-400 text-center">
                  Nenhuma notificação no momento
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {pendentes.map((pedido) => (
                    <DropdownMenuItem key={pedido.id} asChild>
                      <a href={`/pedidos/${pedido.id}`} className="flex w-full cursor-pointer flex-col gap-0.5 items-start">
                        <span className="flex w-full items-center justify-between gap-2">
                          <span className="font-mono text-sm font-semibold text-neutral-900 dark:text-white">
                            {pedido.numero}
                          </span>
                          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                            {formatCurrency(pedido.valorTotal)}
                          </span>
                        </span>
                        <span className="w-full truncate text-xs text-neutral-500 dark:text-neutral-400">
                          {pedido.obraCodigo} - {pedido.obraNome} / {pedido.fornecedorNome}
                        </span>
                        <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                          Etapa {pedido.alcada.etapaAtual} de {pedido.alcada.totalEtapas} - decidir agora →
                        </span>
                      </a>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full" aria-label="Menu do usuário">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || ''} />
                  <AvatarFallback>
                    {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {session?.user?.name || 'Usuário'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {session?.user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/settings" className="flex w-full items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Configurações</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-danger-600 focus:text-danger-600"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}