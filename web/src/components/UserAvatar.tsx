import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

// A stable color per person makes approvers easy to tell apart across screens.
const palette = [
  'bg-sky-100 text-sky-800',
  'bg-violet-100 text-violet-800',
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-800',
  'bg-teal-100 text-teal-800',
]

function colorFor(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return palette[hash % palette.length]
}

export function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarFallback className={cn('font-medium', colorFor(name))}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
