import type { Ref } from "react";
import { AlertCard } from "@/components/ui/AlertCard";
import { Button } from "@/components/ui/button";

/**
 * What the person sees about the order being sent: a failure, a send in progress, or an unknown outcome.
 * After an unknown outcome nothing is sent again until they have checked the list; that is the page's rule.
 */
export function SubmissionRecovery({
  ref,
  failure,
  pending,
  uncertain,
  projectId,
  checking,
  onCheckOutcome,
}: {
  ref: Ref<HTMLDivElement>;
  failure: string;
  pending: boolean;
  uncertain: boolean;
  /** The project of the unconfirmed submission, to open its order list. */
  projectId?: string;
  checking: boolean;
  onCheckOutcome: () => void;
}) {
  return (
    <div ref={ref} tabIndex={-1} className="space-y-4">
      {failure && (
        <AlertCard variant="error">
          <p>{failure}</p>
          <p className="mt-2">
            Seus dados foram preservados. Revise os campos e a disponibilidade da obra e do fornecedor.
          </p>
        </AlertCard>
      )}
      {pending && (
        <AlertCard variant="info" role="status">
          Envio em andamento. Sair desta página não cancela o pedido. Um novo envio está bloqueado nesta aba.
        </AlertCard>
      )}
      {uncertain && (
        <AlertCard variant="warning" role="alert">
          <p>
            Não foi possível confirmar o resultado. O pedido pode ter sido criado. Confira a lista antes de enviar
            novamente para evitar duplicidade.
          </p>
          <p>
            <a
              className="text-link"
              href={`/purchase-orders?projectId=${encodeURIComponent(projectId ?? "")}`}
              target="_blank"
              // Same-origin app link, so keeping window.opener exposes nothing. Browsers otherwise imply
              // noopener for target="_blank", which also stops tests from tracking the popup.
              rel="opener"
            >
              Consultar pedidos em outra aba
            </a>
          </p>
          <Button type="button" variant="outline" disabled={checking || pending} onClick={onCheckOutcome}>
            {checking ? "Consultando pedidos…" : "Atualizar e liberar novo envio"}
          </Button>
          <p className="text-xs">
            Ao confirmar, uma nova consulta precisa concluir antes de liberar o envio. Nenhum pedido é reenviado
            automaticamente.
          </p>
        </AlertCard>
      )}
    </div>
  );
}
