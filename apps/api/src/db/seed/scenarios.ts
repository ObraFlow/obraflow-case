import { Decimal } from "decimal.js";
import { DEMO_ORDER_NOTES, type PurchaseOrderItemInput } from "@dokimos/shared";

// One demo order per scenario, per project. Quantities, units and totals are chosen to
// exercise the real decimal rules and the cumulative approval ladder: "at-limit" sits
// exactly on the first band's limit, and "fractional" needs per-line rounding.
// The scenarios are written for a standard order of 12500 and scale their quantities (never
// their realistic unit prices) to the project's standard order, so each project's orders reach
// the levels of its own ladder.
export interface DemoScenario {
  key: keyof typeof DEMO_ORDER_NOTES;
  // Index into DEMO_SUPPLIERS.
  supplier: number;
  orderDate: string;
  // How far the chain has progressed, whatever its length: "start" (nobody decided yet),
  // "before-last" (all but the last approver approved), "complete" (all approved) or
  // "rejected-last" (all but the last approved, then the last one rejected).
  progress: "start" | "before-last" | "complete" | "rejected-last";
  items: (quantity: QuantityScale, upperLimit: string) => PurchaseOrderItemInput[];
}

export type QuantityScale = (baseQuantity: string) => string;

export const REJECTION_REASON = "Preço acima do orçamento previsto para esta etapa.";

// quantityScale: scales base quantities, written for a standard order of 12500, to the
// project's standard order. Unit prices stay realistic; bigger works buy bigger quantities.
export function quantityScale(projectOrderPrice: string): QuantityScale {
  const scale = new Decimal(projectOrderPrice).div("12500");
  return (baseQuantity) => new Decimal(baseQuantity).mul(scale).toFixed(3, Decimal.ROUND_HALF_UP);
}

// Creation order matters: it fixes the list order shown in the demo.
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    key: "pending-first",
    supplier: 0,
    orderDate: "2026-10-28",
    progress: "start",
    items: (quantity) => [
      {
        description: "Concreto usinado C30 — fundações",
        quantity: quantity("12.500"),
        unit: "m³",
        unitPrice: "480.00",
      },
      { description: "Bombeamento de concreto", quantity: quantity("2.000"), unit: "h", unitPrice: "650.00" },
    ],
  },

  {
    key: "pending-next",
    supplier: 1,
    orderDate: "2026-10-27",
    progress: "before-last",
    items: (quantity) => [
      { description: "Vergalhão CA-50 Ø 10 mm", quantity: quantity("1800.000"), unit: "kg", unitPrice: "6.25" },
      { description: "Frete e descarga do aço", quantity: quantity("1.000"), unit: "un", unitPrice: "1250.00" },
    ],
  },

  {
    key: "approved",
    supplier: 2,
    orderDate: "2026-10-23",
    progress: "complete",
    items: (quantity) => [
      { description: "Cabo de cobre flexível 6 mm²", quantity: quantity("1000.000"), unit: "m", unitPrice: "9.75" },
      { description: "Disjuntor tripolar 63 A", quantity: quantity("10.000"), unit: "un", unitPrice: "275.00" },
    ],
  },

  {
    key: "rejected",
    supplier: 0,
    orderDate: "2026-10-24",
    progress: "rejected-last",
    items: (quantity) => [
      { description: "Concreto usinado C30 — lajes", quantity: quantity("22.500"), unit: "m³", unitPrice: "520.00" },
      { description: "Bomba lança para concretagem", quantity: quantity("2.000"), unit: "h", unitPrice: "900.00" },
    ],
  },

  {
    key: "at-limit",
    supplier: 0,
    orderDate: "2026-10-26",
    progress: "start",
    items: (_quantity, upperLimit) => [
      { description: "Medição de regularização do contrapiso", quantity: "1.000", unit: "lote", unitPrice: upperLimit },
    ],
  },

  {
    key: "fractional",
    supplier: 1,
    orderDate: "2026-10-25",
    progress: "start",
    items: () => [
      { description: "Arruela galvanizada — reposição", quantity: "0.125", unit: "kg", unitPrice: "12.44" },
      { description: "Porca sextavada — reposição", quantity: "0.125", unit: "kg", unitPrice: "12.44" },
      { description: "Parafuso sextavado M10", quantity: "12.000", unit: "un", unitPrice: "1.75" },
    ],
  },
];
