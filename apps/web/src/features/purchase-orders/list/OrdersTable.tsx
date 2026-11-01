import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowUpRight } from "lucide-react";
import type { OrderList } from "@dokimos/shared";
import { orderPath } from "@/lib/paths";
import { brl, date, orderRef, plural } from "@/lib/format";
import { ApprovalChain } from "../ApprovalChain";
import { OrderStatus } from "../OrderStatus";
import styles from "./Orders.module.css";

/** The orders of one page: a table from medium screens up, cards below. Both open the order. */
export function OrdersTable({ orders }: { orders: OrderList["data"] }) {
  const navigate = useNavigate();
  // The whole row opens the order, with the browser's usual link behaviour for modified and middle clicks.
  function openOrder(event: MouseEvent<HTMLTableRowElement>, id: string) {
    if (
      event.defaultPrevented ||
      event.altKey ||
      (event.button !== 0 && event.button !== 1) ||
      (event.target as HTMLElement).closest("a, button, input") ||
      window.getSelection()?.toString()
    )
      return;
    const href = event.currentTarget.querySelector<HTMLAnchorElement>("a")?.href;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) {
      if (href) {
        event.preventDefault();
        const opened = window.open(href, "_blank");
        if (opened) opened.opener = null;
      }
    } else navigate(orderPath(id));
  }
  return (
    <>
      <div
        className={`panel hidden md:block ${styles.tableViewport}`}
        role="region"
        aria-label="Tabela de pedidos"
        tabIndex={0}
        data-list-region
      >
        <table className="data-table">
          <caption className="sr-only">Pedidos de compra disponíveis para sua conta</caption>
          <thead>
            <tr>
              <th>Pedido / Obra</th>
              <th>Fornecedor</th>
              <th>Data / Itens</th>
              <th className="numeric">Valor total</th>
              <th>Situação</th>
              <th>Cadeia de aprovação</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className={styles.orderRow}
                onClick={(event) => openOrder(event, order.id)}
                onAuxClick={(event) => {
                  if (event.button === 1) openOrder(event, order.id);
                }}
              >
                <td>
                  <Link
                    className="text-link inline-flex items-center gap-1"
                    to={orderPath(order.id)}
                    aria-label={`Abrir pedido ${orderRef(order.id)}`}
                  >
                    #{orderRef(order.id)}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">{order.project.name}</p>
                </td>
                <td>{order.supplier.name}</td>
                <td>
                  {date(order.orderDate)}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.itemCount} {plural(order.itemCount, "item", "itens")}
                  </p>
                </td>
                <td className="numeric font-semibold">{brl(order.total)}</td>
                <td>
                  <OrderStatus status={order.status} />
                </td>
                <td className={styles.approvalCell}>
                  <ApprovalChain steps={order.approvalSteps} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {orders.map((order) => (
          <article key={order.id}>
            <Link className={`panel block space-y-2 p-3.5 ${styles.orderCard}`} to={orderPath(order.id)}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-link">Pedido #{orderRef(order.id)}</span>
                <OrderStatus status={order.status} />
              </div>
              <p className="text-sm">
                {order.project.name} · {order.supplier.name}
              </p>
              <div className="flex justify-between text-sm tabular-nums">
                <span>
                  {date(order.orderDate)} · {order.itemCount} {plural(order.itemCount, "item", "itens")}
                </span>
                <strong>{brl(order.total)}</strong>
              </div>
              <ApprovalChain steps={order.approvalSteps} />
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
