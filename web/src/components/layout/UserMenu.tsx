import { ChevronDown, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '@/components/UserAvatar'
import { useCurrentUser, useLogout } from '@/features/session/api'

export function UserMenu() {
  const user = useCurrentUser()
  const logout = useLogout()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto gap-2 px-2 py-1.5">
          <UserAvatar name={user.name} className="size-7" />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-medium">{user.name}</span>
            <span className="block text-xs text-muted-foreground">{user.role}</span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-xs text-muted-foreground">Usando como</span>
          <span className="block font-medium">{user.name}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout.mutate()}>
          <LogOut />
          Trocar de usuário
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
