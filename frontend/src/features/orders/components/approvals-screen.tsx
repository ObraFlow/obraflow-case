'use client';

import { apiRequest } from '@/lib/client';
import { API_ROUTES } from '@/constants/api-routes';
import { formatMoney } from '@/lib/format';
import { decideOrderSchema } from '@/schemas/order.schema';
import { EmptyState } from '@/components/ui/feedback';
import { Order } from '@/types/obraflow';
import { z } from 'zod';

export function ApprovalsScreen({
  orders,
  onNotice,
  onReload,
}: {
  orders: Order[];
  onNotice: (message: string) => void;
  onReload: () => Promise<void>;
}) {
  const decide = async (order: Order, approve: boolean) => {
    const userId = window.prompt('ID do aprovador atual:');
    if (!userId) return;
    const reason = approve
      ? undefined
      : (window.prompt('Motivo da rejeição:') ?? '');
    const parsed = decideOrderSchema.safeParse({ userId, reason });
    if (!parsed.success) return;
    const response = await apiRequest(
      approve
        ? API_ROUTES.orders.approve(order.id)
        : API_ROUTES.orders.reject(order.id),
      z.unknown(),
      {
        method: 'POST',
        body: JSON.stringify({ userId: Number(userId), reason }),
      },
    );
    onNotice(
      response.message ||
        (approve ? 'Aprovação registrada.' : 'Pedido rejeitado.'),
    );
    await onReload();
  };
  const pending = orders.filter((order) => order.status === 'PENDING');
  return (
    <div className="screen-stack">
      <div className="stats">
        <Stat icon="◎" tone="coral" label="PENDENTES" value={pending.length} />
        <Stat
          icon="✓"
          tone="green"
          label="APROVADOS"
          value={orders.filter((order) => order.status === 'APPROVED').length}
        />
        <Stat
          icon="◌"
          tone="gray"
          label="VALOR EM ANÁLISE"
          value={formatMoney(
            pending.reduce((sum, order) => sum + order.totalCents, 0),
          )}
        />
      </div>
      <div className="card orders-card">
        <div className="card-title">
          <div>
            <h2>Pedidos recentes</h2>
            <p>Acompanhe o fluxo de aprovação das compras.</p>
          </div>
          <button className="filter-button">Todos os pedidos⌄</button>
        </div>
        {orders.length === 0 ? (
          <EmptyState>Nenhum pedido cadastrado ainda.</EmptyState>
        ) : (
          <div className="orders-table">
            <div className="order-head">
              <span>PEDIDO</span>
              <span>OBRA / FORNECEDOR</span>
              <span>DATA</span>
              <span>VALOR</span>
              <span>SITUAÇÃO</span>
              <span>AÇÃO</span>
            </div>
            {orders.map((order) => (
              <div className="order-row" key={order.id}>
                <div>
                  <strong>#{String(order.id).padStart(4, '0')}</strong>
                  <small>Pedido de compra</small>
                </div>
                <div>
                  <strong>{order.work}</strong>
                  <small>{order.supplier}</small>
                </div>
                <span>
                  {new Date(order.orderDate).toLocaleDateString('pt-BR')}
                </span>
                <strong>{formatMoney(order.totalCents)}</strong>
                <span className={`status ${order.status.toLowerCase()}`}>
                  {order.status === 'PENDING'
                    ? 'Pendente'
                    : order.status === 'APPROVED'
                      ? 'Aprovado'
                      : 'Rejeitado'}
                </span>
                {order.status === 'PENDING' ? (
                  <div className="row-actions">
                    <button onClick={() => void decide(order, true)}>
                      Aprovar
                    </button>
                    <button
                      className="reject"
                      onClick={() => void decide(order, false)}
                    >
                      Rejeitar
                    </button>
                  </div>
                ) : (
                  <span className="muted">Concluído</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  tone,
  label,
  value,
}: {
  icon: string;
  tone: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="stat card">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
