import { EmptyState } from "@/components/Feedback";

/** What an empty order list says, by cause: a page past the end, no project, filters, or nothing created yet. */
export function OrdersEmptyState({
  unavailable,
  noProjects,
  filtered,
  hasCreationReason,
  onFirstPage,
  onClearFilters,
}: {
  unavailable: boolean;
  noProjects: boolean;
  filtered: boolean;
  /** "Novo pedido" is unavailable, so the empty list points at the prerequisites. */
  hasCreationReason: boolean;
  onFirstPage: () => void;
  onClearFilters: () => void;
}) {
  if (unavailable)
    return (
      <EmptyState
        title="Página indisponível"
        description="Esta página não está disponível na consulta atual. Volte à primeira página mantendo seus filtros."
        action={{ label: "Voltar à primeira página", onClick: onFirstPage }}
      />
    );
  if (noProjects)
    return (
      <EmptyState
        title="Você ainda não tem obras disponíveis"
        description="Solicite ao administrador a inclusão em uma obra para participar do fluxo de compras."
      />
    );
  if (filtered)
    return (
      <EmptyState
        title="Nenhum pedido encontrado"
        description="Tente ajustar os filtros para encontrar outros pedidos."
        action={{ label: "Limpar filtros", onClick: onClearFilters }}
      />
    );
  return (
    <EmptyState
      title="Nenhum pedido cadastrado"
      description={
        hasCreationReason
          ? "Confira os pré-requisitos acima ou atualize a lista para consultar novos pedidos."
          : "Use Novo pedido para iniciar uma compra ou atualize a lista para consultar novos pedidos."
      }
    />
  );
}
