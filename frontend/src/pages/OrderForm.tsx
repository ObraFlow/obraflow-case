import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Work { id: number; name: string; }
interface Supplier { id: number; name: string; }

interface OrderItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export default function OrderForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [workId, setWorkId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [observations, setObservations] = useState('');
  const [items, setItems] = useState<OrderItem[]>([
    { description: '', quantity: 1, unit: 'un', unitPrice: 0 }
  ]);
  const [error, setError] = useState<string | null>(null);

  const { data: works } = useQuery<Work[]>({ queryKey: ['works'], queryFn: () => api.get('/works').then(res => res.data) });
  const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers').then(res => res.data) });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate('/');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Erro ao criar pedido.');
    }
  });

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit: 'un', unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!workId || !supplierId || !date) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (items.some(i => !i.description || i.quantity <= 0 || i.unitPrice < 0)) {
      setError('Por favor, verifique os itens do pedido.');
      return;
    }

    createMutation.mutate({
      workId: Number(workId),
      supplierId: Number(supplierId),
      date,
      observations,
      items
    });
  };

  const isValid = workId && supplierId && date && items.length > 0 && items.every(i => i.description && i.quantity > 0);

  return (
    <div className="max-w-4xl mx-auto">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">Novo Pedido de Compra</h3>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 grid grid-cols-2 gap-6">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 mb-2">Obra *</label>
            <select
              value={workId}
              onChange={(e) => setWorkId(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            >
              <option value="">Selecione a obra</option>
              {works?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 mb-2">Fornecedor *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            >
              <option value="">Selecione o fornecedor</option>
              {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-bold text-gray-700 mb-2">Data do Pedido *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">Observações Internas</label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              rows={2}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h4 className="font-bold text-gray-700 uppercase text-xs tracking-widest">Itens do Pedido</h4>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              Adicionar Item
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4 w-24">Qtd</th>
                  <th className="px-6 py-4 w-24">Unidade</th>
                  <th className="px-6 py-4 w-32">Preço Unit.</th>
                  <th className="px-6 py-4 w-32">Total</th>
                  <th className="px-6 py-4 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={index} className="group hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="w-full p-2 border border-transparent group-hover:border-gray-200 rounded outline-none focus:border-blue-500 transition-colors"
                        placeholder="Ex: Cimento CP II"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                        className="w-full p-2 border border-transparent group-hover:border-gray-200 rounded outline-none focus:border-blue-500 transition-colors"
                        min="0.1"
                        step="0.1"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                        className="w-full p-2 border border-transparent group-hover:border-gray-200 rounded outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="un">un</option>
                        <option value="kg">kg</option>
                        <option value="m">m</option>
                        <option value="m2">m²</option>
                        <option value="h">h</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400 font-normal">R$</span>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                          className="w-full p-2 border border-transparent group-hover:border-gray-200 rounded outline-none focus:border-blue-500 transition-colors"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantity * item.unitPrice)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="text-gray-300 hover:text-red-500 disabled:opacity-0 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 bg-gray-50 flex justify-between items-center border-t border-gray-200">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total do Pedido</p>
              <p className="text-3xl font-black text-gray-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal())}
              </p>
            </div>
            
            <button
              type="submit"
              disabled={!isValid || createMutation.isPending}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
            >
              <Save className="w-5 h-5" />
              Cadastrar Pedido
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
