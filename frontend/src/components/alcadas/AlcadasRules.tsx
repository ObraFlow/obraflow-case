'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { createNivel, deleteNivel, simulacaoAlcada, updateNivel } from '@/app/(dashboard)/alcadas/[obraId]/actions';
import { type ObraResultado, type NivelAlcadaResultado, type SimulacaoAlcadaResultado, type UsuarioResultado } from '@/lib/api';
import { Button } from '../ui/button';
import { Calculator, Eye, Plus, Search, Trash2, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { FormField } from '../forms/FormField';

const nivelSchema = z.object({
  obraId: z.string().uuid(),
  limiteInferior: z.number().min(0, 'Limite inferior deve ser >= 0'),
  limiteSuperior: z.number().min(0.01, 'Limite superior deve ser > 0').nullable(),
  descricao: z.string().max(120).optional(),
  usuariosAprovadores: z.array(z.string().uuid()).min(1, 'Mínimo 1 aprovador'),
}).refine((data) => {
  if (data.limiteSuperior !== null) {
    return data.limiteSuperior > data.limiteInferior;
  }
  return true;
}, {
  message: 'Limite superior deve ser maior que o limite inferior',
  path: ['limiteSuperior'],
});

type NivelFormData = z.infer<typeof nivelSchema>;

function formatDigits(digits: string): string {
  const cents = Number(digits) / 100;
  return cents.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumberToBRL(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseBRL(value: string): number | null {
  if (!value || !value.trim()) return null;
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

interface CurrencyInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  name?: string;
  placeholder?: string;
}

function CurrencyInput({ value, onChange, onBlur, name, placeholder }: CurrencyInputProps) {
  const [text, setText] = useState(() => formatNumberToBRL(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setText(formatNumberToBRL(value));
    }
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      name={name}
      placeholder={placeholder}
      value={text}
      onFocus={() => { focusedRef.current = true; }}
      onBlur={() => {
        focusedRef.current = false;
        setText(formatNumberToBRL(value));
        onBlur?.();
      }}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '');
        setText(digits ? formatDigits(digits) : '');
        onChange(digits ? Number(digits) / 100 : null);
      }}
    />
  );
}

const defaultNivel: Omit<NivelFormData, 'obraId'> = {
  limiteInferior: 0,
  limiteSuperior: null,
  descricao: '',
  usuariosAprovadores: [],
};

interface AlcadasRulesProps {
  obra: ObraResultado;
  niveis: NivelAlcadaResultado[];
  usuarios: UsuarioResultado[];
}

