import type { ComponentProps } from "react";
import { RefreshButton } from "@/components/RefreshButton";
import { Loading } from "@/components/Loading";
import { errorMessage } from "@/lib/api";
import { plural } from "@/lib/format";
import { approvalLevel, cents } from "@/features/coa/thresholds";
import type { useCoaPreview } from "@/features/purchase-orders/new/useCoaPreview";
import { ApprovalChain } from "../ApprovalChain";

type Steps = ComponentProps<typeof ApprovalChain>["steps"];

/** Who will approve an order of this total, from the project's published alçada. It reuses the
 * order list's chain presentation so the sequence looks the same before and after creation.
 * `review` is the compact form inside the confirmation dialog, which carries its own notes. */
export function ApprovalEstimate({
  projectId,
  total,
  preview,
  variant = "form",
}: {
  projectId: string;
  total: string | null;
  preview: ReturnType<typeof useCoaPreview>;
  variant?: "form" | "review";
}) {
  const amount = total === null ? null : cents(total);
  const configuration = preview.data?.configuration;
  const thresholds =
    configuration?.bands.flatMap((band) => (band.upperLimit === null ? [] : [cents(band.upperLimit)!])) ?? [];
  const level = amount === null ? null : approvalLevel(thresholds, amount);
  const steps: Steps =
    level === null || !configuration
      ? []
      : configuration.bands.slice(0, level + 1).map((band, index) => ({
          stepIndex: index,
          approverId: band.approverId,
          state: "UPCOMING" as const,
          approverName:
            preview.data?.members.find((member) => member.userId === band.approverId)?.displayName ?? band.approverId,
        }));
  const compact = variant === "review";
  return (
    <section
      className={compact ? "min-w-0 space-y-2 text-sm" : "min-w-0 space-y-3 text-sm"}
      aria-label="Prévia da aprovação"
    >
      <h2 className="font-semibold">{compact ? "Aprovação prevista" : "Quem aprova este pedido"}</h2>
      <EstimateBody projectId={projectId} preview={preview} level={level} steps={steps} />
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Prévia da alçada publicada. O servidor confirma o valor, a versão e os aprovadores no envio.
        </p>
      )}
    </section>
  );
}

/** One of: no project yet, the preview could not be read, still loading, no ladder, or the approvers. */
function EstimateBody({
  projectId,
  preview,
  level,
  steps,
}: {
  projectId: string;
  preview: ReturnType<typeof useCoaPreview>;
  /** Index of the last approver the total needs, or null while the total cannot be read. */
  level: number | null;
  steps: Steps;
}) {
  const configuration = preview.data?.configuration;
  if (!projectId) return <p>Selecione uma obra para consultar a alçada publicada.</p>;
  if (preview.error && !configuration)
    return (
      <>
        <p role="alert">Não foi possível consultar a prévia. {errorMessage(preview.error)}</p>
        <RefreshButton size="sm" refreshing={preview.loading} onClick={preview.retry}>
          Atualizar prévia
        </RefreshButton>
      </>
    );
  if (!configuration) return <Loading message="Consultando a alçada da obra…" />;
  if (!configuration.bands.length) return <p>A obra ainda não tem uma alçada publicada.</p>;
  const sequence =
    level === null
      ? "Preencha os valores dos itens."
      : `${level + 1} ${plural(level + 1, "aprovação", "aprovações")}, em sequência.`;
  return (
    <>
      <p className="text-muted-foreground">
        Alçada versão {configuration.coaVersion} · {sequence}
      </p>
      {level !== null && (
        <div aria-live="polite" className="min-w-0">
          <ApprovalChain steps={steps} preview />
        </div>
      )}
    </>
  );
}
