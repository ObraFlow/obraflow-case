"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiError, api, errorText, useData } from "@/lib/client-api";
import {
  dateLabel,
  instantLabel,
  money,
  shortId,
  statusLabels,
  type OrderDetail as Detail,
} from "@/lib/ui-types";
import { useSession } from "./app-shell";
import { Chain, ErrorState, Icon, Loading, Modal } from "./ui";

export function OrderDetail({ id }: { id: string }) {
  const { actor, setActorGuard } = useSession();
  const order = useData<{ data: Detail }>(`/orders/${id}`, actor);
  const [outcome, setOutcome] = useState<"APPROVE" | "REJECT" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const close = useCallback(() => {
    setOutcome(null);
    setError("");
    setReasonError("");
    setConflict(false);
  }, []);
  useEffect(() => {
    Promise.resolve().then(() => {
      setOutcome(null);
      setError("");
      setFeedback("");
    });
  }, [actor]);
  useEffect(() => {
    setActorGuard(() => !busy);
    return () => setActorGuard(null);
  }, [busy, setActorGuard]);
  async function decide() {
    const current = order.data?.data;
    if (!current || !outcome) return;
    if (outcome === "REJECT" && (!reason.trim() || reason.trim().length > 2000)) {
      setReasonError("Informe um motivo de rejeição, com até 2.000 caracteres.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/orders/${id}/decisions`, actor, {
        method: "POST",
        body: JSON.stringify({
          expectedVersion: current.version,
          outcome,
          ...(outcome === "REJECT" ? { reason: reason.trim() } : {}),
        }),
      });
      setOutcome(null);
      setReason("");
      setFeedback(
        outcome === "REJECT"
          ? "Pedido rejeitado. O motivo foi registrado e o fluxo foi encerrado."
          : "Aprovação registrada. A situação do pedido foi atualizada.",
      );
      order.reload();
    } catch (issue) {
      if (issue instanceof ApiError && (issue.status === 409 || issue.status === 403)) {
        setConflict(true);
        setError(
          "Este pedido foi atualizado ou sua permissão mudou. A situação atual está sendo carregada. Confira os detalhes antes de decidir novamente.",
        );
        order.reload();
      } else {
        setError(errorText(issue));
        setConflict(true);
        order.reload();
      }
    } finally {
      setBusy(false);
    }
  }
  const value = order.data?.data;
  const currentStep = value?.approval.steps.find((step) => step.status === "CURRENT");
  const created =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("created");
  return (
    <>
      <Link href="/" className="back-link">
        <Icon name="back" size={16} /> Voltar para aprovações
      </Link>
      {created && (
        <div className="notice success" role="status">
          <Icon name="check" /> Pedido cadastrado com sucesso. Acompanhe a aprovação por aqui.
        </div>
      )}
      {feedback && (
        <div className="notice success" role="status">
          <Icon name="check" />
          {feedback}
        </div>
      )}
      {order.loading ? (
        <Loading label="Carregando detalhes do pedido…" />
      ) : order.error ? (
        <ErrorState message={order.error} retry={order.reload} />
      ) : (
        value && (
          <>
            <div className="page-heading detail-heading">
              <div>
                <div className="eyebrow">PEDIDO DE COMPRA</div>
                <h1>
                  Pedido {shortId(value.id)}{" "}
                  <span className={`status ${value.status.toLowerCase()}`}>
                    <span />
                    {statusLabels[value.status]}
                  </span>
                </h1>
                <p>
                  {value.project.name} <span className="dot-separator">·</span> Solicitado por{" "}
                  {value.requester.name}
                </p>
              </div>
              <button className="button secondary" onClick={order.reload}>
                <Icon name="clock" size={16} /> Atualizar
              </button>
            </div>
            <div className="detail-grid">
              <div className="detail-main">
                <section className="panel form-panel">
                  <div className="section-heading">
                    <span className="section-icon">
                      <Icon name="file" />
                    </span>
                    <div>
                      <h2>Informações do pedido</h2>
                      <p>Contexto completo para a sua decisão.</p>
                    </div>
                  </div>
                  <dl className="detail-info">
                    <div>
                      <dt>Obra</dt>
                      <dd>{value.project.name}</dd>
                    </div>
                    <div>
                      <dt>Fornecedor</dt>
                      <dd>{value.supplier.name}</dd>
                    </div>
                    <div>
                      <dt>Data do pedido</dt>
                      <dd>{dateLabel(value.orderDate)}</dd>
                    </div>
                    <div>
                      <dt>Solicitante</dt>
                      <dd>{value.requester.name}</dd>
                    </div>
                  </dl>
                  {value.notes && (
                    <div className="notes-box">
                      <span>OBSERVAÇÕES INTERNAS</span>
                      <p>{value.notes}</p>
                    </div>
                  )}
                </section>
                <section className="panel">
                  <div className="panel-top">
                    <div>
                      <h2>
                        Itens da compra <span className="count-pill">{value.itemCount}</span>
                      </h2>
                      <p>Valores confirmados no cadastro do pedido.</p>
                    </div>
                  </div>
                  <div className="table-scroll">
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>Descrição</th>
                          <th>Quantidade</th>
                          <th>Unidade</th>
                          <th>Preço unitário</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {value.items.map((item) => (
                          <tr key={item.position}>
                            <td data-label="Descrição">
                              <strong>{item.description}</strong>
                            </td>
                            <td data-label="Quantidade">{item.quantity.replace(".", ",")}</td>
                            <td data-label="Unidade">{item.unit}</td>
                            <td data-label="Preço unitário">{money(item.unitPrice)}</td>
                            <td data-label="Total">
                              <strong>{money(item.lineTotal)}</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="table-total">
                    <span>Total do pedido</span>
                    <strong>{money(value.total)}</strong>
                  </div>
                </section>
                <section className="panel form-panel">
                  <div className="section-heading">
                    <span className="section-icon">
                      <Icon name="clock" />
                    </span>
                    <div>
                      <h2>Histórico de decisões</h2>
                      <p>Rastreabilidade de cada etapa · Horário de Brasília</p>
                    </div>
                  </div>
                  {!value.history.length ? (
                    <p className="muted">
                      Nenhuma decisão registrada. O pedido está aguardando a primeira aprovação.
                    </p>
                  ) : (
                    <ol className="history-list">
                      {value.history.map((event) => (
                        <li key={event.id}>
                          <span
                            className={`history-icon ${event.outcome === "APPROVE" ? "approved" : "rejected"}`}
                          >
                            <Icon
                              name={event.outcome === "APPROVE" ? "check" : "close"}
                              size={15}
                            />
                          </span>
                          <div>
                            <strong>
                              {event.actor.name}{" "}
                              <span>
                                {event.outcome === "APPROVE"
                                  ? "aprovou o pedido"
                                  : "rejeitou o pedido"}
                              </span>
                            </strong>
                            <small>
                              Etapa {event.stepPosition} · {instantLabel(event.decidedAt)}
                            </small>
                            {event.reason && <blockquote>{event.reason}</blockquote>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>
              <aside className="summary-column">
                <section className="panel summary-panel">
                  <span className="eyebrow">ACOMPANHAMENTO</span>
                  <div className="summary-total">
                    <span>Valor total</span>
                    <strong>{money(value.total)}</strong>
                    <small>
                      {value.itemCount} {value.itemCount === 1 ? "item" : "itens"} nesta compra
                    </small>
                  </div>
                  <div className="approval-preview">
                    <h3>
                      <Icon name="shield" size={17} /> Alçada do pedido
                    </h3>
                    <Chain steps={value.approval.steps} />
                    <p className="field-hint">
                      Cadeia atribuída no cadastro · configuração v{value.ruleSnapshot.version}.
                      Mudanças nas regras não alteram este pedido.
                    </p>
                  </div>
                  {value.permissions.canDecide ? (
                    <div className="decision-area">
                      <span className="decision-eyebrow">SUA DECISÃO</span>
                      <p>
                        Este pedido aguarda a aprovação de{" "}
                        <strong>{currentStep?.approver.name}</strong>.
                      </p>
                      <button
                        className="button primary full-width"
                        onClick={() => {
                          setOutcome("APPROVE");
                          setConflict(false);
                          setError("");
                        }}
                      >
                        <Icon name="check" size={17} /> Aprovar pedido
                      </button>
                      <button
                        className="button danger-outline full-width"
                        onClick={() => {
                          setOutcome("REJECT");
                          setConflict(false);
                          setError("");
                        }}
                      >
                        <Icon name="close" size={17} /> Rejeitar pedido
                      </button>
                    </div>
                  ) : (
                    <div className="closed-decision">
                      <button className="button primary full-width" disabled>
                        <Icon name="check" size={17} /> Aprovar pedido
                      </button>
                      <button className="button danger-outline full-width" disabled>
                        <Icon name="close" size={17} /> Rejeitar pedido
                      </button>
                      <div className="notice closed-notice">
                        <Icon name={value.status === "APPROVED" ? "check" : "info"} size={19} />
                        <div>
                          {value.status === "APPROVED"
                            ? "Todas as etapas foram concluídas. Este pedido está aprovado."
                            : value.status === "REJECTED"
                              ? "O pedido foi rejeitado. O fluxo está encerrado."
                              : `Aguardando decisão de ${currentStep?.approver.name ?? "outro aprovador"}. Selecione o responsável para decidir.`}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
                <div className="quiet-note">
                  <Icon name="shield" size={16} /> Pedido enviado. Itens e cadeia de aprovação
                  preservados.
                </div>
              </aside>
            </div>
          </>
        )
      )}
      {outcome && (
        <Modal
          title={outcome === "APPROVE" ? "Confirmar aprovação" : "Rejeitar pedido"}
          onClose={close}
          busy={busy}
        >
          <p className="modal-description">
            {value
              ? `${shortId(value.id)} · ${value.project.name} · ${money(value.total)}`
              : "Confira os dados atualizados do pedido."}
          </p>
          <div className="notice">
            {outcome === "REJECT"
              ? "A rejeição encerra o fluxo de aprovação. Informe o motivo para que ele fique registrado no histórico."
              : value && value.approval.currentStepPosition === value.approval.stepCount
                ? "Sua aprovação conclui a cadeia e aprova o pedido."
                : "Sua aprovação encaminha o pedido para a próxima pessoa da cadeia."}
          </div>
          {outcome === "REJECT" && (
            <label className="full-field">
              Motivo da rejeição <span className="required">*</span>
              <textarea
                rows={4}
                value={reason}
                disabled={busy}
                maxLength={2000}
                aria-invalid={!!reasonError}
                aria-describedby="reason-error"
                onChange={(event) => {
                  setReason(event.target.value);
                  setReasonError("");
                }}
                placeholder="Explique o que precisa ser revisto…"
              />
              <span className="field-error" id="reason-error">
                {reasonError}
              </span>
            </label>
          )}
          {error && <ErrorState message={error} />}
          <div className="modal-actions">
            <button disabled={busy} className="button secondary" onClick={close}>
              {conflict ? "Conferir pedido atualizado" : "Cancelar"}
            </button>
            {!conflict && (
              <button
                className={`button ${outcome === "REJECT" ? "danger" : "primary"}`}
                disabled={busy || !value || order.loading}
                onClick={() => void decide()}
              >
                {busy
                  ? "Registrando…"
                  : outcome === "REJECT"
                    ? "Confirmar rejeição"
                    : "Confirmar aprovação"}
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
