'use client';

import { ChevronDown } from 'lucide-react';
import { useViewer } from '@/components/providers/viewer-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/user-avatar';

/**
 * "Visualizando como": troca a persona simulada (não há login).
 * No celular, mostra só o avatar.
 */
export function ViewerSwitcher() {
  const { viewer, users, isLoading, setViewerId } = useViewer();

  if (isLoading) {
    return (
      <Skeleton
        className="h-8 w-36 rounded-md"
        aria-label="Carregando usuários"
      />
    );
  }
  if (!viewer) {
    // API fora do ar: as telas mostram o erro com "Tentar novamente"; aqui só não há quem escolher.
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[12.5px] text-muted-foreground sm:inline">
        Visualizando como
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Visualizando como ${viewer.name}. Trocar usuário`}
          className="flex items-center gap-2 rounded-md border bg-muted/50 py-1 pr-2.5 pl-1 text-[13px] font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring max-sm:border-0 max-sm:bg-transparent max-sm:p-0"
        >
          <UserAvatar
            initials={viewer.initials}
            tone="viewer"
            className="max-sm:size-8"
          />
          <span className="hidden sm:inline">{viewer.name}</span>
          <ChevronDown
            className="hidden size-3.5 text-muted-foreground sm:block"
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Simular o acesso de outro usuário
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={String(viewer.id)}
            onValueChange={(value) => setViewerId(Number(value))}
          >
            {users.map((user) => (
              <DropdownMenuRadioItem
                key={user.id}
                value={String(user.id)}
                className="gap-2.5 py-1.5"
              >
                <UserAvatar
                  initials={user.initials}
                  tone={user.id === viewer.id ? 'viewer' : 'neutral'}
                />
                <span className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {user.jobTitle}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
