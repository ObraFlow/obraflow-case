import { AlertCard } from "@/components/ui/AlertCard";
import type { OrderReferences } from "./useOrderReferences";

/** Warnings when the project or supplier needed for an order is missing, or no longer available. */
export function OrderReferenceNotices({
  references,
  projectId,
  supplierId,
}: {
  references: OrderReferences | null;
  projectId: string;
  supplierId: string;
}) {
  if (!references) return null;
  const projectAvailable = references.projects.some((project) => project.id === projectId && project.coaVersion > 0);
  return (
    <>
      {!references.projects.some((project) => project.coaVersion > 0) && (
        <AlertCard variant="warning" role="status">
          Você precisa ser membro de uma obra com alçada configurada. Solicite a configuração ao administrador.
        </AlertCard>
      )}
      {!references.suppliers.length && (
        <AlertCard variant="warning" role="status">
          Não há fornecedores ativos. Solicite um cadastro ao administrador.
        </AlertCard>
      )}
      {projectId && !projectAvailable && (
        <AlertCard variant="warning" role="status">
          A obra selecionada não está disponível para criação. Selecione outra obra com alçada configurada.
        </AlertCard>
      )}
      {supplierId && !references.suppliers.some((supplier) => supplier.id === supplierId) && (
        <AlertCard variant="warning" role="status">
          O fornecedor selecionado não está mais disponível. Selecione outro fornecedor ativo.
        </AlertCard>
      )}
    </>
  );
}
