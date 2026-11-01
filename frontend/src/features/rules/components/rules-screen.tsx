'use client';

import { FormEvent, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/client';
import { API_ROUTES } from '@/constants/api-routes';
import { formatMoney } from '@/lib/format';
import { approvalRuleSchema } from '@/schemas/approval-rule.schema';
import { EmptyState } from '@/components/ui/feedback';
import { Option, Rule } from '@/types/obraflow';
import { z } from 'zod';

export function RulesScreen({
  works,
  users,
  selectedWork,
  onWorkChange,
  rules,
  onNotice,
  onReload,
}: {
  works: Option[];
  users: Option[];
  selectedWork: string;
  onWorkChange: (value: string) => void;
  rules: Rule[];
  onNotice: (message: string) => void;
  onReload: () => Promise<void>;
}) {
  const [minimum, setMinimum] = useState('');
  const [maximum, setMaximum] = useState('');
  const [approverIds, setApproverIds] = useState<string[]>([]);
  const [approverSearch, setApproverSearch] = useState('');
  const [saveError, setSaveError] = useState('');
  const selectedApprovers = useMemo(
    () =>
      approverIds
        .map((id) => users.find((user) => String(user.id) === id))
        .filter((user): user is Option => user !== undefined),
    [approverIds, users],
  );
  const availableApprovers = useMemo(() => {
    const search = approverSearch.trim().toLocaleLowerCase();
    return users
      .filter(
        (user) =>
          !approverIds.includes(String(user.id)) &&
          (!search || user.name.toLocaleLowerCase().includes(search)),
      )
      .slice(0, 20);
  }, [approverSearch, approverIds, users]);

  const addApprover = (userId: string) => {
    if (!userId || approverIds.includes(userId)) return;
    setApproverIds((current) => [...current, userId]);
    setApproverSearch('');
  };

  const moveApprover = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= approverIds.length) return;
    setApproverIds((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaveError('');
    const parsed = approvalRuleSchema.safeParse({
      minimum,
      maximum: maximum || undefined,
      approverIds,
    });
    if (!parsed.success) {
      setSaveError(parsed.error.issues[0]?.message ?? 'Revise os campos.');
      return;
    }
    try {
      const response = await apiRequest(
        API_ROUTES.approvalRules.byWork(selectedWork),
        z.unknown(),
        {
          method: 'POST',
          body: JSON.stringify({
            minimumTotalCents: Math.round(Number(minimum) * 100),
            maximumTotalCents: maximum
              ? Math.round(Number(maximum) * 100)
              : undefined,
            approvers: approverIds.map((userId) => ({
              userId: Number(userId),
            })),
          }),
        },
      );
      setMinimum('');
      setMaximum('');
      setApproverIds([]);
      setApproverSearch('');
      onNotice(response.message || 'Faixa de alçada criada.');
      await onReload();
    } catch (cause) {
      setSaveError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível salvar a faixa.',
      );
    }
  };
  return (
    <div className="rules-layout">
      <div className="card rules-card">
        <div className="card-title">
          <div>
            <h2>Faixas de aprovação</h2>
            <p>Configure quem aprova cada faixa de valor.</p>
          </div>
          <select
            value={selectedWork}
            onChange={(event) => onWorkChange(event.target.value)}
          >
            {works.map((work) => (
              <option key={work.id} value={work.id}>
                {work.name}
              </option>
            ))}
          </select>
        </div>
        {rules.length === 0 ? (
          <EmptyState>Nenhuma regra cadastrada para esta obra.</EmptyState>
        ) : (
          rules.map((rule) => (
            <div className="rule-row" key={rule.id}>
              <div className="rule-range">
                <small>FAIXA DE VALOR</small>
                <strong>
                  {rule.maximumTotalCents
                    ? `Até ${formatMoney(rule.maximumTotalCents)}`
                    : `Acima de ${formatMoney(rule.minimumTotalCents)}`}
                </strong>
              </div>
              <div className="rule-people">
                <small>APROVADORES, NA ORDEM</small>
                <div>
                  {rule.approvers.map((approver) => (
                    <span className="person" key={approver.position}>
                      <span>
                        {approver.userName
                          .split(' ')
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)}
                      </span>
                      {approver.userName}
                      {approver.position < rule.approvers.length && <b>→</b>}
                    </span>
                  ))}
                </div>
              </div>
              <button className="dots">•••</button>
            </div>
          ))
        )}
      </div>
      <form className="card new-rule" onSubmit={save}>
        <p className="eyebrow">NOVA CONFIGURAÇÃO</p>
        <h2>Adicionar faixa</h2>
        <p>Defina o limite e a sequência de pessoas responsáveis.</p>
        <label>
          Valor mínimo (R$)
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={minimum}
            onChange={(event) => setMinimum(event.target.value)}
          />
        </label>
        <label>
          Valor máximo (R$) <span className="optional">opcional</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={maximum}
            onChange={(event) => setMaximum(event.target.value)}
          />
        </label>
        <label>Aprovadores</label>
        <div className="approver-picker">
          <input
            type="search"
            placeholder="Buscar usuário..."
            value={approverSearch}
            onChange={(event) => setApproverSearch(event.target.value)}
          />
          {approverSearch && (
            <div className="approver-results">
              {availableApprovers.length ? (
                availableApprovers.map((user) => (
                  <button
                    type="button"
                    key={user.id}
                    onClick={() => addApprover(String(user.id))}
                  >
                    {user.name}
                  </button>
                ))
              ) : (
                <span>Nenhum usuário encontrado.</span>
              )}
            </div>
          )}
        </div>
        <div className="selected-approvers">
          {selectedApprovers.length ? (
            selectedApprovers.map((user, index) => (
              <div className="selected-approver" key={user.id}>
                <span className="selected-position">{index + 1}</span>
                <span>{user.name}</span>
                <button
                  type="button"
                  aria-label={`Mover ${user.name} para cima`}
                  disabled={index === 0}
                  onClick={() => moveApprover(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Mover ${user.name} para baixo`}
                  disabled={index === selectedApprovers.length - 1}
                  onClick={() => moveApprover(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remover ${user.name}`}
                  onClick={() =>
                    setApproverIds((current) =>
                      current.filter((id) => id !== String(user.id)),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            <span className="approver-placeholder">
              Busque e adicione os aprovadores na ordem do fluxo.
            </span>
          )}
        </div>
        {saveError && <p className="rule-error">{saveError}</p>}
        <button
          className="primary-button"
          disabled={!selectedWork || !approverIds.length}
        >
          Salvar faixa <span>→</span>
        </button>
      </form>
    </div>
  );
}
