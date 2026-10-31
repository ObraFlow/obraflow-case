import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { FieldError, Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useRuleMutations } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import type { ApprovalRange, User } from '@/lib/types';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

function SortableApprover({
  id,
  index,
  total,
  name,
  onUp,
  onDown,
  onRemove,
}: {
  id: string;
  index: number;
  total: number;
  name: string;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border bg-card py-2 pl-1 pr-2 ${isDragging ? 'z-10 border-primary shadow-overlay' : ''}`}
    >
      <button
        type="button"
        className="grid h-7 w-5 shrink-0 cursor-grab place-items-center text-subtle-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="Arrastar"
      >
        <GripVertical className="size-4" />
      </button>
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-2xs font-semibold text-primary-text">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
      <Button type="button" variant="ghost" size="icon" aria-label="Mover para cima" disabled={index === 0} onClick={onUp}>
        <ArrowUp />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Mover para baixo" disabled={index === total - 1} onClick={onDown}>
        <ArrowDown />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Remover aprovador"
        disabled={total === 1}
        onClick={onRemove}
        className="hover:bg-danger-muted hover:text-danger"
      >
        <X />
      </Button>
    </li>
  );
}

export function RangeEditorSheet({
  projectId,
  range,
  users,
  open,
  onClose,
}: {
  projectId: string;
  range: ApprovalRange | null;
  users: User[];
  open: boolean;
  onClose: () => void;
}) {
  const isEdit = !!range;
  const { create, update } = useRuleMutations(projectId);
  const [minValue, setMinValue] = useState(range ? String(range.minValue) : '0');
  const [openEnded, setOpenEnded] = useState(range ? range.maxValue === null : true);
  const [maxValue, setMaxValue] = useState(range?.maxValue != null ? String(range.maxValue) : '');
  const [approverIds, setApproverIds] = useState<string[]>(
    range ? [...range.approvalRangeSteps].sort((a, b) => a.position - b.position).map((s) => s.userId) : [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const available = useMemo(() => users.filter((u) => !approverIds.includes(u.id)), [users, approverIds]);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= approverIds.length) return;
    setApproverIds((ids) => arrayMove(ids, from, to));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const min = Number(minValue);
    if (!isFinite(min) || min < 0) e.min = 'Valor mínimo inválido.';
    if (!openEnded) {
      const max = Number(maxValue);
      if (maxValue === '' || !isFinite(max)) e.max = 'Informe o máximo ou marque "sem limite".';
      else if (max < min) e.max = 'O máximo deve ser maior ou igual ao mínimo.';
    }
    if (approverIds.length === 0) e.approvers = 'Adicione ao menos um aprovador.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    const payload = { minValue: Number(minValue), maxValue: openEnded ? null : Number(maxValue), approverUserIds: approverIds };
    const onError = (err: unknown) =>
      toast.error('Não foi possível salvar', { description: err instanceof ApiError ? err.message : undefined });
    if (isEdit && range) {
      update.mutate({ id: range.id, payload }, { onSuccess: () => { toast.success('Faixa atualizada'); onClose(); }, onError });
    } else {
      create.mutate(payload, { onSuccess: () => { toast.success('Faixa criada'); onClose(); }, onError });
    }
  };

  const saving = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="text-base font-semibold">{isEdit ? 'Editar faixa de alçada' : 'Nova faixa de alçada'}</SheetTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">Defina o intervalo de valor e a cadeia de aprovadores.</p>
        </SheetHeader>
        <SheetBody>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>Valor mínimo (R$)</Label>
              <Input type="number" step="any" min={0} className="num mt-1 text-right" value={minValue} aria-invalid={!!errors.min} onChange={(e) => setMinValue(e.target.value)} />
              <FieldError message={errors.min} />
            </div>
            <div>
              <Label required={!openEnded}>Valor máximo (R$)</Label>
              <Input type="number" step="any" min={0} className="num mt-1 text-right" value={maxValue} disabled={openEnded} placeholder={openEnded ? 'Sem limite' : '0,00'} aria-invalid={!!errors.max} onChange={(e) => setMaxValue(e.target.value)} />
              <FieldError message={errors.max} />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={openEnded} onCheckedChange={(v) => setOpenEnded(!!v)} />
            Faixa aberta para cima (sem limite máximo)
          </label>

          <div>
            <Label>Cadeia de aprovadores</Label>
            <p className="mb-2 mt-0.5 text-xs text-subtle-foreground">A ordem define a sequência. Arraste pela alça ou use as setas.</p>
            {approverIds.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-xs text-subtle-foreground">Nenhum aprovador adicionado.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => {
                const { active, over } = e;
                if (over && active.id !== over.id) {
                  setApproverIds((ids) => arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
                }
              }}>
                <SortableContext items={approverIds} strategy={verticalListSortingStrategy}>
                  <ol className="space-y-2">
                    {approverIds.map((id, i) => (
                      <SortableApprover key={id} id={id} index={i} total={approverIds.length} name={name(id)}
                        onUp={() => move(i, i - 1)} onDown={() => move(i, i + 1)} onRemove={() => setApproverIds((a) => a.filter((x) => x !== id))} />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
            )}
            {available.length > 0 && (
              <Select value="" onValueChange={(v) => v && setApproverIds((a) => [...a, v])}>
                <SelectTrigger className="mt-2 border-dashed text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Plus className="size-3.5" /> Adicionar aprovador</span>
                </SelectTrigger>
                <SelectContent>
                  {available.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}{u.role ? ` · ${u.role}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <FieldError message={errors.approvers} />
          </div>
        </SheetBody>
        <SheetFooter>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button loading={saving} onClick={save}>{isEdit ? 'Salvar alterações' : 'Criar faixa'}</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
