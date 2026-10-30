import { ArrowDown, ArrowUp, UserPlus, X } from 'lucide-react'
import { useFieldArray, useWatch, type Control } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserAvatar } from '@/components/UserAvatar'
import type { User } from '@/types/api'
import type { TierForm } from '../schemas'

interface ApproversEditorProps {
  control: Control<TierForm>
  users: User[]
  invalid?: boolean
}

/**
 * Ordered list of approvers. The order is the approval sequence, changed with
 * the arrow buttons (keyboard and touch friendly, no drag and drop library).
 */
export function ApproversEditor({ control, users, invalid }: ApproversEditorProps) {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'approvers' })
  const selected = useWatch({ control, name: 'approvers' })
  const selectedIds = new Set(selected.map((approver) => approver.userId))
  const available = users.filter((user) => !selectedIds.has(user.id))
  const byId = new Map(users.map((user) => [user.id, user]))

  return (
    <div className="space-y-3">
      {fields.length > 0 ? (
        <ol className="divide-y rounded-lg border">
          {fields.map((field, index) => {
            const user = byId.get(selected[index]?.userId ?? field.userId)
            const name = user?.name ?? 'Usuário removido'
            return (
              <li key={field.id} className="flex items-center gap-3 px-3 py-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <UserAvatar name={name} className="size-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{name}</p>
                  {user?.role && (
                    <p className="truncate text-xs text-muted-foreground">{user.role}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Mover ${name} para cima`}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => move(index, index + 1)}
                    disabled={index === fields.length - 1}
                    aria-label={`Mover ${name} para baixo`}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(index)}
                    aria-label={`Remover ${name}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X />
                  </Button>
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p
          className={
            invalid
              ? 'rounded-lg border border-dashed border-destructive/50 px-3 py-4 text-center text-sm text-destructive'
              : 'rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground'
          }
        >
          Nenhum aprovador. Adicione quem aprova os pedidos desta faixa, na ordem do fluxo.
        </p>
      )}

      {/* Picking a user adds it to the end of the chain. */}
      <Select value="" onValueChange={(userId) => append({ userId })}>
        <SelectTrigger
          className="w-full"
          disabled={available.length === 0}
          aria-label="Adicionar aprovador"
        >
          <UserPlus className="text-muted-foreground" />
          <SelectValue
            placeholder={
              available.length === 0 ? 'Todos os usuários já estão na faixa' : 'Adicionar aprovador'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {available.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
              {user.role && <span className="text-xs text-muted-foreground">{user.role}</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
