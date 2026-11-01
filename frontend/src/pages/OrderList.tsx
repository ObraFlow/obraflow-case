import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Check, X, Clock, User, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface Order {
  id: number;
  work: { name: string };
  supplier: { name: string };
  date: string;
  total: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  currentLevel: number;
  items: any[];
  currentApprovers: any[];
  history: any[];
}

export default function OrderList() {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: orders, isLoading, error } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders').then(res => res.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/orders/${id}/approve`, { userId: 1 }), // Simulando João (ID 1)
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number, reason: string }) => 
      api.post(`/orders/${id}/reject`, { userId: 1, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setRejectingId(null);
      setRejectReason('');
    },
  });

  if (isLoading) return <div className="flex justify-center p-12"><Clock className="animate-spin text-blue-600" /></div>;
  if (error) return <div className="text-red-500 p-4 bg-red-50 rounded">Erro ao carregar pedidos. Tente novamente.</div>;
  if (!orders || orders.length === 0) return <div className="text-gray-500 text-center p-12">Nenhum pedido cadastrado.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800">Pedidos de Compra</h3>
      </div>

      <div className="grid gap-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                      #{order.id}
                    </span>
                    <h4 className="font-bold text-lg text-gray-900">{order.work.name}</h4>
                  </div>
                  <p className="text-sm text-gray-500">Fornecedor: {order.supplier.name}</p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    order.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    order.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.status === 'PENDING' && <Clock className="w-3 h-3 mr-1" />}
                    {order.status === 'APPROVED' && <Check className="w-3 h-3 mr-1" />}
                    {order.status === 'REJECTED' && <X className="w-3 h-3 mr-1" />}
                    {order.status}
                  </div>
                  <div className="text-xl font-bold text-gray-900 mt-2">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 py-4 border-t border-gray-100">
                <div>
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Status da Alçada</h5>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${order.status === 'APPROVED' ? 'bg-green-500' : order.status === 'REJECTED' ? 'bg-red-500' : 'bg-blue-500'}`} />
                      <span className="text-sm text-gray-700">
                        {order.status === 'PENDING' ? `Nível ${order.currentLevel + 1} - Aguardando Aprovação` : `Fluxo Encerrado - ${order.status}`}
                      </span>
                    </div>
                    {order.status === 'PENDING' && order.currentApprovers.length > 0 && (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">Aprovadores atuais:</p>
                        <div className="flex flex-wrap gap-2">
                          {order.currentApprovers.map(approver => (
                            <span key={approver.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700">
                              <User className="w-3 h-3 text-gray-400" />
                              {approver.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Histórico</h5>
                  <div className="space-y-2">
                    {order.history.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">Nenhuma ação registrada.</p>
                    ) : (
                      order.history.map((h, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <div className="mt-1">
                            {h.action === 'APPROVE' ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{h.user.name}</p>
                            <p className="text-xs text-gray-500">{h.action === 'APPROVE' ? 'Aprovou' : 'Rejeitou'} em {new Date(h.date).toLocaleDateString()}</p>
                            {h.reason && <p className="text-xs bg-red-50 text-red-700 p-2 rounded mt-1 border border-red-100 italic">"{h.reason}"</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {order.status === 'PENDING' && (
                <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end gap-3">
                  {rejectingId === order.id ? (
                    <div className="flex-1 flex flex-col gap-2">
                      <textarea
                        className="w-full p-2 border border-red-200 rounded text-sm focus:ring-1 focus:ring-red-500 outline-none"
                        placeholder="Motivo da rejeição (obrigatório)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setRejectingId(null)}
                          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate({ id: order.id, reason: rejectReason })}
                          disabled={!rejectReason || rejectMutation.isPending}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50"
                        >
                          Confirmar Rejeição
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setRejectingId(order.id)}
                        className="flex items-center gap-2 px-6 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Rejeitar
                      </button>
                      <button
                        onClick={() => approveMutation.mutate(order.id)}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        Aprovar
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
