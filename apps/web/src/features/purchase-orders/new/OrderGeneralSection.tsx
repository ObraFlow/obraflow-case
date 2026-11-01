import { FormSection } from "@/components/ui/FormSection";
import { SingleSelect } from "@/components/ui/Select";
import { DateSelector } from "@/components/ui/date/DateSelector";
import type { OrderFieldErrors } from "./useOrderFieldErrors";
import type { OrderReferences } from "./useOrderReferences";
import styles from "./NewOrderPage.module.css";

export type GeneralField = "projectId" | "supplierId" | "orderDate" | "notes";

/** Project, supplier, date and notes. The form owns the values; every change goes through `onField`. */
export function OrderGeneralSection({
  references,
  values,
  errors,
  onField,
}: {
  /** Null while the projects and suppliers are still being read. */
  references: OrderReferences | null;
  values: Record<GeneralField, string>;
  errors: OrderFieldErrors;
  onField: (field: GeneralField, value: string) => void;
}) {
  const { accessibility, feedback, fieldError } = errors;
  return (
    <FormSection title="Informações gerais">
      <div className={styles.generalFields}>
        <div>
          <label htmlFor="new-project">Obra</label>
          <SingleSelect
            id="new-project"
            value={values.projectId}
            {...accessibility("projectId")}
            onValueChange={(value) => onField("projectId", value)}
            disabled={!references}
            options={[
              { value: "", label: "Selecione uma obra" },
              ...(references?.projects.map((project) => ({
                value: project.id,
                label: project.name + (!project.coaVersion ? " — sem alçada" : ""),
                disabled: !project.coaVersion,
              })) ?? []),
            ]}
          />
          {feedback("projectId")}
        </div>
        <div>
          <label htmlFor="new-supplier">Fornecedor</label>
          <SingleSelect
            id="new-supplier"
            value={values.supplierId}
            {...accessibility("supplierId")}
            onValueChange={(value) => onField("supplierId", value)}
            disabled={!references}
            options={[
              { value: "", label: "Selecione um fornecedor" },
              ...(references?.suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })) ?? []),
            ]}
          />
          {feedback("supplierId")}
        </div>
        <div>
          <label htmlFor="new-date">Data do pedido</label>
          <DateSelector
            id="new-date"
            calendarLabel="Calendário da data do pedido"
            value={values.orderDate}
            {...accessibility("orderDate")}
            aria-describedby={undefined}
            feedbackMessage={fieldError("orderDate")}
            onValueChange={(value) => onField("orderDate", value)}
          />
        </div>
        <div>
          <label htmlFor="new-notes">Observações (opcional)</label>
          <textarea
            id="new-notes"
            rows={2}
            value={values.notes}
            {...accessibility("notes")}
            onChange={(event) => onField("notes", event.target.value)}
          />
          {feedback("notes")}
        </div>
      </div>
    </FormSection>
  );
}
