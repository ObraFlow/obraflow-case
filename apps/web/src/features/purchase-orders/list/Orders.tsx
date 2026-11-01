import { AlertCard } from "@/components/ui/AlertCard";
import { useRefreshFailure } from "@/components/ToastProvider";
import { Loading } from "@/components/Loading";
import { RefreshButton } from "@/components/RefreshButton";
import { creationProjects } from "@/features/purchase-orders/creationProjects";
import { useAuth } from "@/auth/AuthContext";
import { getSubmission, subscribeSubmission } from "../newOrderSubmission";
import { Pagination, isPageUnavailable } from "@/components/Pagination";
import { orderViews, viewCounts, type OrderView } from "./orderViews";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import { getOrders } from "@/features/purchase-orders/api";
import { getProjects } from "@/features/projects/api";
import { getSuppliers } from "@/features/suppliers/api";
import { type OrderList, type ProjectListItem } from "@dokimos/shared";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/Feedback";
import { PageHeader } from "@/components/PageHeader";
import { ListShell } from "@/components/ListShell";
import { creationReason } from "./creationReason";
import { OrderFilters } from "./OrderFilters";
import { OrdersEmptyState } from "./OrdersEmptyState";
import { OrdersTable } from "./OrdersTable";
import { normalizeOrdersQuery } from "./ordersQuery";

export function Orders() {
  const [params] = useSearchParams();
  if (params.get("mode") === "create") {
    const context = new URLSearchParams(params);
    context.delete("mode");
    return (
      <Navigate
        to={`/purchase-orders/new${context.size ? `?${context}` : ""}`}
        replace
        state={{ returnTo: `/purchase-orders${context.size ? `?${context}` : ""}` }}
      />
    );
  }
  return <OrdersList />;
}

