import type { ProjectListItem } from "@dokimos/shared";

/**
 * Why "Novo pedido" is unavailable, or undefined when an order can be started. The checks follow the order
 * the API enforces them, so the first missing prerequisite is the one reported.
 */
export function creationReason({
  projectError,
  creatable,
  hasPublishedCoa,
  supplierError,
  hasSupplier,
}: {
  projectError: unknown;
  /** Projects the person can create orders in, or null while the project list is unknown. */
  creatable: ProjectListItem[] | null;
  hasPublishedCoa: boolean;
  supplierError: unknown;
  /** Whether an active supplier exists, or null while unknown. */
  hasSupplier: boolean | null;
}) {
  if (projectError) return "Não foi possível consultar as obras.";
  if (!creatable) return "Consultando participação nas obras…";
  if (!creatable.length) return "Você precisa ser membro de uma obra para criar pedidos.";
  if (!hasPublishedCoa) return "Suas obras ainda não têm uma alçada publicada.";
  if (supplierError) return "Não foi possível verificar os fornecedores.";
  if (hasSupplier === null) return "Consultando fornecedores…";
  if (!hasSupplier) return "Não há fornecedores ativos para novos pedidos.";
  return undefined;
}
