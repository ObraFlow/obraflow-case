'use client';

import { FormEvent, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/client';
import { API_ROUTES } from '@/constants/api-routes';
import { formatMoney } from '@/lib/format';
import { createOrderSchema } from '@/schemas/order.schema';
import { Option, OrderItem } from '@/types/obraflow';
import { z } from 'zod';

const emptyItem = (): OrderItem => ({
  description: '',
  quantity: '1',
  unit: 'un',
  unitPrice: '',
});

function sanitizeMoneyInput(value: string): string {
  const normalized = value.replace(/[^\d.,]/g, '').replace(',', '.');
  const [whole, ...fractionParts] = normalized.split('.');
  if (!fractionParts.length) return whole;
  return `${whole}.${fractionParts.join('').slice(0, 2)}`;
}

function parseMoney(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

type Props = {
  works: Option[];
  suppliers: Option[];
  selectedWork: string;
  onWorkChange: (value: string) => void;
  onSuccess: (message: string) => void;
  onReload: () => Promise<void>;
};

export function NewOrderForm({
  works,
  suppliers,
  selectedWork,
  onWorkChange,
  onSuccess,
  onReload,
}: Props) {
  const [items, setItems] = useState<OrderItem[]>([emptyItem()]);
  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState('');
  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * parseMoney(item.unitPrice),
        0,
      ),
    [items],
  );
  const updateItem = (index: number, patch: Partial<OrderItem>) =>
    setItems(
      items.map((item, current) =>
        current === index ? { ...item, ...patch } : item,
      ),
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = createOrderSchema.safeParse({
      workId: selectedWork,
      supplierId,
      orderDate,
      notes,
      items,
    });
    if (!parsed.success) {
      onSuccess(
        parsed.error.issues[0]?.message ?? 'Revise os campos do pedido.',
      );
      return;
    }
    try {
      const response = await apiRequest(API_ROUTES.orders.list, z.unknown(), {
        method: 'POST',
        body: JSON.stringify({
          workId: Number(selectedWork),
          supplierId: Number(supplierId),
          orderDate: new Date(orderDate).toISOString(),
          notes: notes || undefined,
          items: items.map((item) => ({
            ...item,
            unitPriceCents: Math.round(parseMoney(item.unitPrice) * 100),
          })),
        }),
      });
      setItems([emptyItem()]);
      setNotes('');
      onSuccess(response.message || 'Pedido criado e enviado para aprovação.');
      await onReload();
    } catch (cause) {
      onSuccess(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível criar o pedido.',
      );
    }
  };

  return (
    <form onSubmit={submit} className="page-grid">
      <div className="main-column">
        <SectionHeading
          step="01"
          title="Dados gerais"
          description="Informe o contexto da sua solicitação."
        />
        <div className="card form-card">
          <label>
            Obra
            <select
              required
              value={selectedWork}
              onChange={(event) => onWorkChange(event.target.value)}
            >
              <option value="">Selecione uma obra</option>
              {works.map((work) => (
                <option key={work.id} value={work.id}>
                  {work.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fornecedor
            <select
              required
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
            >
              <option value="">Selecione um fornecedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data do pedido
            <input
              required
              type="date"
              value={orderDate}
              onChange={(event) => setOrderDate(event.target.value)}
            />
          </label>
          <label>
            Observações internas
            <textarea
              placeholder="Alguma informação importante para os aprovadores?"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>
        <div className="section-heading items-heading">
          <SectionHeading
            step="02"
            title="Itens do pedido"
            description="Adicione os materiais ou serviços da compra."
          />
          <span className="item-count">
            {items.length} {items.length === 1 ? 'item' : 'itens'}
          </span>
        </div>
        <div className="card table-card">
          <div className="item-header">
            <span>Descrição</span>
            <span>Quantidade</span>
            <span>Unidade</span>
            <span>Preço unitário</span>
            <span>Total</span>
            <span />
          </div>
          {items.map((item, index) => (
            <div className="item-row" key={index}>
              <input
                required
                placeholder="Ex.: Cimento CP-II"
                value={item.description}
                onChange={(event) =>
                  updateItem(index, { description: event.target.value })
                }
              />
              <input
                required
                type="number"
                min="0.001"
                step="0.001"
                value={item.quantity}
                onChange={(event) =>
                  updateItem(index, { quantity: event.target.value })
                }
              />
              <input
                required
                placeholder="un"
                value={item.unit}
                onChange={(event) =>
                  updateItem(index, { unit: event.target.value })
                }
              />
              <div className="money-input">
                <span>R$</span>
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]+([.,][0-9]{1,2})?"
                  value={item.unitPrice}
                  onChange={(event) =>
                    updateItem(index, {
                      unitPrice: sanitizeMoneyInput(event.target.value),
                    })
                  }
                />
              </div>
              <strong>
                {formatMoney(
                  Number(item.quantity || 0) * parseMoney(item.unitPrice) * 100,
                )}
              </strong>
              <button
                type="button"
                className="remove"
                disabled={items.length === 1}
                onClick={() =>
                  setItems(items.filter((_, current) => current !== index))
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-item"
            onClick={() => setItems([...items, emptyItem()])}
          >
            ＋ Adicionar item
          </button>
        </div>
      </div>
      <aside className="summary card">
        <p className="summary-label">RESUMO DO PEDIDO</p>
        <div className="summary-line">
          <span>Itens</span>
          <strong>{items.length}</strong>
        </div>
        <div className="summary-line">
          <span>Subtotal</span>
          <strong>{formatMoney(total * 100)}</strong>
        </div>
        <div className="summary-total">
          <span>Total do pedido</span>
          <strong>{formatMoney(total * 100)}</strong>
        </div>
        <div className="approval-hint">
          <span>✦</span>
          <p>
            <strong>Alçada calculada automaticamente</strong>
            <br />A cadeia de aprovadores será definida pelo valor total.
          </p>
        </div>
        <button
          className="primary-button"
          disabled={!selectedWork || !supplierId || total <= 0}
        >
          Cadastrar pedido <span>→</span>
        </button>
        <p className="secure">⌁ Seus dados estão protegidos</p>
      </aside>
    </form>
  );
}

function SectionHeading({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <span className="step">{step}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}
