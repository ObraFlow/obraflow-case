"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError, api, errorText, useData, useEntities } from "@/lib/client-api";
import { decimal, fixed, lineCents, money, type OrderDetail, type Rules } from "@/lib/ui-types";
import { useSession, useUnsaved } from "./app-shell";
import { ErrorState, FieldError, Icon } from "./ui";

interface Item {
  key: number;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}
interface Payload {
  projectId: string;
  supplierId: string;
  orderDate: string;
  notes: string | null;
  items: { description: string; quantity: string; unit: string; unitPrice: string }[];
}
interface Attempt {
  key: string;
  actor: string;
  payload: Payload;
  orderId?: string;
}
const STORE = "obraflow-pending-order";
function newItem(key: number): Item {
  return { key, description: "", quantity: "1", unit: "un", unitPrice: "" };
}
function today() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function NewOrder() {
  const { actor, setActorGuard } = useSession();
  const router = useRouter();
  const projects = useEntities("/projects", actor),
    suppliers = useEntities("/suppliers", actor);
  const [projectId, setProject] = useState("");
  const [supplierId, setSupplier] = useState("");
  const [orderDate, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([newItem(1)]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [sent, setSent] = useState(false);
  const counter = useRef(1);
  const form = useRef<HTMLFormElement>(null);
  const rules = useData<{ data: Rules }>(
    projectId ? `/projects/${projectId}/approval-rules` : null,
    actor,
  );
  const touched = !!(
    projectId ||
    supplierId ||
    notes ||
    items.length !== 1 ||
    items[0]?.description ||
    items[0]?.unitPrice
  );
  useUnsaved((touched || !!attempt) && !sent);
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const stored = sessionStorage.getItem(STORE);
        if (stored) {
          const value = JSON.parse(stored) as Attempt;
          if (value.key && value.actor && value.payload?.items) {
            setAttempt(value);
            setProject(value.payload.projectId);
            setSupplier(value.payload.supplierId);
            setDate(value.payload.orderDate);
            setNotes(value.payload.notes ?? "");
            setItems(
              value.payload.items.map((item, index) => ({
                ...item,
                key: index + 1,
                quantity: item.quantity.replace(".", ","),
                unitPrice: item.unitPrice.replace(".", ","),
              })),
            );
            counter.current = value.payload.items.length;
            setMessage(
              "Uma tentativa anterior ainda precisa de confirmação. Reconcilie o envio antes de cadastrar outro pedido.",
            );
          }
        }
      } catch {
        sessionStorage.removeItem(STORE);
      }
    });
  }, []);
  useEffect(() => {
    setActorGuard(() => {
      if (attempt || busy) {
        window.alert(
          "Confirme o resultado do envio com o usuário original antes de trocar o usuário.",
        );
        return false;
      }
      return true;
    });
    return () => setActorGuard(null);
  }, [attempt, busy, setActorGuard]);
  function clear(path: string) {
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => key !== path && key !== "items"),
      ),
    );
    setMessage("");
  }
  function updateItem(index: number, field: keyof Omit<Item, "key">, value: string) {
    clear(`items.${index}.${field}`);
    setItems((current) =>
      current.map((item, position) => (position === index ? { ...item, [field]: value } : item)),
    );
  }
  function validate(): Record<string, string> {
    const result: Record<string, string> = {};
    if (!projectId) result.projectId = "Selecione uma obra.";
    if (!supplierId) result.supplierId = "Selecione um fornecedor.";
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(orderDate) ||
      Number.isNaN(Date.parse(`${orderDate}T12:00:00Z`))
    )
      result.orderDate = "Informe uma data válida.";
    if (notes.trim().length > 2000) result.notes = "Use até 2.000 caracteres.";
    if (!items.length || items.length > 100) result.items = "Inclua de 1 a 100 itens.";
    let sum = 0n;
    items.forEach((item, index) => {
      if (!item.description.trim() || item.description.trim().length > 200)
        result[`items.${index}.description`] = "Informe a descrição, com até 200 caracteres.";
      if (!item.unit.trim() || item.unit.trim().length > 16)
        result[`items.${index}.unit`] = "Informe uma unidade, com até 16 caracteres.";
      const quantity = decimal(item.quantity, 3),
        price = decimal(item.unitPrice, 2);
      if (quantity === null || quantity <= 0n || quantity > 1000000000n)
        result[`items.${index}.quantity`] = "Quantidade de 0,001 a 1.000.000, com até 3 casas.";
      if (price === null || price > 100000000n)
        result[`items.${index}.unitPrice`] = "Preço de 0 a R$ 1.000.000, com até 2 casas.";
      const line = lineCents(item.quantity, item.unitPrice);
      if (line !== null) {
        sum += line;
        if (line > 10000000000n)
          result[`items.${index}.unitPrice`] = "O total do item ultrapassa R$ 100.000.000,00.";
      }
    });
    if (sum > 10000000000n) result.items = "O pedido ultrapassa R$ 100.000.000,00.";
    return result;
  }
  const validation = validate();
  const validItems =
    items.length > 0 && !Object.keys(validation).some((key) => key.startsWith("items"));
  const total = items.reduce(
    (sum, item) => sum + (lineCents(item.quantity, item.unitPrice) ?? 0n),
    0n,
  );
  const band = validItems
    ? rules.data?.data.bands.find(
        (value) => value.upperLimit === null || (decimal(value.upperLimit, 2) ?? -1n) >= total,
      )
    : undefined;
  const disabledReason = attempt
    ? "Confirme a tentativa anterior antes de continuar."
    : Object.keys(validation).length
      ? "Preencha os dados obrigatórios e revise todos os itens."
      : rules.loading
        ? "Consultando a alçada desta obra…"
        : rules.error
          ? "Não foi possível consultar a alçada. Tente novamente."
          : !band
            ? "Não há alçada configurada para este valor nesta obra."
            : "";
  async function send(existing?: Attempt) {
    let submission = existing;
    if (!submission) {
      const nextErrors = validate();
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length || !band) {
        form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
        return;
      }
      submission = {
        key: crypto.randomUUID(),
        actor,
        payload: {
          projectId,
          supplierId,
          orderDate,
          notes: notes.trim() || null,
          items: items.map((item) => ({
            description: item.description.trim(),
            unit: item.unit.trim(),
            quantity: fixed(decimal(item.quantity, 3)!, 3),
            unitPrice: fixed(decimal(item.unitPrice, 2)!, 2),
          })),
        },
      };
      setAttempt(submission);
      sessionStorage.setItem(STORE, JSON.stringify(submission));
    }
    setBusy(true);
    setMessage("");
    try {
      let result: { data: OrderDetail };
      if (submission.orderId) result = await api(`/orders/${submission.orderId}`, submission.actor);
      else {
        result = await api<{ data: OrderDetail }>("/orders", submission.actor, {
          method: "POST",
          headers: { "Idempotency-Key": submission.key },
          body: JSON.stringify(submission.payload),
        });
        submission = { ...submission, orderId: result.data.id };
        setAttempt(submission);
        sessionStorage.setItem(STORE, JSON.stringify(submission));
        // A replay returns the original body. Always read the persisted current state.
        await api(`/orders/${result.data.id}`, submission.actor);
      }
      sessionStorage.removeItem(STORE);
      setAttempt(null);
      setSent(true);
      router.push(`/orders/${result.data.id}?created=1`);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status > 0 &&
        error.status < 500 &&
        !submission.orderId
      ) {
        setAttempt(null);
        sessionStorage.removeItem(STORE);
        setErrors(Object.fromEntries(error.fields.map((field) => [field.path, field.message])));
        if (error.code === "NO_APPLICABLE_RULE") rules.reload();
      }
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  const frozen = busy || !!attempt;
  return (
    <>
      <Link href="/" className="back-link">
        <Icon name="back" size={16} /> Voltar para aprovações
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SOLICITAÇÃO DE COMPRA</div>
          <h1>Novo pedido</h1>
          <p>Organize os itens. A alçada certa cuida do próximo passo.</p>
        </div>
        <span className="subtle-label">
          <Icon name="shield" size={16} /> Aprovação por alçada
        </span>
      </div>
      <form
        ref={form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
        className="form-layout"
      >
        <div className="form-main">
          <section className="panel form-panel">
            <div className="section-heading">
              <span className="section-number">01</span>
              <div>
                <h2>Dados da compra</h2>
                <p>O contexto para uma boa decisão.</p>
              </div>
            </div>
            {projects.error && <ErrorState message={projects.error} retry={projects.reload} />}{" "}
            {suppliers.error && <ErrorState message={suppliers.error} retry={suppliers.reload} />}
            {((!projects.loading && projects.data?.length === 0) ||
              (!suppliers.loading && suppliers.data?.length === 0)) && (
              <div className="notice">
                Não há obras ou fornecedores disponíveis. Os dados precisam ser cadastrados antes de
                solicitar uma compra.
              </div>
            )}
            <fieldset disabled={frozen}>
              <div className="fields-grid">
                <label>
                  Obra <span className="required">*</span>
                  <select
                    value={projectId}
                    aria-invalid={!!errors.projectId}
                    aria-describedby="project-error"
                    onBlur={() => {
                      if (!projectId)
                        setErrors((current) => ({ ...current, projectId: "Selecione uma obra." }));
                    }}
                    onChange={(event) => {
                      setProject(event.target.value);
                      clear("projectId");
                    }}
                    disabled={projects.loading}
                  >
                    <option value="">
                      {projects.loading ? "Carregando obras…" : "Selecione uma obra"}
                    </option>
                    {projects.data?.map((value) => (
                      <option key={value.id} value={value.id}>
                        {value.name}
                      </option>
                    ))}
                  </select>
                  <FieldError id="project-error" message={errors.projectId} />
                </label>
                <label>
                  Fornecedor <span className="required">*</span>
                  <select
                    value={supplierId}
                    aria-invalid={!!errors.supplierId}
                    aria-describedby="supplier-error"
                    onBlur={() => {
                      if (!supplierId)
                        setErrors((current) => ({
                          ...current,
                          supplierId: "Selecione um fornecedor.",
                        }));
                    }}
                    onChange={(event) => {
                      setSupplier(event.target.value);
                      clear("supplierId");
                    }}
                    disabled={suppliers.loading}
                  >
                    <option value="">
                      {suppliers.loading ? "Carregando fornecedores…" : "Selecione um fornecedor"}
                    </option>
                    {suppliers.data?.map((value) => (
                      <option key={value.id} value={value.id}>
                        {value.name}
                      </option>
                    ))}
                  </select>
                  <FieldError id="supplier-error" message={errors.supplierId} />
                </label>
                <label>
                  Data do pedido <span className="required">*</span>
                  <input
                    type="date"
                    value={orderDate}
                    aria-invalid={!!errors.orderDate}
                    aria-describedby="date-error"
                    onBlur={() => {
                      const issue = validate().orderDate;
                      if (issue) setErrors((current) => ({ ...current, orderDate: issue }));
                    }}
                    onChange={(event) => {
                      setDate(event.target.value);
                      clear("orderDate");
                    }}
                  />
                  <FieldError id="date-error" message={errors.orderDate} />
                </label>
              </div>
              <label className="full-field">
                Observações internas <span className="optional">Opcional</span>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={notes}
                  placeholder="Contextualize a compra para os aprovadores…"
                  aria-invalid={!!errors.notes}
                  aria-describedby="notes-error"
                  onBlur={() => {
                    const issue = validate().notes;
                    if (issue) setErrors((current) => ({ ...current, notes: issue }));
                  }}
                  onChange={(event) => {
                    setNotes(event.target.value);
                    clear("notes");
                  }}
                />
                <FieldError id="notes-error" message={errors.notes} />
                <span className="field-hint">Uma justificativa clara facilita a aprovação.</span>
              </label>
            </fieldset>
          </section>
          <section className="panel form-panel">
            <div className="section-heading">
              <span className="section-number">02</span>
              <div>
                <h2>
                  Itens do pedido <span className="count-pill">{items.length}</span>
                </h2>
                <p>Materiais e serviços que compõem esta compra.</p>
              </div>
            </div>
            <fieldset disabled={frozen}>
              <div className="items-list">
                {items.map((item, index) => (
                  <div key={item.key} className="item-card">
                    <div className="item-heading">
                      <strong>Item {String(index + 1).padStart(2, "0")}</strong>
                      <button
                        type="button"
                        className="icon-button danger-text"
                        aria-label={`Remover item ${index + 1}`}
                        onClick={() => {
                          setItems((current) =>
                            current.filter((_, position) => position !== index),
                          );
                          setErrors({});
                          requestAnimationFrame(() =>
                            document
                              .getElementById(
                                `item-${items[index + 1]?.key ?? items[index - 1]?.key}`,
                              )
                              ?.focus(),
                          );
                        }}
                      >
                        <Icon name="trash" size={17} />
                      </button>
                    </div>
                    <div className="item-fields">
                      {(
                        [
                          {
                            field: "description",
                            label: "Descrição",
                            placeholder: "Ex.: Cimento Portland 50 kg",
                            className: "item-description",
                            max: 200,
                          },
                          {
                            field: "quantity",
                            label: "Quantidade",
                            placeholder: "1,000",
                            className: "",
                            max: 20,
                          },
                          {
                            field: "unit",
                            label: "Unidade",
                            placeholder: "un, kg, m²…",
                            className: "",
                            max: 16,
                          },
                          {
                            field: "unitPrice",
                            label: "Preço unitário (R$)",
                            placeholder: "0,00",
                            className: "",
                            max: 20,
                          },
                        ] as const
                      ).map((config) => {
                        const path = `items.${index}.${config.field}`;
                        return (
                          <label key={config.field} className={config.className}>
                            {config.label} <span className="required">*</span>
                            <input
                              id={config.field === "description" ? `item-${item.key}` : undefined}
                              inputMode={
                                config.field === "quantity" || config.field === "unitPrice"
                                  ? "decimal"
                                  : undefined
                              }
                              maxLength={config.max}
                              value={item[config.field]}
                              placeholder={config.placeholder}
                              aria-invalid={!!errors[path]}
                              aria-describedby={`error-${item.key}-${config.field}`}
                              onChange={(event) =>
                                updateItem(index, config.field, event.target.value)
                              }
                              onBlur={() => {
                                const issue = validate()[path];
                                if (issue) setErrors((current) => ({ ...current, [path]: issue }));
                              }}
                            />
                            <FieldError
                              id={`error-${item.key}-${config.field}`}
                              message={errors[path]}
                            />
                          </label>
                        );
                      })}
                    </div>
                    <div className="item-total">
                      <span>Total do item</span>
                      <strong>
                        {lineCents(item.quantity, item.unitPrice) === null
                          ? "—"
                          : money(lineCents(item.quantity, item.unitPrice)!)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
              <FieldError message={errors.items} />
              <button
                type="button"
                disabled={items.length >= 100}
                className="add-item-button"
                onClick={() => {
                  const key = ++counter.current;
                  setItems((current) => [...current, newItem(key)]);
                  clear("items");
                  requestAnimationFrame(() => document.getElementById(`item-${key}`)?.focus());
                }}
              >
                <Icon name="plus" size={17} /> Adicionar item
              </button>
            </fieldset>
          </section>
        </div>
        <aside className="summary-column">
          <div className="panel summary-panel">
            <span className="eyebrow">RESUMO DA SOLICITAÇÃO</span>
            <div className="summary-count">
              {items.length} {items.length === 1 ? "item incluído" : "itens incluídos"}
            </div>
            <div className="summary-total">
              <span>Valor total do pedido</span>
              <strong aria-live="polite">{money(total)}</strong>
              <small>Totais arredondados por item</small>
            </div>
            <div className="approval-preview">
              <h3>
                <Icon name="shield" size={17} /> Alçada prevista
              </h3>
              {!projectId ? (
                <p>Selecione a obra para consultar a cadeia de aprovação.</p>
              ) : rules.loading ? (
                <p role="status">Consultando alçada…</p>
              ) : rules.error ? (
                <ErrorState message={rules.error} retry={rules.reload} />
              ) : !validItems ? (
                <p>Complete os itens para visualizar os aprovadores.</p>
              ) : band ? (
                <ol className="preview-steps">
                  {band.approvers.map((person, index) => (
                    <li key={person.id}>
                      <span>{index + 1}</span>
                      <div>
                        {person.name}
                        <small>
                          {index === 0 ? "Primeira aprovação" : "Após a etapa anterior"}
                        </small>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="notice warning">
                  Não há alçada para este valor.{" "}
                  <Link href="/approval-rules">Configurar regras</Link>
                </div>
              )}
              <p className="field-hint">A cadeia será confirmada ao cadastrar o pedido.</p>
            </div>
            {message && <ErrorState message={message} />}
            {attempt && (
              <div className="notice warning">
                <strong>
                  {attempt.orderId
                    ? "Pedido registrado; atualização pendente"
                    : "Envio aguardando confirmação"}
                </strong>
                <p>
                  A tentativa original foi preservada. O reenvio com a mesma chave não cria um
                  segundo pedido.
                </p>
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void send(attempt)}
                >
                  {busy ? "Confirmando…" : "Confirmar envio anterior"}
                </button>
              </div>
            )}
            <button
              type="submit"
              className="button primary full-width"
              disabled={busy || !!disabledReason}
            >
              {busy ? "Cadastrando…" : "Cadastrar pedido"}
              <Icon name="arrow" size={17} />
            </button>
            {disabledReason && <p className="disabled-reason">{disabledReason}</p>}
            <Link href="/" className="cancel-link">
              Cancelar
            </Link>
          </div>
          <div className="quiet-note">
            <Icon name="info" size={16} /> Depois de enviado, o pedido mantém seus itens e sua
            cadeia de aprovação.
          </div>
        </aside>
      </form>
    </>
  );
}
