import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Trash2, User, ArrowRight, Save, Building2 } from 'lucide-react';
import { useState } from 'react';

interface Work { id: number; name: string; }
interface User { id: number; name: string; }

interface RuleLevel {
  order: number;
  approverIds: number[];
}

export default function RulesConfig() {
  const queryClient = useQueryClient();
  const [selectedWorkId, setSelectedWorkId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  
  // New Rule State
  const [minValue, setMinValue] = useState(0);
  const [maxValue, setMaxValue] = useState<number | null>(null);
  const [levels, setLevels] = useState<RuleLevel[]>([
    { order: 0, approverIds: [] }
  ]);

  const { data: works } = useQuery<Work[]>({ queryKey: ['works'], queryFn: () => api.get('/works').then(res => res.data) });
  const { data: users } = useQuery<User[]>({ queryKey: ['users'], queryFn: () => api.get('/users').then(res => res.data) });
  
  const { data: rules } = useQuery({
    queryKey: ['rules', selectedWorkId],
    queryFn: () => api.get(`/rules/${selectedWorkId}`).then(res => res.data),
    enabled: !!selectedWorkId
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/rules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules', selectedWorkId] });
      setIsAdding(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules', selectedWorkId] });
    }
  });

  const resetForm = () => {
    setMinValue(0);
    setMaxValue(null);
    setLevels([{ order: 0, approverIds: [] }]);
  };

  const addLevel = () => {
    setLevels([...levels, { order: levels.length, approverIds: [] }]);
  };

  const removeLevel = (index: number) => {
    if (levels.length > 1) {
      setLevels(levels.filter((_, i) => i !== index).map((l, i) => ({ ...l, order: i })));
    }
  };

  const toggleApprover = (levelIndex: number, userId: number) => {
    const newLevels = [...levels];
    const approverIds = newLevels[levelIndex].approverIds;
    if (approverIds.includes(userId)) {
      newLevels[levelIndex].approverIds = approverIds.filter(id => id !== userId);
    } else {
      newLevels[levelIndex].approverIds = [...approverIds, userId];
    }
    setLevels(newLevels);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      workId: Number(selectedWorkId),
      minValue,
      maxValue,
      levels
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-bold text-gray-800">Regras de Alçada</h3>
        
        <div className="flex items-center gap-4">
          <Building2 className="w-5 h-5 text-gray-400" />
          <select
            value={selectedWorkId}
            onChange={(e) => setSelectedWorkId(e.target.value)}
            className="p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
          >
            <option value="">Selecione a obra</option>
            {works?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      {!selectedWorkId ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-500">
          Selecione uma obra para ver e configurar as regras.
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h4 className="font-bold text-gray-700 uppercase text-xs tracking-widest">Regras Configuradas</h4>
              {!isAdding && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-bold"
                >
                  <Plus className="w-4 h-4" />
                  Nova Faixa
                </button>
              )}
            </div>

            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4">Faixa de Valor</th>
                  <th className="px-6 py-4">Cadeia de Aprovação</th>
                  <th className="px-6 py-4 w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rules?.map((rule: any) => (
                  <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {rule.maxValue 
                          ? `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rule.minValue)} até ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rule.maxValue)}`
                          : `Acima de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rule.minValue)}`
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center flex-wrap gap-2">
                        {rule.levels.map((level: any, i: number) => (
                          <div key={level.id} className="flex items-center gap-2">
                            {i > 0 && <ArrowRight className="w-3 h-3 text-gray-300" />}
                            <div className="flex -space-x-1">
                              {level.approvers.map((a: any) => (
                                <div key={a.id} className="w-6 h-6 rounded-full bg-blue-100 border border-white flex items-center justify-center text-[10px] font-bold text-blue-600" title={a.user.name}>
                                  {a.user.name.charAt(0)}
                                </div>
                              ))}
                            </div>
                            <span className="text-xs text-gray-600">
                              {level.approvers.map((a: any) => a.user.name).join(', ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => deleteMutation.mutate(rule.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isAdding && (
            <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden animate-in slide-in-from-top duration-300">
              <div className="p-4 bg-blue-50 border-b border-blue-100">
                <h4 className="font-bold text-blue-700 uppercase text-xs tracking-widest">Nova Faixa de Alçada</h4>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Valor Mínimo (R$)</label>
                    <input
                      type="number"
                      value={minValue}
                      onChange={(e) => setMinValue(Number(e.target.value))}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Valor Máximo (R$ - opcional)</label>
                    <input
                      type="number"
                      value={maxValue || ''}
                      onChange={(e) => setMaxValue(e.target.value ? Number(e.target.value) : null)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Sem limite"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-bold text-gray-700">Cadeia de Aprovadores</label>
                    <button
                      type="button"
                      onClick={addLevel}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      + Adicionar Nível
                    </button>
                  </div>

                  {levels.map((level, lIndex) => (
                    <div key={lIndex} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative group">
                      <div className="absolute -left-2 top-4 w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                        {lIndex + 1}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => removeLevel(lIndex)}
                        className="absolute right-4 top-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                        {users?.map(user => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => toggleApprover(lIndex, user.id)}
                            className={`flex items-center gap-2 p-2 rounded border text-xs transition-all ${
                              level.approverIds.includes(user.id)
                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
                            }`}
                          >
                            <User className={`w-3 h-3 ${level.approverIds.includes(user.id) ? 'text-blue-100' : 'text-gray-400'}`} />
                            <span className="truncate">{user.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => { setIsAdding(false); resetForm(); }}
                    className="px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || levels.some(l => l.approverIds.length === 0)}
                    className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-100"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Regra
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