function OrdersList() {
  const notifyRefreshFailure = useRefreshFailure("orders");
  const { user } = useAuth();
  const submission = useSyncExternalStore(subscribeSubmission, () => (user ? getSubmission(user.id) : null));
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const apiParams = normalizeOrdersQuery(params);
  const query = apiParams.toString();
  const [data, setData] = useState<OrderList | null>(null);
  const hasOrderData = useRef(false);
  const [projects, setProjects] = useState<ProjectListItem[] | null>(null);
  const [projectError, setProjectError] = useState<unknown>(null);
  const [hasSupplier, setHasSupplier] = useState<boolean | null>(null);
  const [supplierError, setSupplierError] = useState<unknown>(null);
  const [supplierAttempt, setSupplierAttempt] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const refresh = () => setAttempt((a) => a + 1);
  // View sizes arrive with every list response; they only apply to the project they were read for.
  const [distribution, setDistribution] = useState<{ projectId: string; counts: ReturnType<typeof viewCounts> } | null>(
    null,
  );
  const counts = distribution?.projectId === (apiParams.get("projectId") ?? "") ? distribution.counts : null;
  const activeView =
    apiParams.get("actionableByMe") === "true"
      ? "mine"
      : (orderViews.find((view) => view.status && view.status === apiParams.get("status"))?.key ?? "all");
  function selectView(view: OrderView) {
    const next = new URLSearchParams(params);
    next.delete("page");
    next.delete("status");
    next.delete("actionableByMe");
    if (view.status) next.set("status", view.status);
    if (view.key === "mine") next.set("actionableByMe", "true");
    setParams(next);
  }
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    getOrders(query, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          hasOrderData.current = true;
          setData(result);
          // Counts belong to the project they were read for, so changing project never shows another's totals.
          setDistribution({
            projectId: new URLSearchParams(query).get("projectId") ?? "",
            counts: viewCounts(result.distribution),
          });
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(failure);
          // A refresh that fails is announced; a first load that fails is shown inline.
          if (attempt > 0 || hasOrderData.current) notifyRefreshFailure();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, attempt, notifyRefreshFailure]);
  useEffect(() => {
    const controller = new AbortController();
    setProjectError(null);
    setProjectsLoading(true);
    getProjects(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setProjects(result.data);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setProjectError(failure);
          if (attempt > 0) notifyRefreshFailure();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setProjectsLoading(false);
      });
    return () => controller.abort();
  }, [attempt, notifyRefreshFailure]);
  useEffect(() => {
    const controller = new AbortController();
    setSuppliersLoading(true);
    setSupplierError(null);
    getSuppliers(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setHasSupplier(result.data.some((supplier) => supplier.isActive));
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setSupplierError(failure);
          if (attempt > 0) notifyRefreshFailure();
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSuppliersLoading(false);
      });
    return () => controller.abort();
  }, [attempt, supplierAttempt, notifyRefreshFailure]);
  function filter(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("page");
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }
  function clearFilters() {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const key of ["status", "projectId", "actionableByMe", "page"]) next.delete(key);
      return next;
    });
  }
  const unavailable = !!data && isPageUnavailable(data.pagination);
  const filtered = params.has("status") || params.has("projectId") || params.get("actionableByMe") === "true";
  // Projects the caller may create orders in: the list carries the caller's own membership.
  const creatable = projects ? creationProjects(projects) : null;
  const hasPublishedCoa = !!creatable?.some((project) => project.coaVersion > 0);
  const reason = creationReason({ projectError, creatable, hasPublishedCoa, supplierError, hasSupplier });
  return (
    <ListShell
      header={
        <PageHeader
          title="Pedidos de compra"
          description="Revise os pedidos e acompanhe o andamento das aprovações."
          actions={
            <>
              <RefreshButton refreshing={loading || projectsLoading || suppliersLoading} onClick={refresh} />
              {submission && (
                <Button variant="outline" onClick={() => navigate("/purchase-orders/new")}>
                  {submission.pending ? "Acompanhar envio" : "Revisar envio"}
                </Button>
              )}
              <Button
                disabled={!!reason}
                title={reason}
                onClick={() =>
                  navigate("/purchase-orders/new", {
                    state: { returnTo: `/purchase-orders${params.size ? `?${params}` : ""}` },
                  })
                }
              >
                <Plus aria-hidden="true" />
                <span className="action-label">Novo pedido</span>
              </Button>
            </>
          }
        />
      }
      notices={
        <>
          {creatable && !creatable.length && !!projects?.length && (
            <AlertCard variant="info" role="status">
              Para criar pedidos, solicite sua inclusão em uma obra.
            </AlertCard>
          )}
          {creatable && !!creatable.length && !hasPublishedCoa && (
            <AlertCard variant="warning" role="status">
              <p>Suas obras ainda não têm uma alçada publicada. Solicite a configuração para criar pedidos.</p>
              {user?.role === "ADMIN" && (
                <Link className="text-link mt-2 inline-block" to="/admin/projects">
                  Configurar alçadas nas obras
                </Link>
              )}
            </AlertCard>
          )}
          {hasSupplier === false && (
            <AlertCard variant="warning" role="status">
              <p>Não há fornecedores ativos para novos pedidos. Solicite um cadastro ao administrador.</p>
              {user?.role === "ADMIN" && (
                <Link className="text-link mt-2 inline-block" to="/admin/suppliers">
                  Gerenciar fornecedores
                </Link>
              )}
            </AlertCard>
          )}
          {!!supplierError && !error && (
            <AlertCard variant="warning" role="status">
              <p>Não foi possível verificar os fornecedores. A lista de pedidos continua disponível.</p>
              <Button variant="outline" className="mt-2" onClick={() => setSupplierAttempt((value) => value + 1)}>
                Consultar fornecedores novamente
              </Button>
            </AlertCard>
          )}
        </>
      }
      filters={
        <OrderFilters
          projects={projects}
          projectId={apiParams.get("projectId") ?? ""}
          counts={counts}
          activeView={activeView}
          loading={loading}
          onProjectChange={(projectId) => filter("projectId", projectId)}
          onViewChange={selectView}
        />
      }
      footer={
        data ? (
          <Pagination
            label="Paginação"
            pagination={data.pagination}
            count={data.data.length}
            singular="pedido"
            plural="pedidos"
            onPageChange={(value) => filter("page", String(value))}
          />
        ) : undefined
      }
    >
      {!!projectError && !projects && !error && (
        <ErrorState title="Não foi possível carregar as obras" error={projectError} retry={refresh} />
      )}
      {!data &&
        (loading ? (
          <Loading message="Carregando pedidos…" />
        ) : (
          !!error && <ErrorState title="Não foi possível carregar os pedidos" error={error} retry={refresh} />
        ))}
      {data && !!data.data.length && <OrdersTable orders={data.data} />}
      {data && !data.data.length && (
        <OrdersEmptyState
          unavailable={unavailable}
          noProjects={projects?.length === 0}
          filtered={filtered}
          hasCreationReason={!!reason}
          onFirstPage={() => filter("page", "1")}
          onClearFilters={clearFilters}
        />
      )}
    </ListShell>
  );
}
