import type { CreatePurchaseOrder, DecisionInput, OrderList, PurchaseOrderDetail } from "@dokimos/shared";
import { InvalidApiResponse, request } from "@/lib/api";
import { InvalidOrderResponse, parseOrderListResponse, parseOrderResponse } from "./purchaseOrderResponse";

// Every order response is checked against what was asked (ids, creator, decision recorded). A mismatch means the
// outcome cannot be trusted, so it is reported as unconfirmed rather than shown as the result.
async function requestOrder(path: string, options: RequestInit = {}): Promise<PurchaseOrderDetail> {
  try {
    return parseOrderResponse(await request<unknown>(path, options));
  } catch (error) {
    // Invalid JSON is also an unconfirmed response, without exposing parser text.
    if (error instanceof SyntaxError || error instanceof InvalidApiResponse) throw new InvalidOrderResponse();
    throw error;
  }
}
export async function createPurchaseOrder(input: CreatePurchaseOrder, creatorId: string) {
  const order = await requestOrder("/purchase-orders", { method: "POST", body: JSON.stringify(input) });
  if (
    order.createdById !== creatorId ||
    order.projectId !== input.projectId ||
    order.supplier.id !== input.supplierId ||
    order.status !== "PENDING"
  )
    throw new InvalidOrderResponse();
  return order;
}
export async function getOrders(query: string, signal?: AbortSignal): Promise<OrderList> {
  try {
    return parseOrderListResponse(await request<unknown>(`/purchase-orders?${query}`, { signal }));
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof InvalidApiResponse) throw new InvalidOrderResponse();
    throw error;
  }
}
export async function getOrder(id: string, signal?: AbortSignal) {
  const order = await requestOrder(`/purchase-orders/${encodeURIComponent(id)}`, { signal });
  if (order.id !== id.toLowerCase()) throw new InvalidOrderResponse();
  return order;
}
export async function decidePurchaseOrder(id: string, decision: DecisionInput, actorId: string) {
  const order = await requestOrder(`/purchase-orders/${encodeURIComponent(id)}/decisions`, {
    method: "POST",
    body: JSON.stringify(decision),
  });
  const recorded = order.steps.find((step) => step.stepIndex === decision.expectedStepIndex)?.decision;
  // An intermediate approval legitimately leaves the order PENDING.
  if (
    order.id !== id.toLowerCase() ||
    recorded?.type !== decision.decision ||
    recorded.actorId !== actorId ||
    (decision.decision === "APPROVED" && order.status === "REJECTED") ||
    (decision.decision === "REJECTED" && (order.status !== "REJECTED" || recorded.reason !== decision.reason))
  )
    throw new InvalidOrderResponse();
  return order;
}
