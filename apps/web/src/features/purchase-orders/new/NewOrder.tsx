import { localToday } from "@/lib/calendarDate";
import { orderPath } from "@/lib/paths";
import { focusFirstInvalid } from "@/lib/formValidation";
import { useToast } from "@/components/ToastProvider";
import { ApprovalEstimate } from "./ApprovalEstimate";
import { useCoaPreview } from "@/features/purchase-orders/new/useCoaPreview";
import { listReturn } from "./newOrderReturn";
import { OrderGeneralSection, type GeneralField } from "./OrderGeneralSection";
import { OrderItemsSection } from "./OrderItemsSection";
import { OrderSubmitBar } from "./OrderSubmitBar";
import { useOrderFieldErrors } from "./useOrderFieldErrors";
import styles from "./NewOrderPage.module.css";
import {
  acknowledgeSubmission,
  beginSubmission,
  getSubmission,
  settleSubmission,
  subscribeSubmission,
} from "../newOrderSubmission";
import { FormSection } from "@/components/ui/FormSection";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { createPurchaseOrderSchema, MAX_PURCHASE_ORDER_ITEMS, type PurchaseOrderItemInput } from "@dokimos/shared";
import { useAuth } from "@/auth/AuthContext";
import { ApiError, errorMessage, isUncertainOutcome, fieldMessages } from "@/lib/api";
import { createPurchaseOrder, getOrders } from "@/features/purchase-orders/api";
import { orderPreview } from "@/features/purchase-orders/new/orderPreview";
import { brl, plural } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/Feedback";
import { Loading } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { blankItem, type NewOrderItem } from "./newOrderItem";
import { ItemRemovalDialog } from "./ItemRemovalDialog";
import { OrderReferenceNotices } from "./OrderReferenceNotices";
import { OrderReviewDialog } from "./OrderReviewDialog";
import { SubmissionRecovery } from "./SubmissionRecovery";
import { useOrderReferences } from "./useOrderReferences";

