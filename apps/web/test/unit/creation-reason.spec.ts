import { test, expect } from "@playwright/test";
import type { ProjectListItem } from "@dokimos/shared";
import { creationReason } from "../../src/features/purchase-orders/list/creationReason";

const project = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Obra",
  coaVersion: 1,
  isActive: true,
  createdAt: "2026-10-01T00:00:00.000Z",
  membership: { count: 1, activeCount: 1, isMember: true },
} satisfies ProjectListItem;
const ready = {
  projectError: null,
  creatable: [project],
  hasPublishedCoa: true,
  supplierError: null,
  hasSupplier: true,
};

test("an order can be started when every prerequisite is met", () => {
  expect(creationReason(ready)).toBeUndefined();
});

test("the first missing prerequisite is the one reported, in the order the API checks them", () => {
  expect(creationReason({ ...ready, projectError: new Error("x"), creatable: null })).toBe(
    "Não foi possível consultar as obras.",
  );
  expect(creationReason({ ...ready, creatable: null })).toBe("Consultando participação nas obras…");
  expect(creationReason({ ...ready, creatable: [] })).toBe("Você precisa ser membro de uma obra para criar pedidos.");
  expect(creationReason({ ...ready, hasPublishedCoa: false, supplierError: new Error("x") })).toBe(
    "Suas obras ainda não têm uma alçada publicada.",
  );
  expect(creationReason({ ...ready, supplierError: new Error("x"), hasSupplier: null })).toBe(
    "Não foi possível verificar os fornecedores.",
  );
  expect(creationReason({ ...ready, hasSupplier: null })).toBe("Consultando fornecedores…");
  expect(creationReason({ ...ready, hasSupplier: false })).toBe("Não há fornecedores ativos para novos pedidos.");
});