export function AlcadasRules({ obra, niveis, usuarios }: AlcadasRulesProps) {
  const router = useRouter();
  const [editingNivel, setEditingNivel] = useState<NivelAlcadaResultado | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [simulacaoValor, setSimulacaoValor] = useState<string>('');
  const [simulacaoResult, setSimulacaoResult] = useState<SimulacaoAlcadaResultado | null>(null);
  const [simulacaoNivelId, setSimulacaoNivelId] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);

  const form = useForm<NivelFormData>({
    resolver: zodResolver(nivelSchema),
    defaultValues: { obraId: obra.id, ...defaultNivel },
  });

  const [, startTransition] = useTransition();

  const onSubmit = (data: NivelFormData) => {
    data.obraId = obra.id;
    if (editingNivel) {
      const nivelId = editingNivel.id;
      startTransition(async () => {
        setActionError(null);
        const result = await updateNivel(nivelId, data);
        if (!result.ok) {
          setActionError(result.error);
          return;
        }
        setEditingNivel(null);
        setDialogOpen(false);
        form.reset({ obraId: obra.id, ...defaultNivel });
        router.refresh();
      });
    } else {
      startTransition(async () => {
        setActionError(null);
        const result = await createNivel(data);
        if (!result.ok) {
          setActionError(result.error);
          return;
        }
        setEditingNivel(null);
        setDialogOpen(false);
        form.reset({ obraId: obra.id, ...defaultNivel });
        router.refresh();
      });
    }
  };

  const openEdit = (nivel: NivelAlcadaResultado) => {
    form.reset({
      obraId: obra.id,
      limiteInferior: Number(nivel?.limiteInferior ?? 0),
      limiteSuperior: nivel?.limiteSuperior != null ? Number(nivel.limiteSuperior) : null,
      descricao: nivel.descricao || '',
      usuariosAprovadores: (nivel.aprovadores ?? []).map(a => a.usuarioId),
    });
    setEditingNivel(nivel);
    setDialogOpen(true);
  };

  const openCreate = () => {
    form.reset({ obraId: obra.id, ...defaultNivel });
    setEditingNivel(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta faixa?')) {
      startTransition(async () => {
        setActionError(null);
        const result = await deleteNivel(id, obra.id);
        if (!result.ok) {
          setActionError(result.error);
          return;
        }
        router.refresh();
      });
    }
  };

  const handleSimulacao = () => {
    const valor = parseBRL(simulacaoValor);
    if (valor === null || !simulacaoNivelId) return;
    const nivelId = simulacaoNivelId;
    startTransition(async () => {
      setActionError(null);
      setSimulacaoResult(null);
      const result = await simulacaoAlcada(nivelId, valor);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setSimulacaoResult(result.data as SimulacaoAlcadaResultado);
    });
  };

  const { errors } = form.formState;

  const sortedNiveis = [...niveis].sort((a, b) =>
    Number(a?.limiteInferior ?? 0) - Number(b?.limiteInferior ?? 0)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Regras de Alçada
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Obra: <span className="font-medium">{obra.codigo} - {obra.nome}</span>
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Faixa
        </Button>
      </div>

      {actionError && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700 dark:bg-danger-900/30 dark:text-danger-400"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Simular Alçada
          </CardTitle>
        </CardHeader>
        <CardContent>
          {niveis.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              Nenhuma faixa cadastrada para simular. Crie uma faixa primeiro.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label
                  htmlFor="faixa-simulacao"
                  className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Faixa para simulação
                </label>
                <Select
                  value={simulacaoNivelId}
                  onValueChange={setSimulacaoNivelId}
                >
                  <SelectTrigger id="faixa-simulacao" className="w-full mt-1" aria-label="Faixa para simulação">
                    <SelectValue placeholder="Selecione uma faixa" />
                  </SelectTrigger>
                  <SelectContent>
                    {niveis.map((nivel) => (
                      <SelectItem key={nivel.id} value={nivel.id}>
                        {nivel.rotulo || 'Sem rótulo'}
                        {nivel.descricao ? ` — ${nivel.descricao}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label
                  htmlFor="valor-simulacao"
                  className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Valor para simulação
                </label>
                <Input
                  id="valor-simulacao"
                  type="text"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={simulacaoValor}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setSimulacaoValor(digits ? formatDigits(digits) : '');
                  }}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleSimulacao} disabled={!simulacaoNivelId || !simulacaoValor}>
                Simular
              </Button>
              {simulacaoResult && (
                <div className="mt-4 p-4 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                  <p className="font-medium text-primary-700 dark:text-primary-400">
                    Resultado da Simulação
                  </p>
                  <p className="text-sm text-primary-600 dark:text-primary-400">
                    Faixa: {!simulacaoResult.aplicavel
                      ? 'Valor fora desta faixa'
                      : simulacaoResult.faixaRotulo || 'Nenhuma faixa aplicável'}
                  </p>
                  <p className="text-sm text-primary-600 dark:text-primary-400">
                    Aprovadores: {(simulacaoResult.cadeia ?? [])
                      .map(a => a.usuarioNome)
                      .filter(Boolean)
                      .join(' → ') || 'Nenhum'}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Regras de Alçada ({niveis.length})
              </CardTitle>
              <CardDescription>
                Configure as faixas de valor e a cadeia de aprovadores
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {niveis.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                Nenhuma faixa de alçada configurada para esta obra.
              </p>
              <Button onClick={openCreate} variant="default">
                <Plus className="mr-2 h-4 w-4" />
                Criar primeira faixa
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Faixa de Valor</TableHead>
                    <TableHead>Aprovadores (ordem)</TableHead>
                    <TableHead className="w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedNiveis.map((nivel, index) => (
                    <TableRow key={nivel.id}>
                      <TableCell className="text-center font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{nivel.rotulo || '—'}</span>
                          {nivel.descricao && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {nivel.descricao}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(nivel.aprovadores ?? []).map((aprovador, idx) => (
                            <Badge key={aprovador.usuarioId} variant="secondary" className="gap-1">
                              <span className="font-medium">{idx + 1}.</span>
                              <span>{aprovador.usuarioNome}</span>
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(nivel)} aria-label="Editar faixa">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(nivel.id)}
                            className="text-danger-600 hover:text-danger-700"
                            aria-label="Excluir faixa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingNivel(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingNivel ? 'Editar Faixa' : 'Nova Faixa de Alçada'}</DialogTitle>
            <DialogDescription>
              Configure a faixa de valor e a cadeia de aprovadores
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <div
              className="flex items-center gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700 dark:bg-danger-900/30 dark:text-danger-400"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" name="obraId" value={obra.id} />

            <FormField label="Limite Inferior (inclusivo) *" required error={errors.limiteInferior?.message}>
              <Controller
                control={form.control}
                name="limiteInferior"
                render={({ field }) => (
                  <CurrencyInput
                    name={field.name}
                    placeholder="0,00"
                    value={field.value ?? null}
                    onChange={(v) => field.onChange(v ?? 0)}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </FormField>

            <FormField label="Limite Superior (exclusivo) — vazio = sem teto" error={errors.limiteSuperior?.message}>
              <Controller
                control={form.control}
                name="limiteSuperior"
                render={({ field }) => (
                  <CurrencyInput
                    name={field.name}
                    placeholder="10.000,00"
                    value={field.value ?? null}
                    onChange={(v) => field.onChange(v)}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Descrição"
              hint="Opcional - máximo 120 caracteres"
              error={errors.descricao?.message}
            >
              <Controller
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    placeholder="Ex: Compras de pequeno valor"
                    maxLength={120}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Aprovadores (ordem do fluxo) *"
              required
              error={errors.usuariosAprovadores?.message}
            >
              <Controller
                control={form.control}
                name="usuariosAprovadores"
                render={({ field }) => (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Selecione os aprovadores na ordem do fluxo
                      </span>
                      <span className="text-xs text-neutral-500">
                        {field.value.length} selecionado{field.value.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-neutral-300 p-2 dark:border-neutral-600">
                      {usuarios.map((usuario) => {
                        const checked = field.value.includes(usuario.id);
                        return (
                          <label key={usuario.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800">
                            <input
                              type="checkbox"
                              aria-label={`Aprovador: ${usuario.nome} (${usuario.email})`}
                              checked={checked}
                              onChange={() => {
                                field.onChange(
                                  checked
                                    ? field.value.filter((id) => id !== usuario.id)
                                    : [...field.value, usuario.id]
                                );
                              }}
                            />
                            {usuario.nome} ({usuario.email})
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              />
            </FormField>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                form.reset({ obraId: obra.id, ...defaultNivel });
                setEditingNivel(null);
              }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editingNivel ? 'Salvar Alterações' : 'Criar Faixa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
