import { useState } from "react";
import { Calculator } from "lucide-react";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Disclosure } from "@/components/ui/Disclosure";
import { approvalLevel, cents } from "../thresholds";

export function CoaSimulator({
  approvers,
  thresholds,
  version,
}: {
  approvers: readonly string[];
  thresholds: readonly bigint[];
  version: number;
}) {
  const [value, setValue] = useState("");
  const total = cents(value),
    level = total === null ? null : approvalLevel(thresholds, total);
  return (
    <Disclosure title="Testar um valor" icon={<Calculator size={18} />}>
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyInput
          label="Valor para simular (R$)"
          format="currency"
          value={value}
          onValueChange={setValue}
          error={value && total === null ? "Informe um valor em reais, com até duas casas decimais." : undefined}
        />
        <div role="status" aria-live="polite" className="min-w-0 text-sm">
          {level === null ? (
            <p>Informe um valor para consultar a sequência de aprovação.</p>
          ) : (
            <>
              <p className="font-semibold">
                {level + 1} {level === 0 ? "aprovação necessária" : "aprovações necessárias"} · Versão {version}
              </p>
              <p className="mt-2 break-words">Sequência: {approvers.slice(0, level + 1).join(" → ")}</p>
            </>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Simulação local. Não altera a alçada nem cria pedidos.</p>
        </div>
      </div>
    </Disclosure>
  );
}
