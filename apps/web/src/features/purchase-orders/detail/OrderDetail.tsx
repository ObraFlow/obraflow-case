import { AlertCard } from "@/components/ui/AlertCard";
import { Loading } from "@/components/Loading";
import { RefreshButton } from "@/components/RefreshButton";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { displayOrderNotes, type PurchaseOrderDetail } from "@dokimos/shared";
import { useAuth } from "@/auth/AuthContext";
import { ArrowLeft } from "lucide-react";
import { brl, date, orderRef } from "@/lib/format";
import { ErrorState } from "@/components/Feedback";
import { OrderStatus } from "@/features/purchase-orders/OrderStatus";
import { DecisionActions } from "@/features/purchase-orders/detail/DecisionActions";
import { ApprovalTimeline } from "@/features/purchase-orders/detail/ApprovalTimeline";
import { useOrderDetail } from "./useOrderDetail";
import styles from "./OrderDetail.module.css";

export function OrderDetail() {
  const { id = "" } = useParams();
  return <OrderDetailView key={id} id={id} />;
}
function OrderDetailView({ id }: { id: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const candidate = location.state?.createdOrder as PurchaseOrderDetail | undefined;
  const created = candidate?.id === id && candidate.createdById === user?.id ? candidate : undefined;
  // Consume the create response once; reload/back navigation must read the API.
  useEffect(() => {
    if (location.state?.createdOrder)
      void navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);
  const [reason, setReason] = useState("");
  const { order, error, loading, pending, stale, notice, decisionError, fieldErrors, decide, refresh } = useOrderDetail(
    id,
    created,
  );
  // A notification can reopen the order already on screen; honor its refresh request.
  const refreshRequest = location.state?.refreshOrder as number | undefined;
  const latestRefresh = useRef(refresh);
  latestRefresh.current = refresh;
  useEffect(() => {
    if (refreshRequest) latestRefresh.current();
  }, [refreshRequest]);
  return (
    <div className={`${styles.page} space-y-6`}>
      <Link to="/purchase-orders" className="text-link inline-flex items-center gap-2 text-sm">
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar aos pedidos
      </Link>
      {notice && (
        <AlertCard variant="warning" role="status">
          {notice}
        </AlertCard>
      )}
      {decisionError && (
        <AlertCard variant="error">
          {decisionError}
          {stale && <p className="mt-2">Atualize o pedido antes de tentar outra decisão.</p>}
        </AlertCard>
      )}
      {loading && !order ? (
        <Loading message="Carregando pedido…" />
      ) : error && !order ? (
        <ErrorState error={error} retry={refresh} />
      ) : (
        order && (
          <>
            <section className={`panel ${styles.summary}`} aria-label="Resumo do pedido">
              <div className={styles.summaryHeader}>
                <div className="min-w-0">
                  <p className="eyebrow">PEDIDO DE COMPRA</p>
                  <h1 className="page-heading mt-2">Pedido #{orderRef(order.id)}</h1>
                  <p className="mt-2 break-words text-sm text-muted-foreground">
                    {order.project.name} · Criado por {order.creatorName}
                  </p>
                </div>
                <div className={styles.summaryActions}>
                  <OrderStatus status={order.status} />
                  <RefreshButton refreshing={loading} disabled={pending} onClick={refresh} />
                </div>
              </div>
              {!order.supplier.isActive && (
                <AlertCard variant="info" role="status">
                  Fornecedor inativo. Este pedido mantém seu fluxo de aprovação; o fornecedor está indisponível apenas
                  para novos pedidos.
                </AlertCard>
              )}
              <dl className={styles.metadata} aria-label="Dados do pedido">
                <div>
                  <dt>FORNECEDOR</dt>
                  <dd>{order.supplier.name}</dd>
                </div>
                <div>
                  <dt>DATA DO PEDIDO</dt>
                  <dd>{date(order.orderDate)}</dd>
                </div>
                <div>
                  <dt>ALÇADA APLICADA</dt>
                  <dd>Versão {order.coaVersion}</dd>
                </div>
                <div>
                  <dt>VALOR TOTAL</dt>
                  <dd className={styles.total}>{brl(order.total)}</dd>
                </div>
              </dl>
            </section>
            <div className={styles.layout}>
              <div className={styles.details}>
                <section className={`panel ${styles.items}`} aria-labelledby="items-title">
                  <h2 id="items-title" className="border-b p-5 font-semibold">
                    Itens do pedido{" "}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">({order.items.length})</span>
                  </h2>
                  <div className={styles.itemTable} data-single={order.items.length === 1}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Descrição</th>
                          <th className="numeric">Quantidade</th>
                          <th>Unidade</th>
                          <th className="numeric">Preço unitário</th>
                          <th className="numeric">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => (
                          <tr key={item.itemIndex}>
                            <td className={styles.description}>{item.description}</td>
                            <td className="numeric">{item.quantity.replace(".", ",")}</td>
                            <td>{item.unit}</td>
                            <td className="numeric">{brl(item.unitPrice)}</td>
                            <td className="numeric font-medium">{brl(item.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className={styles.itemCards} data-single={order.items.length === 1}>
                    {order.items.map((item) => (
                      <article className="p-5 text-sm" key={item.itemIndex}>
                        <h3 className="break-words font-medium">{item.description}</h3>
                        <p className="mt-2 break-words text-xs text-muted-foreground tabular-nums">
                          {item.quantity.replace(".", ",")} {item.unit} × {brl(item.unitPrice)}
                        </p>
                        <p className="mt-2 flex flex-wrap justify-between gap-2 tabular-nums">
                          <span className="text-xs text-muted-foreground">Total do item</span>
                          <strong>{brl(item.lineTotal)}</strong>
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
                {order.notes && (
                  <section className={`panel ${styles.notes}`} aria-labelledby="notes-title">
                    <h2 id="notes-title" className="font-semibold">
                      Observações internas
                    </h2>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {displayOrderNotes(order.notes)}
                    </p>
                  </section>
                )}
              </div>
              <aside className={styles.approval} aria-label="Aprovação do pedido">
                <div className={styles.decision}>
                  <DecisionActions
                    order={order}
                    pending={pending}
                    refreshing={loading}
                    stale={stale}
                    decide={decide}
                    error={decisionError}
                    notice={notice}
                    reasonApiError={fieldErrors.reason}
                    reason={reason}
                    onReasonChange={setReason}
                  />
                </div>
                <div className={styles.history}>
                  <ApprovalTimeline order={order} />
                </div>
              </aside>
            </div>
          </>
        )
      )}
    </div>
  );
}
