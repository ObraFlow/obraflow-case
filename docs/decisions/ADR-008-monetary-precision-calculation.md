# ADR-008 — Decimal Money, Line-Item Rounding, and Approval Thresholds

**Status:** Accepted — financial calculation and threshold decision (2026-10-20)  
**Project:** ObraFlow challenge  
**Related:** [ADR-001](ADR-001-postgresql-typeorm.md), [ADR-006](ADR-006-cumulative-approval-escalation.md), [ADR-007](ADR-007-purchase-order-approval-lifecycle.md)

## Context and rationale

ObraFlow calculates purchase-order totals from quantities and unit prices, persists financial amounts, and selects approvers according to monetary thresholds.

**Financial persistence and binary floating-point arithmetic are a well-known source of subtle precision errors when mixed carelessly.** Many decimal fractions (for example, `0.1`) cannot be represented exactly in JavaScript's binary `number` type. Persisting rounded, binary-calculated values inconsistently, or allowing the database to silently round values to its column scale, can make financial records disagree with displayed amounts.

Here that difference matters beyond presentation: **the persisted PO total also selects its Chain of Approval (CoA)**. A difference of one cent precisely at a configured upper threshold may select a different approval chain. For most purchases, a fractional-cent or one-cent discrepancy would probably not materially affect the intended approval outcome; this challenge does not specify a regulatory regime. But if financial authority limits are policy- or regulation-enforced, even a small boundary discrepancy can make an approval inconsistent with the recorded rule. Auditability requires being able to reproduce why the system selected a given approval sequence.

We therefore choose exact decimal input, arithmetic, persistence, and comparisons, with one explicitly documented rounding point. **This is proportionate protection of a business invariant, not an attempt to build a general accounting system.**

## Decision

1. **Currency:** BRL only for this challenge; no conversion, currency configuration, or general-purpose money framework.
2. **Supported precision and database types:**

   | Field | PostgreSQL type | Domain rule |
   | --- | --- | --- |
   | Quantity | `NUMERIC(12,3)` | Strictly positive; at most 3 fractional digits |
   | Unit price | `NUMERIC(14,2)` | Nonnegative; at most 2 fractional digits |
   | Persisted line total | `NUMERIC(18,2)` | Backend-calculated; exactly 2 fractional digits |
   | Persisted PO total | `NUMERIC(18,2)` | Sum of rounded line totals; exactly 2 fractional digits |
   | CoA finite upper limit | `NUMERIC(18,2)` | Nonnegative, inclusive upper bound; `NULL` means unlimited |

3. **Exact arithmetic:** Use an established decimal arithmetic library (initial choice: `decimal.js`) for all authoritative quantity × price, line rounding, accumulation, and CoA comparisons. Do not use JavaScript binary `number` as the authoritative money representation.
4. **Line-by-line rounding:** Calculate each item exactly as `quantity × unitPrice`, then round **that item's total** to two decimal places using `ROUND_HALF_UP`. Persist the rounded line total. The PO total is the exact decimal sum of those **rounded** line totals, without an additional loss of precision.
5. **Consistent approval basis:** Determine the effective CoA from the **same final backend-calculated PO total that is persisted** in the transaction. Boundaries are inclusive: at exactly the finite upper limit the lower escalation step applies, and at one cent above it the next step applies.
6. **Validation rather than implicit coercion:** Reject negative/non-numeric inputs, zero or negative quantities, excess fractional digits, and numeric overflow before persistence. Do not silently rely on PostgreSQL `NUMERIC(p,s)` coercion to round client-submitted quantities or prices. Line and PO totals are server-owned; the client cannot submit authoritative totals.
7. **API representation:** Exchange quantities and monetary values as decimal **strings** with a period as decimal separator, e.g. `"0.125"` and `"10.10"`. Backend validation establishes their allowable precision and range. Serialize calculated totals as fixed-scale decimal strings, e.g. `"1.26"`. No locale-formatted BRL strings or binary floats are trusted as transport values. The UI may display localized BRL amounts and previews, but the persisted backend result wins.
8. **Zero-value orders:** Allow a PO total of `0.00` when items have positive quantities and zero unit prices. The order still requires its valid cumulative approval chain; no automatic approval or special zero-value band.

## Deterministic calculation

For each item `i`:

```text
roundedLineTotal[i] = ROUND_HALF_UP(quantity[i] * unitPrice[i], 2)
poTotal = SUM(roundedLineTotal[i])
approvers = resolveCoA(projectActiveBands, poTotal)
```

For example, two items each with quantity `0.5` and unit price `0.01` have an exact unrounded product of `0.005` each:

- Round **per line**: `0.01 + 0.01 = 0.02` (our decision).
- Round only **the exact aggregate**: `ROUND_HALF_UP(0.005 + 0.005, 2) = 0.01` (not chosen).

Per-line rounding ensures the sum of displayed/persisted line totals always matches the persisted PO total. We acknowledge that this can differ by a few cents from rounding the full unrounded aggregate only once. It is a deliberate business convention, not a universally mandated accounting rule.

An illustrative backend implementation:

```ts
const lineTotal = new Decimal(quantity)
  .mul(new Decimal(unitPrice))
  .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

const poTotal = lineTotals.reduce(
  (sum, item) => sum.plus(item),
  new Decimal("0")
);
```

Do not convert Decimal results to JavaScript `number` before persisting or comparing them; enforce bounds before and after multiplication/summation.

## Approval boundary illustration

Given an inclusive band upper limit of `10000.00`:

| Persisted PO total | Required cumulative chain |
| --- | --- |
| `9999.99` | João |
| `10000.00` | João |
| `10000.01` | João → Amanda |

The CoA decision uses the exact persisted decimal total, never a separately recomputed floating-point preview.

## Consequences and trade-offs

- **Benefits:** Reproducible line totals and PO totals; reconciliation between displayed line values and stored PO total; predictable CoA threshold selection; credible financial audit explanations.
- **Costs:** A decimal library, explicit input validation, string-valued API amounts, and clearly specified rounding/scale limits.
- **Limitations:** This is a deliberately small BRL purchase-order calculation policy. It does not claim legal/regulatory compliance, tax accounting, or universal applicability. Three decimal places for quantities and two for unit prices are constraints of this simplified domain; changing them later requires a deliberate migration and calculation-policy review.

## Verification expectations

- Exact arithmetic on familiar binary-float pitfalls such as `0.1` and `0.2`, without using JS `number` for authoritative calculations.
- Line item with quantity `0.5`, unit price `0.01`: item total `0.01`; two such lines produce PO total `0.02`.
- Threshold tests for `9999.99`, `10000.00`, and `10000.01`, including classification using persisted totals.
- Reject quantity `0`, negative values, excessive decimal precision, nonnumeric strings, numeric overflow, and submitted authoritative totals.
- Allow valid zero-priced items and total-zero orders, which still require approval.
- Stored line totals sum exactly to the stored PO total; backend result matches API response and audit trail.
- Ensure DB `NUMERIC` values remain decimal strings when read through the ORM; never leak through implicit JS `number` conversions.

## Delivery documentation

The final root README's technical decisions section should briefly explain **why we use exact decimal arithmetic instead of JavaScript floating-point calculations**: financial reproducibility, sum-of-lines reconciliation, and the possibility that a one-cent discrepancy at a CoA boundary changes the required approvers. Present regulatory enforcement as a *possible higher-stakes context*, not a requirement asserted by the challenge.