export function NewOrder() {
  const { success: successToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate(),
    location = useLocation();
  const { returnTo, projectId: listProjectId } = listReturn(location);
  const [projectId, setProject] = useState("");
  const [supplierId, setSupplier] = useState("");
  const [initialDate] = useState(localToday);
  const [orderDate, setDate] = useState(initialDate);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<NewOrderItem[]>(() => [blankItem()]);
  const userId = user!.id;
  const { references, error: referenceError, reload } = useOrderReferences(userId);
  const [failure, setFailure] = useState("");
  const submission = useSyncExternalStore(subscribeSubmission, () => getSubmission(userId));
  const pending = submission?.pending ?? false;
  const uncertain = !!submission && !pending;
  const [confirmSave, setConfirmSave] = useState(false);
  const [checkingOutcome, setCheckingOutcome] = useState(false);
  const recovery = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const createButton = useRef<HTMLButtonElement>(null);
  const [removalKey, setRemovalKey] = useState<string | null>(null);
  const removalTrigger = useRef<HTMLButtonElement | null>(null),
    removalFocus = useRef<HTMLElement | null>(null);
  const requestedItemFocus = useRef<string | null>(null);
  const overflowFeedback = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    if (!requestedItemFocus.current) return;
    const input = document.getElementById(`${requestedItemFocus.current}-description`);
    requestedItemFocus.current = null;
    input?.focus({ preventScroll: true });
    input?.scrollIntoView({ block: "nearest" });
  }, [items]);
  const coaPreview = useCoaPreview(projectId, true);
  const inFlight = useRef(false);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  // Start on the project the order list was filtered to, or on the only project that can take
  // orders. It is a default, not a draft: untouched, it neither blocks leaving nor counts as input.
  const defaultProject = useRef("");
  const defaultApplied = useRef(false);
  useEffect(() => {
    if (!references || defaultApplied.current) return;
    defaultApplied.current = true;
    const creatable = references.projects.filter((project) => project.coaVersion > 0);
    const chosen =
      creatable.find((project) => project.id === listProjectId) ?? (creatable.length === 1 ? creatable[0] : undefined);
    if (chosen) {
      defaultProject.current = chosen.id;
      setProject((current) => current || chosen.id);
    }
  }, [references, listProjectId]);

  const hasDraft = Boolean(
    (projectId && projectId !== defaultProject.current) ||
    supplierId ||
    notes ||
    orderDate !== initialDate ||
    items.length > 1 ||
    items.some(({ key: _key, ...values }) => Object.values(values).some(Boolean)),
  );
  useEffect(() => {
    if (references && !references.projects.length && !hasDraft && !pending && !uncertain)
      navigate("/purchase-orders", { replace: true });
  }, [references, hasDraft, pending, uncertain, navigate]);

  const input = {
    projectId,
    supplierId,
    orderDate,
    notes,
    items: items.map(({ key: _key, ...item }) => ({ ...item, quantity: item.quantity.trim().replace(",", ".") })),
  };
  const parsed = createPurchaseOrderSchema.safeParse(input);
  const preview = orderPreview(input.items);
  const errors: Record<string, string> = parsed.success
    ? {}
    : Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), issue.message]));
  if (!projectId) errors.projectId = "Selecione uma obra.";
  if (!supplierId) errors.supplierId = "Selecione um fornecedor.";
  const fieldErrors = useOrderFieldErrors(errors);
  const { serverErrors, setServerErrors, setTouched, edit } = fieldErrors;
  const eligible = Boolean(
    references?.projects.some((project) => project.id === projectId && project.coaVersion > 0) &&
    references.suppliers.some((supplier) => supplier.id === supplierId),
  );
  const valid = parsed.success && !preview.overflow && eligible && !Object.keys(serverErrors).length;
  const invalidFields = Object.keys({ ...errors, ...serverErrors });
  const removalIndex = items.findIndex((item) => item.key === removalKey);
  const removalItem = items[removalIndex];
  function changeField(field: GeneralField, value: string) {
    const setters = { projectId: setProject, supplierId: setSupplier, orderDate: setDate, notes: setNotes };
    setters[field](value);
    edit(field);
  }
  function updateItem(index: number, field: keyof PurchaseOrderItemInput, value: string) {
    setItems((previous) => previous.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    edit(`items.${index}.${field}`);
  }
  function addItem() {
    if (pending || items.length >= MAX_PURCHASE_ORDER_ITEMS) return;
    const next = blankItem();
    requestedItemFocus.current = next.key;
    setItems((previous) => [...previous, next]);
    edit("items");
  }
  function removeItem(key: string) {
    const index = items.findIndex((item) => item.key === key);
    if (pending || items.length === 1 || index < 0) return;
    const next = items[index + 1] ?? items[index - 1];
    removalFocus.current = document.getElementById(`${next.key}-description`);
    requestedItemFocus.current = next.key;
    setItems((previous) => previous.filter((item) => item.key !== key));
    fieldErrors.removeItemAt(index);
    setRemovalKey(null);
  }
  // An item with data asks first; an empty one goes at once.
  function requestRemoval(item: NewOrderItem, trigger: HTMLButtonElement) {
    const { key: _key, ...values } = item;
    if (Object.values(values).some((value) => value.trim())) {
      removalFocus.current = null;
      removalTrigger.current = trigger;
      setRemovalKey(item.key);
    } else removeItem(item.key);
  }
  function guideErrors() {
    setTouched((previous) => ({ ...previous, ...Object.fromEntries(invalidFields.map((field) => [field, true])) }));
    requestAnimationFrame(() => {
      const control = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]:not(:disabled)');
      const message = invalidFields.length ? document.getElementById(`error-${invalidFields[0]}`) : null;
      (control ?? message ?? overflowFeedback.current)?.focus();
    });
  }
  async function submit(event?: FormEvent, confirmed = false) {
    event?.preventDefault();
    if (!parsed.success || Object.keys(serverErrors).length) {
      setTouched(Object.fromEntries(Object.keys({ ...errors, ...serverErrors }).map((key) => [key, true])));
      focusFirstInvalid(form.current);
      return;
    }
    if (!valid || inFlight.current || getSubmission(userId)) return;
    if (!confirmed) {
      setConfirmSave(true);
      return;
    }
    try {
      if (!beginSubmission(userId, projectId)) return;
    } catch {
      setConfirmSave(false);
      setFailure(
        "Não foi possível registrar a segurança do envio nesta aba. Nenhum pedido foi enviado. Verifique o armazenamento da sessão.",
      );
      return;
    }
    inFlight.current = true;
    setFailure("");
    setServerErrors({});
    try {
      const created = await createPurchaseOrder(parsed.data, userId);
      settleSubmission(userId, false);
      if (!live.current) {
        successToast({
          id: `purchase:created:${created.id}`,
          title: "Pedido cadastrado",
          description: `${created.project.name} · O pedido foi registrado e seu fluxo de aprovação foi iniciado.`,
          action: {
            label: "Ver pedido",
            onClick: () => navigate(orderPath(created.id)),
          },
        });
        return;
      }
      // The backend response supplies the persisted totals, snapshot and destination.
      navigate(orderPath(created.id), { replace: true, state: { createdOrder: created } });
    } catch (error) {
      settleSubmission(userId, isUncertainOutcome(error));
      if (!live.current) return;
      setFailure(errorMessage(error));
      if (error instanceof ApiError && error.status === 400) setServerErrors(fieldMessages(error));
      if (error instanceof ApiError && [403, 404, 409].includes(error.status)) reload();
    } finally {
      inFlight.current = false;
      if (live.current) {
        setConfirmSave(false);
        requestAnimationFrame(() => {
          recovery.current?.focus();
          focusFirstInvalid(form.current);
        });
      }
    }
  }
  async function checkOutcome() {
    if (checkingOutcome || !submission || submission.pending) return;
    setCheckingOutcome(true);
    try {
      await getOrders(new URLSearchParams({ projectId: submission.projectId, page: "1", pageSize: "20" }).toString());
      if (live.current) {
        acknowledgeSubmission(userId, submission);
        setFailure("");
      }
    } catch (error) {
      if (live.current) setFailure(`Não foi possível atualizar a consulta. ${errorMessage(error)}`);
    } finally {
      if (live.current) setCheckingOutcome(false);
    }
  }
  return (
    <div className={`page-width space-y-4 ${styles.page}`}>
      <PageHeader
        title="Novo pedido"
        description="Inclua os materiais e confira valores e aprovadores."
        actions={
          <Button
            type="button"
            variant="ghost"
            aria-label="Voltar aos pedidos"
            disabled={pending}
            onClick={() => navigate(returnTo)}
          >
            <ArrowLeft aria-hidden="true" />
            Voltar
          </Button>
        }
        note="Rascunho não salvo. Ao sair desta página, os dados serão perdidos."
      />
      {referenceError ? (
        <ErrorState error={referenceError} retry={reload} />
      ) : !references ? (
        <Loading message="Carregando obras e fornecedores…" />
      ) : null}
      <OrderReferenceNotices references={references} projectId={projectId} supplierId={supplierId} />
      <form
        ref={form}
        aria-label="Novo pedido"
        noValidate
        onSubmit={(event) => void submit(event)}
        className={styles.form}
      >
        <fieldset disabled={pending} className={styles.layout}>
          <OrderGeneralSection
            references={references}
            values={{ projectId, supplierId, orderDate, notes }}
            errors={fieldErrors}
            onField={changeField}
          />
          <FormSection title="Total e aprovação" className={styles.summary}>
            <div className={styles.summaryContent} role="region" aria-label="Resumo do envio">
              <div className={styles.totalRow}>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {items.length} {plural(items.length, "item", "itens")} · arredondamento por item
                  </p>
                </div>
                <p className={`financial-total ${styles.total}`} aria-live="polite">
                  {preview.total !== null ? brl(preview.total) : "—"}
                </p>
              </div>
              {preview.overflow && (
                <p ref={overflowFeedback} tabIndex={-1} role="alert" className="field-error">
                  O valor excede o limite permitido de R$ 9.999.999.999.999.999,99.
                </p>
              )}
              <div className={styles.approval}>
                <ApprovalEstimate projectId={projectId} total={preview.total} preview={coaPreview} />
              </div>
            </div>
          </FormSection>
          <OrderItemsSection
            items={items}
            lines={preview.lines}
            errors={fieldErrors}
            onAdd={addItem}
            onChange={updateItem}
            onRemove={requestRemoval}
          />
        </fieldset>
        <SubmissionRecovery
          ref={recovery}
          failure={failure}
          pending={pending}
          uncertain={uncertain}
          projectId={submission?.projectId}
          checking={checkingOutcome}
          onCheckOutcome={() => void checkOutcome()}
        />
        <OrderSubmitBar
          itemCount={items.length}
          total={preview.total}
          invalidCount={invalidFields.length}
          overflow={preview.overflow}
          eligible={eligible}
          pending={pending}
          blocked={uncertain || !valid}
          submitRef={createButton}
          onVerify={guideErrors}
        />
      </form>
      <OrderReviewDialog
        open={confirmSave}
        onOpenChange={setConfirmSave}
        pending={pending}
        canSend={valid && !uncertain}
        projectId={projectId}
        projectName={references?.projects.find((project) => project.id === projectId)?.name}
        supplierName={references?.suppliers.find((supplier) => supplier.id === supplierId)?.name}
        items={items}
        preview={preview}
        coaPreview={coaPreview}
        returnFocus={createButton}
        onSend={() => void submit(undefined, true)}
      />
      <ItemRemovalDialog
        open={!!removalItem && !pending}
        item={removalItem}
        index={removalIndex}
        returnFocus={() => removalFocus.current ?? removalTrigger.current}
        onKeep={() => setRemovalKey(null)}
        onRemove={(item) => removeItem(item.key)}
      />
    </div>
  );
}
