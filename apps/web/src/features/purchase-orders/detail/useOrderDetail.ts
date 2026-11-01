import { orderRef } from "@/lib/format";
import { useEffect, useRef, useState } from "react";
import type { DecisionInput, PurchaseOrderDetail } from "@dokimos/shared";
import { ApiError, errorMessage, isUncertainOutcome, fieldMessages } from "@/lib/api";
import { decidePurchaseOrder, getOrder } from "@/features/purchase-orders/api";
import { useRefreshFailure, useToast } from "@/components/ToastProvider";
import { useAuth } from "@/auth/AuthContext";

export function useOrderDetail(id: string, createdOrder?: PurchaseOrderDetail) {
  const { user } = useAuth();
  const notifyRefreshFailure = useRefreshFailure();
  const { success: successToast } = useToast();
  const [order, setOrder] = useState<PurchaseOrderDetail | null>(createdOrder ?? null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(!createdOrder);
  // Arriving from creation, the response already is the order: skip the first read instead of repeating it.
  const creationResponse = useRef(createdOrder);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  // Warnings only (the order changed elsewhere); confirmations are toasts.
  const [notice, setNotice] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [stale, setStale] = useState(false);
  const live = useRef(true);
  const submitting = useRef(false);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    if (creationResponse.current) {
      creationResponse.current = undefined;
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getOrder(id, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setOrder(result);
          setStale(false);
          setDecisionError("");
          setNotice("");
          setFieldErrors({});
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(failure);
          if (attempt > 0) notifyRefreshFailure();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, attempt, notifyRefreshFailure]);
  async function decide(input: DecisionInput): Promise<boolean> {
    if (submitting.current || stale || loading) return false;
    submitting.current = true;
    setPending(true);
    setDecisionError("");
    setNotice("");
    setFieldErrors({});
    try {
      const updated = await decidePurchaseOrder(id, input, user!.id);
      if (!live.current) return false;
      setOrder(updated);
      // The page already shows the new state (status, history); the confirmation is a transient toast.
      successToast({
        id: `order:${id}:decided:${input.expectedStepIndex}`,
        title: input.decision === "APPROVED" ? "Aprovação registrada" : "Rejeição registrada",
        description: `Pedido #${orderRef(id)} · ${updated.status === "APPROVED" ? "Fluxo concluído." : updated.status === "REJECTED" ? "Fluxo encerrado." : "Aguardando a próxima etapa."}`,
      });
      return true;
    } catch (failure) {
      if (!live.current) return false;
      // 409: someone else decided first. Block further decisions until the current state has been read.
      if (failure instanceof ApiError && failure.status === 409) {
        setStale(true);
        setNotice(
          "O pedido foi alterado por outro usuário. O estado atual foi recarregado; revise-o antes de decidir.",
        );
        try {
          const updated = await getOrder(id);
          if (live.current) {
            setOrder(updated);
            setStale(false);
          }
        } catch (readFailure) {
          if (live.current) {
            setNotice("O pedido foi alterado por outro usuário. Atualize-o para consultar o estado atual.");
            setDecisionError(errorMessage(readFailure));
          }
        }
      } else {
        setDecisionError(errorMessage(failure));
        if (failure instanceof ApiError && failure.status === 400) setFieldErrors(fieldMessages(failure));
        // Unknown outcome (or a changed permission): never retry the decision, require a deliberate fresh read.
        if (isUncertainOutcome(failure) || (failure instanceof ApiError && failure.status === 403)) setStale(true);
      }
      return false;
    } finally {
      submitting.current = false;
      if (live.current) setPending(false);
    }
  }
  return {
    order,
    error,
    loading,
    pending,
    stale,
    notice,
    decisionError,
    fieldErrors,
    decide,
    refresh: () => {
      if (!submitting.current && !loading) setAttempt((a) => a + 1);
    },
  };
}
