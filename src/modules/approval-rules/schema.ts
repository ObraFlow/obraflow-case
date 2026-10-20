import { z } from "zod";

function cents(value: string): bigint | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value) || value.length > 12) return null;
  const [integer, fraction = ""] = value.split(".");
  return BigInt(integer) * 100n + BigInt(fraction.padEnd(2, "0"));
}
const money = z.string().max(12).regex(/^\d+(?:\.\d{1,2})?$/).refine((value) => {
  const amount = cents(value);
  return amount !== null && amount <= 10000000000n;
}, "Informe um teto em centavos de zero a R$ 100.000.000,00.");
export const approvalRulesInput = z.strictObject({
  expectedVersion: z.number().int().min(0).max(2147483646),
  bands: z.array(z.strictObject({
    upperLimit: money.nullable(),
    approverIds: z.array(z.uuid().transform((value) => value.toLowerCase())).min(1).max(10),
  })).max(20),
}).superRefine(({ bands }, context) => {
  let previous = -1n;
  bands.forEach((band, index) => {
    if (band.upperLimit === null) {
      if (index !== bands.length - 1) context.addIssue({ code: "custom", path: ["bands", index, "upperLimit"], message: "A faixa sem teto deve ser a última." });
    } else {
      const amount = cents(band.upperLimit);
      if (amount !== null) {
        if (amount <= previous) context.addIssue({ code: "custom", path: ["bands", index, "upperLimit"], message: "Os tetos devem ser únicos e crescentes." });
        previous = amount;
      }
    }
    const seen = new Set<string>();
    band.approverIds.forEach((id, position) => {
      if (seen.has(id)) context.addIssue({ code: "custom", path: ["bands", index, "approverIds", position], message: "Não repita um aprovador na mesma faixa." });
      seen.add(id);
    });
  });
});
export type ApprovalRulesInput = z.output<typeof approvalRulesInput>;
