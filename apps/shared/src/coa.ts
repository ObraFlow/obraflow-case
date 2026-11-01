import { Decimal } from "decimal.js";
import { z } from "zod";
import { amountSchema } from "./money.js";

export const coaBandSchema = z
  .object({
    upperLimit: amountSchema.nullable(),
    approverId: z.uuid("Selecione um aprovador válido.").transform((id) => id.toLowerCase()),
  })
  .strict();

// A CoA is one cumulative ladder: strictly increasing limits, the last band unlimited,
// and each approver at most once.
export const coaBandsSchema = z
  .array(coaBandSchema)
  .min(1, "Inclua ao menos um nível.")
  .superRefine((bands, ctx) => {
    const seen = new Set<string>();
    let previous: Decimal | undefined;
    bands.forEach((band, index) => {
      const issue = (field: string, message: string) =>
        ctx.addIssue({
          code: "custom",
          path: [index, field],
          message,
        });
      if (seen.has(band.approverId)) issue("approverId", "Não repita aprovadores na alçada.");
      seen.add(band.approverId);
      if (index === bands.length - 1 && band.upperLimit !== null) {
        issue("upperLimit", "O último nível deve ser sem limite.");
      }
      if (band.upperLimit === null) {
        if (index !== bands.length - 1) issue("upperLimit", "Somente o último nível pode ser sem limite.");
      } else if (amountSchema.safeParse(band.upperLimit).success) {
        const limit = new Decimal(band.upperLimit);
        if (previous && limit.lte(previous)) issue("upperLimit", "Os limites devem ser estritamente crescentes.");
        previous = limit;
      }
    });
  });

// The whole ladder is replaced in one write, checked against the version the editor loaded.
export const replaceCoaSchema = z
  .object({
    expectedCoaVersion: z.number().int().min(0).max(2147483646),
    bands: coaBandsSchema,
  })
  .strict();

export type CoaBand = z.infer<typeof coaBandSchema>;
export type ReplaceCoa = z.infer<typeof replaceCoaSchema>;

export interface CoaConfiguration {
  projectId: string;
  coaVersion: number;
  bands: CoaBand[];
}
export interface CoaRevision {
  version: number;
  changedById: string;
  changedAt: string;
  bands: CoaBand[];
}
